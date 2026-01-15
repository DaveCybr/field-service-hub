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

interface PendingJob {
  id: string;
  job_number: string;
  title: string;
  required_skills: string[];
}

interface NotificationPayload {
  type: "job_assigned" | "job_requires_approval";
  jobId: string;
  jobNumber: string;
  jobTitle: string;
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

    const { completedJobId, technicianId } = await req.json();

    console.log(
      `Auto-assign triggered for technician: ${technicianId}, completed job: ${completedJobId}`
    );

    // 1. Fetch all pending jobs (not assigned to anyone)
    const { data: pendingJobs, error: pendingJobsError } = await supabase
      .from("service_jobs")
      .select("id, job_number, title, required_skills")
      .eq("status", "pending_assignment")
      .is("assigned_technician_id", null)
      .order("priority", { ascending: false }) // Prioritas urgent duluan
      .order("created_at", { ascending: true }); // Kemudian urut by created time

    if (pendingJobsError) {
      throw new Error(
        `Failed to fetch pending jobs: ${pendingJobsError.message}`
      );
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      console.log("No pending jobs found");
      return new Response(
        JSON.stringify({ success: true, message: "No pending jobs to assign" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch all available technicians with their skills
    const { data: technicians, error: techniciansError } = await supabase
      .from("employees")
      .select("id, name, status")
      .eq("role", "technician")
      .in("status", ["available", "on_job"]); // Bisa assign ke yang on_job (akan jadi queue)

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

    // 6. Track assigned jobs for this round
    const assignedJobs: Array<{
      jobId: string;
      jobNumber: string;
      technicianId: string;
      technicianName: string;
    }> = [];
    const notifications: NotificationPayload[] = [];

    // 7. Loop through pending jobs and assign to matching technicians
    for (const job of pendingJobs) {
      const requiredSkills = job.required_skills || [];
      const normalizedRequired = requiredSkills.map((s) => s.toLowerCase());

      // Find technicians with matching skills
      const matchingTechs = techniciansWithSkills.filter((tech) => {
        // Jika job tidak butuh skill tertentu, semua teknisi cocok
        if (normalizedRequired.length === 0) {
          return true;
        }

        // Cek apakah teknisi punya minimal 1 skill yang dibutuhkan
        return normalizedRequired.some((reqSkill) =>
          tech.skills.some(
            (techSkill) =>
              techSkill.includes(reqSkill) || reqSkill.includes(techSkill)
          )
        );
      });

      console.log(
        `Job ${job.job_number}: Found ${matchingTechs.length} matching technicians`
      );

      if (matchingTechs.length === 0) {
        console.log(`No matching technician for job ${job.job_number}`);
        continue;
      }

      // Random pick dari matching technicians
      const selectedTech =
        matchingTechs[Math.floor(Math.random() * matchingTechs.length)];

      console.log(
        `Assigning job ${job.job_number} to technician ${selectedTech.name}`
      );

      // Assign job to technician
      const { error: updateError } = await supabase
        .from("service_jobs")
        .update({
          assigned_technician_id: selectedTech.id,
          status: "pending_approval",
        })
        .eq("id", job.id);

      if (updateError) {
        console.error(`Failed to assign job ${job.job_number}:`, updateError);
        continue;
      }

      assignedJobs.push({
        jobId: job.id,
        jobNumber: job.job_number,
        technicianId: selectedTech.id,
        technicianName: selectedTech.name,
      });

      // Add notifications
      notifications.push({
        type: "job_assigned",
        jobId: job.id,
        jobNumber: job.job_number,
        jobTitle: job.title,
        technicianId: selectedTech.id,
        technicianName: selectedTech.name,
      });
    }

    // 8. Send notifications if any jobs were assigned
    if (notifications.length > 0) {
      // TODO: Send push notifications to admin & technicians
      // This can be done via:
      // - Real-time subscription
      // - Email notification
      // - Push notification service
      console.log("Notifications to send:", notifications);

      // Broadcast via Realtime (clients listening will get update)
      for (const notif of notifications) {
        await supabase
          .from("notifications") // Jika punya notifications table
          .insert({
            type: "job_assigned",
            user_id: notif.technicianId,
            title: `Pekerjaan Baru: ${notif.jobNumber}`,
            message: `Job "${notif.jobTitle}" sudah di-assign ke Anda, tunggu approval admin`,
            data: { jobId: notif.jobId },
            read: false,
          })
          .catch((err) => console.error("Failed to insert notification:", err));
      }

      // Also notify admin
      const { data: admins } = await supabase
        .from("employees")
        .select("id")
        .in("role", ["admin", "manager", "superadmin"]);

      if (admins && admins.length > 0) {
        for (const admin of admins) {
          await supabase
            .from("notifications")
            .insert({
              type: "job_requires_approval",
              user_id: admin.id,
              title: `${assignedJobs.length} Job(s) Perlu Approval`,
              message: `${assignedJobs.length} job baru sudah di-assign ke teknisi, silakan review & approve`,
              data: { jobCount: assignedJobs.length, jobs: assignedJobs },
              read: false,
            })
            .catch((err) =>
              console.error("Failed to insert admin notification:", err)
            );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-assigned ${assignedJobs.length} job(s)`,
        assignedJobs,
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
