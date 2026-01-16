import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Customer, Unit, Product, Technician } from "@/types/invoice";

export function useInvoiceData() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [customersData, unitsData, productsData, techniciansData] =
        await Promise.all([
          supabase
            .from("customers")
            .select("id, name, phone, address")
            .eq("blacklisted", false)
            .order("name"),
          supabase
            .from("units")
            .select("id, qr_code, unit_type, brand, model, customer_id")
            .order("created_at", { ascending: false }),
          supabase
            .from("products")
            .select("*")
            .eq("is_active", true)
            .gt("stock", 0)
            .order("name"),
          supabase
            .from("employees")
            .select("id, name, status")
            .eq("role", "technician")
            .eq("status", "available")
            .order("name"),
        ]);

      if (customersData.error) throw customersData.error;
      if (unitsData.error) throw unitsData.error;
      if (productsData.error) throw productsData.error;
      if (techniciansData.error) throw techniciansData.error;

      setCustomers(customersData.data || []);
      setUnits(unitsData.data || []);
      setProducts(productsData.data || []);
      setTechnicians(techniciansData.data || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load data",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    customers,
    units,
    products,
    technicians,
    loading,
    refetch: fetchData,
  };
}
