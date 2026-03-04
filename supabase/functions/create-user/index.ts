// supabase/functions/create-user/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verifikasi bahwa request datang dari user yang sudah login
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

    // 2. Buat client dengan SERVICE ROLE KEY untuk operasi admin
    //    (hanya tersedia di server-side / Edge Function, aman)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // 3. Verifikasi JWT dari request untuk memastikan caller adalah superadmin
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    const {
      data: { user: callerUser },
      error: callerError,
    } = await supabaseClient.auth.getUser();

    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Token tidak valid atau sudah kedaluwarsa" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4. Cek apakah caller adalah superadmin
    const { data: callerEmployee, error: empError } = await supabaseAdmin
      .from("employees")
      .select("role")
      .eq("user_id", callerUser.id)
      .single();

    if (empError || !callerEmployee) {
      return new Response(
        JSON.stringify({ error: "Data karyawan tidak ditemukan" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (callerEmployee.role !== "superadmin") {
      return new Response(
        JSON.stringify({
          error: "Hanya superadmin yang dapat membuat pengguna baru",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 5. Parse body request
    const { email, password, name, role, phone } = await req.json();

    if (!email || !password || !name || !role) {
      return new Response(
        JSON.stringify({
          error: "Email, password, nama, dan role wajib diisi",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password minimal 8 karakter" }),
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
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Role tidak valid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Buat auth user baru menggunakan service role (admin API)
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role }, // ← kirim metadata
      });

    if (createError) {
      // Terjemahkan pesan error umum
      let errorMsg = createError.message;
      if (
        errorMsg.includes("already registered") ||
        errorMsg.includes("already been registered")
      ) {
        errorMsg = "Email sudah terdaftar di sistem";
      }
      return new Response(JSON.stringify({ error: errorMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!newUser.user) {
      return new Response(
        JSON.stringify({ error: "Gagal membuat akun pengguna" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 7. Buat record di tabel employees
    const { error: employeeError } = await supabaseAdmin
      .from("employees")
      .insert({
        user_id: newUser.user.id,
        name,
        email,
        phone: phone || null,
        role,
        status: "available",
      });

    if (employeeError) {
      // Rollback: hapus auth user jika gagal buat employee
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({
          error: `Gagal menyimpan data karyawan: ${employeeError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 8. Tambahkan ke tabel user_roles (jika digunakan untuk RLS)
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: newUser.user.id,
      role,
    });

    // user_roles gagal tidak fatal, log saja
    if (roleError) {
      console.warn("Gagal insert user_roles:", roleError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        },
        message: `Akun untuk ${name} berhasil dibuat`,
      }),
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
