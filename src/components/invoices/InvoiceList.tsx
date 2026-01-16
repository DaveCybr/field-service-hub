import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInvoiceFilters } from "@/hooks/invoices/useInvoiceFilters";
import { InvoiceStatsCards } from "@/components/invoices/InvoiceStatsCard";
import { InvoiceFiltersBar } from "@/components/invoices/InvoiceFiltersBar";
import { InvoiceTable, Invoice } from "@/components/invoices/InvoiceTable";
import { Card } from "@/components/ui/card";
import { isWithinInterval } from "date-fns";
import { BulkExport } from "./BulkExport";

export function InvoiceList() {
  const { toast } = useToast();
  const { filters, updateFilters, clearFilters } = useInvoiceFilters();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<
    Array<{ id: string; name: string }>
  >([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [invoices, filters]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          id,
          invoice_number,
          customer_id,
          invoice_date,
          grand_total,
          status,
          payment_status,
          customer:customers (
            name
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get counts for services and items
      const invoicesWithCounts = await Promise.all(
        (data || []).map(async (invoice) => {
          const [servicesResult, itemsResult] = await Promise.all([
            supabase
              .from("invoice_services")
              .select("id", { count: "exact", head: true })
              .eq("invoice_id", invoice.id),
            supabase
              .from("invoice_items")
              .select("id", { count: "exact", head: true })
              .eq("invoice_id", invoice.id),
          ]);

          return {
            ...invoice,
            customer: Array.isArray(invoice.customer)
              ? invoice.customer[0]
              : invoice.customer,
            services_count: servicesResult.count || 0,
            items_count: itemsResult.count || 0,
          };
        })
      );

      setInvoices(invoicesWithCounts);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load invoices",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .order("name");

    if (data) setCustomers(data);
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.invoice_number.toLowerCase().includes(searchLower) ||
          inv.customer?.name.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((inv) => inv.status === filters.status);
    }

    // Payment status filter
    if (filters.paymentStatus !== "all") {
      filtered = filtered.filter(
        (inv) => inv.payment_status === filters.paymentStatus
      );
    }

    // Date range filter
    if (filters.dateRange?.from) {
      filtered = filtered.filter((inv) => {
        const invoiceDate = new Date(inv.invoice_date);
        if (filters.dateRange!.to) {
          return isWithinInterval(invoiceDate, {
            start: filters.dateRange!.from!,
            end: filters.dateRange!.to,
          });
        } else {
          return (
            invoiceDate.toDateString() ===
            filters.dateRange!.from!.toDateString()
          );
        }
      });
    }

    if (filters.maxAmount !== undefined) {
      filtered = filtered.filter(
        (inv) => inv.grand_total <= filters.maxAmount!
      );
    }

    if (filters.minAmount !== undefined) {
      filtered = filtered.filter(
        (inv) => inv.grand_total >= filters.minAmount!
      );
    }
    // Customer filter
    if (filters.customerId) {
      filtered = filtered.filter(
        (inv) => inv.customer_id === filters.customerId
      );
    }

    setFilteredInvoices(filtered);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <InvoiceStatsCards />

      {/* Filters */}
      <Card className="p-6">
        <InvoiceFiltersBar
          customers={customers}
          filters={filters}
          onFiltersChange={updateFilters}
          onClearFilters={clearFilters}
        />
      </Card>

      {/* Results Summary */}
      {!loading && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredInvoices.length} of {invoices.length} invoice
            {invoices.length !== 1 ? "s" : ""}
          </span>
          {filteredInvoices.length !== invoices.length && (
            <span className="text-primary font-medium">Filtered results</span>
          )}
        </div>
      )}

      {/* Table */}
      <Card className="p-6">
        <InvoiceTable
          invoices={filteredInvoices}
          loading={loading}
          onRefresh={fetchInvoices}
        />
      </Card>
    </div>
  );
}
