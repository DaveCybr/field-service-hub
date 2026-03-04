// ============================================
// FILE: src/pages/Auth.tsx
// Login page — superadmin only
// ============================================
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Wrench, Loader2, Lock, ShieldAlert, AlertCircle } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export default function Auth() {
  const { signIn, signOut, user, loading, accessDenied } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Redirect kalau sudah login dan punya akses
  useEffect(() => {
    if (!loading && user && !accessDenied) {
      navigate("/dashboard");
    }
  }, [user, loading, accessDenied, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    // Validate
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setFieldError(result.error.errors[0].message);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      setFieldError(
        error.message === "Invalid login credentials"
          ? "Email atau password salah"
          : error.message,
      );
      return;
    }

    // Log audit
    try {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (u) {
        await supabase.from("audit_logs").insert([
          {
            user_id: u.id,
            action: "login",
            entity_type: "user",
            entity_id: u.id,
            new_data: { email: u.email },
            user_agent: navigator.userAgent,
          },
        ]);
      }
    } catch {}
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f6fa",
        }}
      >
        <Loader2
          style={{ width: "28px", height: "28px", color: "#2563eb" }}
          className="animate-spin"
        />
      </div>
    );
  }

  // ── Access denied state ────────────────────────────────────────────────────
  if (accessDenied) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f6fa",
          padding: "24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <ShieldAlert
              style={{ width: "30px", height: "30px", color: "#dc2626" }}
            />
          </div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#111827",
              margin: "0 0 8px",
            }}
          >
            Akses Ditolak
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              margin: "0 0 24px",
              lineHeight: 1.6,
            }}
          >
            Akun ini tidak memiliki izin untuk mengakses panel admin.
            <br />
            Hanya <strong>Superadmin</strong> yang diizinkan masuk.
          </p>
          <button
            onClick={() => signOut()}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              background: "#dc2626",
              color: "white",
              border: "none",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#b91c1c")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#dc2626")}
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  // ── Login form ─────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f5f6fa 0%, #eef2ff 100%)",
        padding: "24px",
        fontFamily: "'Inter','DM Sans',system-ui,sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 20px rgba(37,99,235,0.3)",
            }}
          >
            <Wrench style={{ width: "26px", height: "26px", color: "white" }} />
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: "#111827",
              margin: "0 0 4px",
              letterSpacing: "-0.02em",
            }}
          >
            REKAMTEKNIK
          </h1>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
            Admin Panel · Field Service Management
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "white",
            borderRadius: "16px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}
        >
          {/* Card header */}
          <div
            style={{
              padding: "24px 28px 0",
              borderBottom: "1px solid #f3f4f6",
              paddingBottom: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 4px",
              }}
            >
              Masuk ke Panel Admin
            </h2>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
              Khusus akun Superadmin
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ padding: "24px 28px" }}>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {/* Error banner */}
              {fieldError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    padding: "12px",
                  }}
                >
                  <AlertCircle
                    style={{
                      width: "16px",
                      height: "16px",
                      color: "#dc2626",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                  />
                  <p style={{ fontSize: "13px", color: "#dc2626", margin: 0 }}>
                    {fieldError}
                  </p>
                </div>
              )}

              {/* Email */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setFieldError(null);
                  }}
                  placeholder="admin@rekamteknik.com"
                  required
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${fieldError ? "#fca5a5" : "#e5e7eb"}`,
                    fontSize: "14px",
                    color: "#111827",
                    outline: "none",
                    transition: "border-color 0.15s",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = fieldError
                      ? "#fca5a5"
                      : "#e5e7eb")
                  }
                />
              </div>

              {/* Password */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldError(null);
                  }}
                  placeholder="••••••••"
                  required
                  style={{
                    padding: "10px 14px",
                    borderRadius: "8px",
                    border: `1.5px solid ${fieldError ? "#fca5a5" : "#e5e7eb"}`,
                    fontSize: "14px",
                    color: "#111827",
                    outline: "none",
                    transition: "border-color 0.15s",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#93c5fd")}
                  onBlur={(e) =>
                    (e.target.style.borderColor = fieldError
                      ? "#fca5a5"
                      : "#e5e7eb")
                  }
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "11px",
                  background: isLoading ? "#93c5fd" : "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "9px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "background 0.15s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  if (!isLoading) e.currentTarget.style.background = "#1d4ed8";
                }}
                onMouseLeave={(e) => {
                  if (!isLoading) e.currentTarget.style.background = "#2563eb";
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2
                      style={{ width: "16px", height: "16px" }}
                      className="animate-spin"
                    />{" "}
                    Memverifikasi...
                  </>
                ) : (
                  "Masuk"
                )}
              </button>
            </div>
          </form>

          {/* Footer note */}
          <div
            style={{
              padding: "14px 28px",
              background: "#f9fafb",
              borderTop: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Lock
              style={{
                width: "12px",
                height: "12px",
                color: "#9ca3af",
                flexShrink: 0,
              }}
            />
            <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
              Akun baru hanya dapat dibuat oleh administrator sistem
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
