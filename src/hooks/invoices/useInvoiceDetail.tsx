import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  status: string;
  payment_status: string;
  invoice_date: string;
  due_date?: string;
  services_total: number;
  items_total: number;
  discount: number;
  tax: number;
  grand_total: number;
  amount_paid: number;
  notes?: string;
  admin_notes?: string;
  customer?: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
  };
  created_by?: {
    name: string;
  };
}

export interface InvoiceService {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  service_cost: number;
  parts_cost: number;
  total_cost: number;
  scheduled_date?: string;
  service_address?: string;
  service_latitude?: number;
  service_longitude?: number;
  estimated_duration_minutes?: number;
  assigned_technician?: {
    id: string;
    name: string;
  };
  unit?: {
    qr_code: string;
    unit_type: string;
    brand?: string;
  };
}

export interface InvoiceItem {
  id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

export function useInvoiceDetail(invoiceId: string) {
  const { toast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [services, setServices] = useState<InvoiceService[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;

    setLoading(true);
    try {
      // Fetch invoice with customer and creator info
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(
          `
          *,
          customer:customers (
            name, 
            phone, 
            email, 
            address
          ),
          created_by:employees!invoices_created_by_fkey (
            name
          )
        `
        )
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      setInvoice({
        ...invoiceData,
        customer: Array.isArray(invoiceData.customer)
          ? invoiceData.customer[0]
          : invoiceData.customer,
        created_by: Array.isArray(invoiceData.created_by)
          ? invoiceData.created_by[0]
          : invoiceData.created_by,
      });

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from("invoice_services")
        .select(
          `
          *,
          assigned_technician:employees!invoice_services_assigned_technician_id_fkey (
            id,
            name
          ),
          unit:units (
            qr_code,
            unit_type,
            brand
          )
        `
        )
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });

      if (servicesError) throw servicesError;

      setServices(
        servicesData?.map((s) => ({
          ...s,
          assigned_technician: Array.isArray(s.assigned_technician)
            ? s.assigned_technician[0]
            : s.assigned_technician,
          unit: Array.isArray(s.unit) ? s.unit[0] : s.unit,
        })) || []
      );

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      setItems(itemsData || []);
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load invoice",
      });
    } finally {
      setLoading(false);
    }
  }, [invoiceId, toast]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  return {
    invoice,
    services,
    items,
    loading,
    updating,
    setUpdating,
    refetch: fetchInvoice,
  };
}
