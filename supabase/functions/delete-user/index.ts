// supabase/functions/delete-user/index.ts
// Deploy: supabase functions deploy delete-user --no-verify-jwt
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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Verifikasi token caller
    const token = (req.headers.get("Authorization") ?? "")
      .replace("Bearer ", "")
      .trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token autentikasi tidak ditemukan" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const {
      data: { user: callerUser },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Token tidak valid atau sudah kedaluwarsa" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Pastikan caller adalah superadmin
    const { data: callerEmployee } = await supabaseAdmin
      .from("employees")
      .select("role")
      .eq("user_id", callerUser.id)
      .maybeSingle();

    if (callerEmployee?.role !== "superadmin") {
      return new Response(
        JSON.stringify({
          error: "Hanya superadmin yang dapat menghapus pengguna",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { userId, employeeId } = await req.json();

    if (!userId || !employeeId) {
      return new Response(
        JSON.stringify({ error: "userId dan employeeId wajib diisi" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Jangan hapus diri sendiri
    if (userId === callerUser.id) {
      return new Response(
        JSON.stringify({ error: "Tidak dapat menghapus akun sendiri" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Cek apakah target adalah superadmin terakhir
    const { count: superadminCount } = await supabaseAdmin
      .from("employees")
      .select("*", { count: "exact", head: true })
      .eq("role", "superadmin");

    const { data: targetEmployee } = await supabaseAdmin
      .from("employees")
      .select("role, name")
      .eq("id", employeeId)
      .maybeSingle();

    if (targetEmployee?.role === "superadmin" && (superadminCount ?? 0) <= 1) {
      return new Response(
        JSON.stringify({
          error: "Tidak dapat menghapus satu-satunya superadmin",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 1. Hapus dari tabel employees dulu
    const { error: empError } = await supabaseAdmin
      .from("employees")
      .delete()
      .eq("id", employeeId);

    if (empError) {
      return new Response(
        JSON.stringify({
          error: `Gagal menghapus data karyawan: ${empError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Hapus dari user_roles (opsional, mungkin ada cascade)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);

    // 3. Hapus auth user (hanya bisa dari server dengan service role)
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      // Auth user tidak terhapus tapi employee sudah terhapus — log warning
      console.warn("Auth user tidak terhapus:", authError.message);
      // Tetap return success karena employee sudah terhapus dari sistem
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Akun ${targetEmployee?.name ?? userId} berhasil dihapus`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Terjadi kesalahan tidak terduga di server" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
