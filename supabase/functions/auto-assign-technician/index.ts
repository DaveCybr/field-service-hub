import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TechnicianScore {
  id: string;
  name: string;
  status: string;
  score: number;
  skillsMatch: number;
  availabilityScore: number;
  workloadScore: number;
  skills: string[];
}

interface AssignmentRequest {
  jobId?: string;
  requiredSkills?: string[];
  priority?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { jobId, requiredSkills = [], priority = 'normal' }: AssignmentRequest = await req.json();
    
    console.log('Auto-assign request:', { jobId, requiredSkills, priority });

    // Fetch all technicians
    const { data: technicians, error: techError } = await supabase
      .from('employees')
      .select('id, name, status, rating, total_jobs_completed')
      .eq('role', 'technician');

    if (techError) {
      console.error('Error fetching technicians:', techError);
      throw new Error('Failed to fetch technicians');
    }

    if (!technicians || technicians.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No technicians found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch all technician skills
    const technicianIds = technicians.map(t => t.id);
    const { data: allSkills, error: skillsError } = await supabase
      .from('technician_skills')
      .select('technician_id, skill_name, proficiency_level')
      .in('technician_id', technicianIds);

    if (skillsError) {
      console.error('Error fetching skills:', skillsError);
    }

    // Build skills map
    const skillsMap: Record<string, { skills: string[]; proficiencies: Record<string, string> }> = {};
    allSkills?.forEach(skill => {
      if (!skillsMap[skill.technician_id]) {
        skillsMap[skill.technician_id] = { skills: [], proficiencies: {} };
      }
      skillsMap[skill.technician_id].skills.push(skill.skill_name.toLowerCase());
      skillsMap[skill.technician_id].proficiencies[skill.skill_name.toLowerCase()] = skill.proficiency_level || 'basic';
    });

    // Fetch current job counts (in_progress jobs per technician)
    const { data: jobCounts, error: jobError } = await supabase
      .from('service_jobs')
      .select('assigned_technician_id')
      .in('status', ['approved', 'in_progress'])
      .in('assigned_technician_id', technicianIds);

    if (jobError) {
      console.error('Error fetching job counts:', jobError);
    }

    // Count active jobs per technician
    const activeJobsCount: Record<string, number> = {};
    jobCounts?.forEach(job => {
      if (job.assigned_technician_id) {
        activeJobsCount[job.assigned_technician_id] = (activeJobsCount[job.assigned_technician_id] || 0) + 1;
      }
    });

    // Calculate scores for each technician
    const scoredTechnicians: TechnicianScore[] = technicians.map(tech => {
      const techSkillData = skillsMap[tech.id] || { skills: [], proficiencies: {} };
      const techSkills = techSkillData.skills;
      const proficiencies = techSkillData.proficiencies;
      
      // 1. Skills Match Score (0-40 points)
      let skillsMatchScore = 0;
      const normalizedRequiredSkills = requiredSkills.map(s => s.toLowerCase());
      
      if (normalizedRequiredSkills.length > 0) {
        const matchedSkills = normalizedRequiredSkills.filter(reqSkill => 
          techSkills.some(techSkill => techSkill.includes(reqSkill) || reqSkill.includes(techSkill))
        );
        const matchPercentage = matchedSkills.length / normalizedRequiredSkills.length;
        skillsMatchScore = matchPercentage * 30;
        
        // Bonus for proficiency levels
        matchedSkills.forEach(skill => {
          const proficiency = proficiencies[skill];
          if (proficiency === 'expert') skillsMatchScore += 5;
          else if (proficiency === 'advanced') skillsMatchScore += 3;
          else if (proficiency === 'intermediate') skillsMatchScore += 1;
        });
        
        skillsMatchScore = Math.min(40, skillsMatchScore);
      } else {
        // If no required skills, give base score
        skillsMatchScore = 20;
      }

      // 2. Availability Score (0-35 points)
      let availabilityScore = 0;
      switch (tech.status) {
        case 'available':
          availabilityScore = 35;
          break;
        case 'on_job':
          availabilityScore = 15; // Can be assigned but currently busy
          break;
        case 'off_duty':
          availabilityScore = 5;
          break;
        case 'locked':
          availabilityScore = 0;
          break;
        default:
          availabilityScore = 10;
      }

      // 3. Workload Score (0-25 points) - fewer active jobs = higher score
      const activeJobs = activeJobsCount[tech.id] || 0;
      let workloadScore = Math.max(0, 25 - (activeJobs * 5));

      // Priority boost for urgent jobs - prioritize available technicians more
      if (priority === 'urgent' && tech.status === 'available') {
        availabilityScore += 10;
      } else if (priority === 'high' && tech.status === 'available') {
        availabilityScore += 5;
      }

      // Rating bonus (up to 5 extra points)
      const ratingBonus = (tech.rating || 0) * 1;

      const totalScore = skillsMatchScore + availabilityScore + workloadScore + ratingBonus;

      return {
        id: tech.id,
        name: tech.name,
        status: tech.status,
        score: Math.round(totalScore * 100) / 100,
        skillsMatch: Math.round(skillsMatchScore * 100) / 100,
        availabilityScore: Math.round(availabilityScore * 100) / 100,
        workloadScore: Math.round(workloadScore * 100) / 100,
        skills: techSkills,
      };
    });

    // Sort by score (highest first)
    scoredTechnicians.sort((a, b) => b.score - a.score);

    // Filter out locked technicians for the recommendation
    const eligibleTechnicians = scoredTechnicians.filter(t => t.status !== 'locked');

    console.log('Scored technicians:', scoredTechnicians);

    // If jobId provided, auto-assign the top technician
    let assigned = false;
    let assignedTechnician = null;

    if (jobId && eligibleTechnicians.length > 0) {
      const bestMatch = eligibleTechnicians[0];
      
      const { error: updateError } = await supabase
        .from('service_jobs')
        .update({ 
          assigned_technician_id: bestMatch.id,
          status: 'pending_approval'
        })
        .eq('id', jobId);

      if (updateError) {
        console.error('Error assigning technician:', updateError);
        throw new Error('Failed to assign technician');
      }

      assigned = true;
      assignedTechnician = bestMatch;
      console.log('Auto-assigned technician:', bestMatch.name, 'to job:', jobId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        assigned,
        assignedTechnician,
        recommendations: eligibleTechnicians.slice(0, 5),
        allScores: scoredTechnicians,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-assign error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
