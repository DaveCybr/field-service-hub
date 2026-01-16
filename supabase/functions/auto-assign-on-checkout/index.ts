import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TechnicianWithSkills {
  id: string;
  name: string;
  status: string;
  skills: string[];
}

interface PendingService {
  id: string;
  invoice_id: string;
  title: string;
  required_skills: string[];
  invoice_number?: string;
}

interface NotificationPayload {
  type: "service_assigned" | "service_requires_approval";
  serviceId: string;
  invoiceNumber: string;
  serviceTitle: string;
  technicianId?: string;
  technicianName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { completedServiceId, technicianId } = await req.json();

    console.log(
      `Auto-assign triggered for technician: ${technicianId}, completed service: ${completedServiceId}`
    );

    // 1. Fetch all pending services (not assigned to anyone)
    const { data: pendingServices, error: pendingServicesError } = await supabase
      .from("invoice_services")
      .select(`
        id, 
        invoice_id, 
        title, 
        required_skills,
        invoices!inner (invoice_number)
      `)
      .eq("status", "pending")
      .is("assigned_technician_id", null)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });

    if (pendingServicesError) {
      throw new Error(
        `Failed to fetch pending services: ${pendingServicesError.message}`
      );
    }

    if (!pendingServices || pendingServices.length === 0) {
      console.log("No pending services found");
      return new Response(
        JSON.stringify({ success: true, message: "No pending services to assign" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch all available technicians with their skills
    const { data: technicians, error: techniciansError } = await supabase
      .from("employees")
      .select("id, name, status")
      .eq("role", "technician")
      .in("status", ["available", "on_job"]);

    if (techniciansError) {
      throw new Error(
        `Failed to fetch technicians: ${techniciansError.message}`
      );
    }

    // 3. Fetch technician skills
    const technicianIds = technicians?.map((t) => t.id) || [];
    const { data: allSkills, error: skillsError } = await supabase
      .from("technician_skills")
      .select("technician_id, skill_name")
      .in("technician_id", technicianIds);

    if (skillsError) {
      console.error("Warning: Failed to fetch skills:", skillsError);
    }

    // 4. Build skills map
    const skillsMap: Record<string, string[]> = {};
    allSkills?.forEach((skill) => {
      if (!skillsMap[skill.technician_id]) {
        skillsMap[skill.technician_id] = [];
      }
      skillsMap[skill.technician_id].push(skill.skill_name.toLowerCase());
    });

    // 5. Enrich technicians with skills
    const techniciansWithSkills: TechnicianWithSkills[] =
      technicians?.map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status,
        skills: skillsMap[t.id] || [],
      })) || [];

    console.log("Available technicians:", techniciansWithSkills);

    // 6. Track assigned services for this round
    const assignedServices: Array<{
      serviceId: string;
      invoiceNumber: string;
      technicianId: string;
      technicianName: string;
    }> = [];
    const notifications: NotificationPayload[] = [];

    // 7. Loop through pending services and assign to matching technicians
    for (const service of pendingServices) {
      const requiredSkills: string[] = service.required_skills || [];
      const normalizedRequired: string[] = requiredSkills.map((s: string) => s.toLowerCase());
      const invoiceData = service.invoices as unknown as { invoice_number: string } | { invoice_number: string }[] | null;
      const invoiceNumber = Array.isArray(invoiceData) ? invoiceData[0]?.invoice_number || "" : invoiceData?.invoice_number || "";

      // Find technicians with matching skills
      const matchingTechs = techniciansWithSkills.filter((tech) => {
        if (normalizedRequired.length === 0) {
          return true;
        }

        return normalizedRequired.some((reqSkill: string) =>
          tech.skills.some(
            (techSkill) =>
              techSkill.includes(reqSkill) || reqSkill.includes(techSkill)
          )
        );
      });

      console.log(
        `Service ${service.id}: Found ${matchingTechs.length} matching technicians`
      );

      if (matchingTechs.length === 0) {
        console.log(`No matching technician for service ${service.id}`);
        continue;
      }

      // Random pick from matching technicians
      const selectedTech =
        matchingTechs[Math.floor(Math.random() * matchingTechs.length)];

      console.log(
        `Assigning service ${service.id} to technician ${selectedTech.name}`
      );

      // Assign service to technician
      const { error: updateError } = await supabase
        .from("invoice_services")
        .update({
          assigned_technician_id: selectedTech.id,
          status: "assigned",
        })
        .eq("id", service.id);

      if (updateError) {
        console.error(`Failed to assign service ${service.id}:`, updateError);
        continue;
      }

      assignedServices.push({
        serviceId: service.id,
        invoiceNumber,
        technicianId: selectedTech.id,
        technicianName: selectedTech.name,
      });

      // Add notifications
      notifications.push({
        type: "service_assigned",
        serviceId: service.id,
        invoiceNumber,
        serviceTitle: service.title,
        technicianId: selectedTech.id,
        technicianName: selectedTech.name,
      });
    }

    // 8. Log notifications (notifications table may not exist)
    if (notifications.length > 0) {
      console.log("Notifications to send:", notifications);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-assigned ${assignedServices.length} service(s)`,
        assignedServices,
        notifications,
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
