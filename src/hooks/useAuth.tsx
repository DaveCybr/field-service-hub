// ============================================
// FILE: src/hooks/useAuth.tsx
// Hanya superadmin yang boleh login ke web admin
// ============================================
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type EmployeeRole =
  | "superadmin"
  | "admin"
  | "manager"
  | "technician"
  | "cashier";

interface Employee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  status: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  employee: Employee | null;
  userRole: EmployeeRole | null;
  loading: boolean;
  accessDenied: boolean; // ← true jika login berhasil tapi bukan superadmin
  isSuperadmin: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALLOWED_ROLE: EmployeeRole = "superadmin";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [userRole, setUserRole] = useState<EmployeeRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchEmployee = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) {
        // Tidak ada record employee → tolak akses
        console.log("No employee record found:", error?.message);
        await forceSignOut();
        setAccessDenied(true);
        return;
      }

      if (data.role !== ALLOWED_ROLE) {
        // Role bukan superadmin → tolak akses, sign out
        await forceSignOut();
        setAccessDenied(true);
        return;
      }

      // Akses diterima
      setEmployee(data as Employee);
      setUserRole(data.role as EmployeeRole);
      setAccessDenied(false);
    } catch (err) {
      console.error("Error fetching employee:", err);
      await forceSignOut();
      setAccessDenied(true);
    }
  };

  const forceSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setSession(null);
    setEmployee(null);
    setUserRole(null);
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => fetchEmployee(session.user.id), 0);
      } else {
        setEmployee(null);
        setUserRole(null);
        if (event !== "SIGNED_OUT") setAccessDenied(false);
      }

      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchEmployee(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setAccessDenied(false);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const isSuperadmin = userRole === "superadmin";
  const isAdmin = userRole === "superadmin";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        employee,
        userRole,
        loading,
        accessDenied,
        isSuperadmin,
        isAdmin,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined)
    throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
