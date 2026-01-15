// ============================================
// FILE 3: src/hooks/useCustomerAuth.tsx (UPDATED)
// ============================================
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface CustomerAuthContextType {
  user: User | null;
  customerId: string | null;
  customerName: string | null;
  loading: boolean;
  isCustomer: boolean;
  signOut: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType>({
  user: null,
  customerId: null,
  customerName: null,
  loading: true,
  isCustomer: false,
  signOut: async () => {},
});

export const useCustomerAuth = () => useContext(CustomerAuthContext);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCustomer, setIsCustomer] = useState(false);

  useEffect(() => {
    const fetchCustomerData = async (userId: string) => {
      try {
        // Check if user is linked to a customer
        const { data: customerUser, error } = await supabase
          .from("customer_users")
          .select("customer_id")
          .eq("user_id", userId)
          .maybeSingle(); // ← Changed from .single()

        if (error) {
          console.log("Not a customer user:", error.message);
          setIsCustomer(false);
          setCustomerId(null);
          setCustomerName(null);
          return;
        }

        if (!customerUser) {
          setIsCustomer(false);
          setCustomerId(null);
          setCustomerName(null);
          return;
        }

        // Get customer details
        const { data: customer, error: customerError } = await supabase
          .from("customers")
          .select("name")
          .eq("id", customerUser.customer_id)
          .maybeSingle();

        if (customerError) {
          console.error("Error fetching customer details:", customerError);
        }

        setIsCustomer(true);
        setCustomerId(customerUser.customer_id);
        setCustomerName(customer?.name || null);
      } catch (err) {
        console.error("Error in fetchCustomerData:", err);
        setIsCustomer(false);
        setCustomerId(null);
        setCustomerName(null);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCustomerData(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchCustomerData(session.user.id);
      } else {
        setCustomerId(null);
        setCustomerName(null);
        setIsCustomer(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    localStorage.clear();
    sessionStorage.clear();
    await supabase.auth.signOut();
    window.location.href = "/portal/login";
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        user,
        customerId,
        customerName,
        loading,
        isCustomer,
        signOut,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}
