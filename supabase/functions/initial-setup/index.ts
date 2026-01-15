import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Parse body
    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    // Handle check action or GET request - check if setup is needed
    if (req.method === "GET" || body.action === "check") {
      console.log("Checking if setup is needed...");

      try {
        // Check if ada users di auth.users
        const { data: users, error: usersError } =
          await adminClient.auth.admin.listUsers();

        console.log("Auth users count:", users?.users?.length || 0);

        if (usersError) {
          console.error("Error checking users:", usersError);
          // Jika error, assume needs setup
          return new Response(JSON.stringify({ needsSetup: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Jika ada users, tidak perlu setup
        const hasUsers = (users?.users?.length || 0) > 0;
        const needsSetup = !hasUsers;

        console.log("needsSetup:", needsSetup);

        return new Response(JSON.stringify({ needsSetup }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (checkError) {
        console.error("Error during setup check:", checkError);
        // Default to true (needs setup) jika ada error
        return new Response(JSON.stringify({ needsSetup: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Handle POST request - create first superadmin
    if (req.method === "POST" && body.email) {
      console.log("Creating superadmin user...");

      // First, verify that no users exist
      const { data: users, error: checkError } =
        await adminClient.auth.admin.listUsers();

      if (checkError) {
        throw new Error("Failed to check existing users");
      }

      if (users && users.users && users.users.length > 0) {
        return new Response(
          JSON.stringify({ error: "Setup already completed" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const { email, password, name } = body;

      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ error: "Email, password, and name are required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Validate password strength
      if (password.length < 8) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 8 characters" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Create the first superadmin user
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name, role: "superadmin" },
        });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("User created:", newUser.user.id);

      // Create profile entry
      const { error: profileError } = await adminClient
        .from("profiles")
        .insert({
          user_id: newUser.user.id,
          full_name: name,
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
      }

      // Create user_roles entry
      const { error: roleError } = await adminClient.from("user_roles").insert({
        user_id: newUser.user.id,
        role: "superadmin",
      });

      if (roleError) {
        console.error("Error creating role:", roleError);
        // Don't rollback, user sudah dibuat
      }

      // Create employee entry
      const { error: employeeError } = await adminClient
        .from("employees")
        .insert({
          user_id: newUser.user.id,
          name,
          email,
          role: "superadmin",
          status: "available",
        });

      if (employeeError) {
        console.error("Error creating employee:", employeeError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Superadmin created successfully",
          user: {
            id: newUser.user.id,
            email: newUser.user.email,
            name,
          },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in initial setup:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
