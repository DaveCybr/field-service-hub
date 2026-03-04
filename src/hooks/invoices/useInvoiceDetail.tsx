// ============================================
// FILE: src/hooks/invoices/useInvoiceDetail.ts
// FIX: Tambah fetch service_parts_usage dari teknisi
// ============================================
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
  created_at: string;
  updated_at: string;
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
  // source membedakan dari mana item berasal
  source: "invoice_item" | "parts_usage";
  // field tambahan untuk parts_usage
  service_title?: string;
  technician_name?: string;
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
      // ── 1. Fetch invoice ──────────────────────────────────────────────────
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(
          `
          *,
          customer:customers (name, phone, email, address),
          created_by:employees!invoices_created_by_fkey (name)
        `,
        )
        .eq("invoice_number", invoiceId)
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

      const invoiceUUID = invoiceData.id;

      // ── 2. Fetch services ─────────────────────────────────────────────────
      const { data: servicesData, error: servicesError } = await supabase
        .from("invoice_services")
        .select(
          `
          *,
          assigned_technician:employees!invoice_services_assigned_technician_id_fkey (id, name),
          unit:units (qr_code, unit_type, brand)
        `,
        )
        .eq("invoice_id", invoiceUUID)
        .order("created_at", { ascending: true });

      if (servicesError) throw servicesError;

      setServices(
        servicesData?.map((s) => ({
          ...s,
          assigned_technician: Array.isArray(s.assigned_technician)
            ? s.assigned_technician[0]
            : s.assigned_technician,
          unit: Array.isArray(s.unit) ? s.unit[0] : s.unit,
        })) || [],
      );

      // ── 3. Fetch invoice_items (produk yang ditambah saat buat invoice) ───
      const { data: invoiceItemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceUUID)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      const invoiceItems: InvoiceItem[] = (invoiceItemsData || []).map(
        (item) => ({
          id: item.id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount,
          total_price: item.total_price,
          source: "invoice_item" as const,
        }),
      );

      // ── 4. Fetch service_parts_usage (sparepart dari teknisi) ─────────────
      // Ambil service IDs dulu
      const serviceIds = servicesData?.map((s) => s.id) || [];

      let partsItems: InvoiceItem[] = [];

      if (serviceIds.length > 0) {
        const { data: partsData, error: partsError } = await supabase
          .from("service_parts_usage")
          .select(
            `
            id,
            product_name,
            product_sku,
            quantity_used,
            unit_price,
            total_cost,
            service:invoice_services!service_parts_usage_service_id_fkey (
              title,
              assigned_technician:employees!invoice_services_assigned_technician_id_fkey (name)
            )
          `,
          )
          .in("service_id", serviceIds)
          .order("created_at", { ascending: true });

        if (!partsError && partsData) {
          partsItems = partsData.map((part) => {
            const svc = Array.isArray(part.service)
              ? part.service[0]
              : part.service;
            const tech = svc?.assigned_technician
              ? Array.isArray(svc.assigned_technician)
                ? svc.assigned_technician[0]
                : svc.assigned_technician
              : null;

            return {
              id: part.id,
              product_name: part.product_name,
              product_sku: part.product_sku || undefined,
              quantity: part.quantity_used,
              unit_price: part.unit_price,
              discount: 0,
              total_price: part.total_cost,
              source: "parts_usage" as const,
              service_title: svc?.title || undefined,
              technician_name: tech?.name || undefined,
            };
          });
        }
      }

      // ── 5. Gabungkan: invoice_items dulu, lalu parts_usage ────────────────
      setItems([...invoiceItems, ...partsItems]);
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
