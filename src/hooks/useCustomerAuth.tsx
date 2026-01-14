import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface CustomerAuthContextType {
  user: User | null;
  customerId: string | null;
  customerName: string | null;
  loading: boolean;
  isCustomer: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextType>({
  user: null,
  customerId: null,
  customerName: null,
  loading: true,
  isCustomer: false,
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
          .from('customer_users')
          .select('customer_id, customers(name)')
          .eq('user_id', userId)
          .single();

        if (error || !customerUser) {
          setIsCustomer(false);
          setCustomerId(null);
          setCustomerName(null);
        } else {
          setIsCustomer(true);
          setCustomerId(customerUser.customer_id);
          setCustomerName((customerUser.customers as any)?.name || null);
        }
      } catch {
        setIsCustomer(false);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCustomerData(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchCustomerData(session.user.id);
        } else {
          setCustomerId(null);
          setCustomerName(null);
          setIsCustomer(false);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <CustomerAuthContext.Provider value={{ user, customerId, customerName, loading, isCustomer }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}