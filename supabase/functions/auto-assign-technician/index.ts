// supabase/functions/auto-assign-technician/index.ts
// UPDATED: Sequential assignment - teknisi harus selesai invoice sebelumnya

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TechnicianScore {
  id: string;
  name: string;
  status: string;
  score: number;
  skillsMatch: number;
  availabilityScore: number;
  workloadScore: number;
  skills: string[];
  hasPendingInvoice: boolean; // NEW
}

interface AssignmentRequest {
  serviceId?: string;
  invoiceId?: string; // NEW - for checking sequential assignment
  requiredSkills?: string[];
  priority?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      serviceId,
      invoiceId,
      requiredSkills = [],
      priority = "normal",
    }: AssignmentRequest = await req.json();

    console.log("Auto-assign request:", {
      serviceId,
      invoiceId,
      requiredSkills,
      priority,
    });

    // Fetch all technicians
    const { data: technicians, error: techError } = await supabase
      .from("employees")
      .select("id, name, status, rating, total_jobs_completed")
      .eq("role", "technician");

    if (techError) {
      console.error("Error fetching technicians:", techError);
      throw new Error("Failed to fetch technicians");
    }

    if (!technicians || technicians.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No technicians found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // Fetch all technician skills
    const technicianIds = technicians.map((t) => t.id);
    const { data: allSkills, error: skillsError } = await supabase
      .from("technician_skills")
      .select("technician_id, skill_name, proficiency_level")
      .in("technician_id", technicianIds);

    if (skillsError) {
      console.error("Error fetching skills:", skillsError);
    }

    // Build skills map
    const skillsMap: Record<
      string,
      { skills: string[]; proficiencies: Record<string, string> }
    > = {};
    allSkills?.forEach((skill) => {
      if (!skillsMap[skill.technician_id]) {
        skillsMap[skill.technician_id] = { skills: [], proficiencies: {} };
      }
      skillsMap[skill.technician_id].skills.push(
        skill.skill_name.toLowerCase()
      );
      skillsMap[skill.technician_id].proficiencies[
        skill.skill_name.toLowerCase()
      ] = skill.proficiency_level || "basic";
    });

    // NEW: Check pending invoices per technician
    const { data: pendingServices, error: pendingError } = await supabase
      .from("invoice_services")
      .select(
        `
        assigned_technician_id,
        invoice_id,
        invoices!inner(id, status)
      `
      )
      .in("assigned_technician_id", technicianIds)
      .in("status", ["assigned", "in_progress"]);

    if (pendingError) {
      console.error("Error fetching pending services:", pendingError);
    }

    // Build pending invoices map
    const pendingInvoicesMap = new Map<string, boolean>();
    pendingServices?.forEach((service) => {
      if (service.assigned_technician_id) {
        // Exclude current invoice from check
        if (invoiceId && service.invoice_id === invoiceId) {
          return;
        }
        const invoiceStatus = (service.invoices as any)?.status;
        if (
          invoiceStatus &&
          ["pending", "in_progress"].includes(invoiceStatus)
        ) {
          pendingInvoicesMap.set(service.assigned_technician_id, true);
        }
      }
    });

    // Fetch current service counts (active services per technician)
    const { data: serviceCounts, error: serviceError } = await supabase
      .from("invoice_services")
      .select("assigned_technician_id")
      .in("status", ["assigned", "in_progress"])
      .in("assigned_technician_id", technicianIds);

    if (serviceError) {
      console.error("Error fetching service counts:", serviceError);
    }

    // Count active services per technician
    const activeServicesCount: Record<string, number> = {};
    serviceCounts?.forEach((service) => {
      if (service.assigned_technician_id) {
        activeServicesCount[service.assigned_technician_id] =
          (activeServicesCount[service.assigned_technician_id] || 0) + 1;
      }
    });

    // Calculate scores for each technician
    const scoredTechnicians: TechnicianScore[] = technicians.map((tech) => {
      const techSkillData = skillsMap[tech.id] || {
        skills: [],
        proficiencies: {},
      };
      const techSkills = techSkillData.skills;
      const proficiencies = techSkillData.proficiencies;
      const hasPendingInvoice = pendingInvoicesMap.get(tech.id) || false;

      // 1. Skills Match Score (0-40 points)
      let skillsMatchScore = 0;
      const normalizedRequiredSkills = requiredSkills.map((s) =>
        s.toLowerCase()
      );

      if (normalizedRequiredSkills.length > 0) {
        const matchedSkills = normalizedRequiredSkills.filter((reqSkill) =>
          techSkills.some(
            (techSkill) =>
              techSkill.includes(reqSkill) || reqSkill.includes(techSkill)
          )
        );
        const matchPercentage =
          matchedSkills.length / normalizedRequiredSkills.length;
        skillsMatchScore = matchPercentage * 30;

        // Bonus for proficiency levels
        matchedSkills.forEach((skill) => {
          const proficiency = proficiencies[skill];
          if (proficiency === "expert") skillsMatchScore += 5;
          else if (proficiency === "advanced") skillsMatchScore += 3;
          else if (proficiency === "intermediate") skillsMatchScore += 1;
        });

        skillsMatchScore = Math.min(40, skillsMatchScore);
      } else {
        skillsMatchScore = 20;
      }

      // 2. Availability Score (0-35 points)
      // NEW: Heavy penalty if has pending invoice
      let availabilityScore = 0;
      if (hasPendingInvoice) {
        availabilityScore = -50; // Strong penalty - make them unavailable
      } else {
        switch (tech.status) {
          case "available":
            availabilityScore = 35;
            break;
          case "on_job":
            availabilityScore = 15;
            break;
          case "off_duty":
            availabilityScore = 5;
            break;
          case "locked":
            availabilityScore = 0;
            break;
          default:
            availabilityScore = 10;
        }
      }

      // 3. Workload Score (0-25 points) - fewer active services = higher score
      const activeServices = activeServicesCount[tech.id] || 0;
      const workloadScore = Math.max(0, 25 - activeServices * 5);

      // Priority boost for urgent services
      if (
        priority === "urgent" &&
        tech.status === "available" &&
        !hasPendingInvoice
      ) {
        availabilityScore += 10;
      } else if (
        priority === "high" &&
        tech.status === "available" &&
        !hasPendingInvoice
      ) {
        availabilityScore += 5;
      }

      // Rating bonus (up to 5 extra points)
      const ratingBonus = (tech.rating || 0) * 1;

      const totalScore =
        skillsMatchScore + availabilityScore + workloadScore + ratingBonus;

      return {
        id: tech.id,
        name: tech.name,
        status: tech.status,
        score: Math.round(totalScore * 100) / 100,
        skillsMatch: Math.round(skillsMatchScore * 100) / 100,
        availabilityScore: Math.round(availabilityScore * 100) / 100,
        workloadScore: Math.round(workloadScore * 100) / 100,
        skills: techSkills,
        hasPendingInvoice,
      };
    });

    // Sort by score (highest first)
    scoredTechnicians.sort((a, b) => b.score - a.score);

    // Filter out locked technicians and those with pending invoices
    const eligibleTechnicians = scoredTechnicians.filter(
      (t) => t.status !== "locked" && !t.hasPendingInvoice
    );

    console.log("Scored technicians:", scoredTechnicians);
    console.log(
      "Eligible technicians (no pending invoices):",
      eligibleTechnicians
    );

    // If serviceId provided, auto-assign the top eligible technician
    let assigned = false;
    let assignedTechnician = null;

    if (serviceId && eligibleTechnicians.length > 0) {
      const bestMatch = eligibleTechnicians[0];

      const { error: updateError } = await supabase
        .from("invoice_services")
        .update({
          assigned_technician_id: bestMatch.id,
          status: "assigned",
        })
        .eq("id", serviceId);

      if (updateError) {
        console.error("Error assigning technician:", updateError);
        throw new Error("Failed to assign technician");
      }

      assigned = true;
      assignedTechnician = bestMatch;
      console.log(
        "Auto-assigned technician:",
        bestMatch.name,
        "to service:",
        serviceId
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        assigned,
        assignedTechnician,
        recommendations: eligibleTechnicians.slice(0, 5),
        allScores: scoredTechnicians,
        message:
          eligibleTechnicians.length === 0
            ? "No eligible technicians (all have pending invoices or are unavailable)"
            : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Auto-assign error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
