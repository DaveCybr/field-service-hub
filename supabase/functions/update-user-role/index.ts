// supabase/functions/update-user-role/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Tidak ada token autentikasi" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verifikasi caller
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user: callerUser },
      error: callerError,
    } = await supabaseClient.auth.getUser();

    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: "Token tidak valid" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pastikan caller adalah superadmin
    const { data: callerEmployee } = await supabaseAdmin
      .from("employees")
      .select("role")
      .eq("user_id", callerUser.id)
      .single();

    if (callerEmployee?.role !== "superadmin") {
      return new Response(
        JSON.stringify({ error: "Hanya superadmin yang dapat mengubah role" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { userId, newRole } = await req.json();

    if (!userId || !newRole) {
      return new Response(
        JSON.stringify({ error: "userId dan newRole wajib diisi" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Prevent self role change
    if (userId === callerUser.id) {
      return new Response(
        JSON.stringify({ error: "Tidak dapat mengubah role sendiri" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const validRoles = [
      "admin",
      "manager",
      "technician",
      "cashier",
      "superadmin",
    ];
    if (!validRoles.includes(newRole)) {
      return new Response(JSON.stringify({ error: "Role tidak valid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update employees table
    const { error: empError } = await supabaseAdmin
      .from("employees")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (empError) {
      return new Response(
        JSON.stringify({
          error: `Gagal memperbarui role: ${empError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Update user_roles table (upsert)
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: newRole }, { onConflict: "user_id" });

    return new Response(
      JSON.stringify({ success: true, message: "Role berhasil diperbarui" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan internal server" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
