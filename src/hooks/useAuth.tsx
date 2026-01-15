// ============================================
// FILE 2: src/hooks/useAuth.tsx (UPDATED)
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
  isSuperadmin: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    role?: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [userRole, setUserRole] = useState<EmployeeRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchEmployee = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(); // ← Changed from .single()

      if (!error && data) {
        setEmployee(data as Employee);
      } else if (error) {
        console.log("No employee record found:", error.message);
      }
    } catch (err) {
      console.error("Error fetching employee:", err);
    }
  };

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle(); // ← Changed from .single()

      if (!error && data) {
        setUserRole(data.role as EmployeeRole);
      } else if (error) {
        console.log("No user role found:", error.message);
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);

      setSession(session);
      setUser(session?.user ?? null);

      // Defer Supabase calls with setTimeout
      if (session?.user) {
        setTimeout(() => {
          fetchEmployee(session.user.id);
          fetchUserRole(session.user.id);
        }, 0);
      } else {
        setEmployee(null);
        setUserRole(null);
      }

      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchEmployee(session.user.id);
        fetchUserRole(session.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: string = "technician"
  ) => {
    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
          role,
        },
      },
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
  const isAdmin = userRole === "superadmin" || userRole === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        employee,
        userRole,
        loading,
        isSuperadmin,
        isAdmin,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
