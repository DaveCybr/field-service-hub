import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInvoiceFilters } from "@/hooks/invoices/useInvoiceFilters";
import { InvoiceStatsCards } from "@/components/invoices/InvoiceStatsCard";
import { InvoiceFiltersBar } from "@/components/invoices/InvoiceFiltersBar";
import { InvoiceTable, Invoice } from "@/components/invoices/InvoiceTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isWithinInterval } from "date-fns";
import { BulkExport } from "./BulkExport";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const ITEMS_PER_PAGE = 10;

export function InvoiceList() {
  const { toast } = useToast();
  const { filters, updateFilters, clearFilters } = useInvoiceFilters();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    fetchInvoices();
  }, [filters, currentPage]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Build filter query
      let query = supabase.from("invoices").select(
        `
          id,
          invoice_number,
          customer_id,
          invoice_date,
          grand_total,
          status,
          payment_status,
          updated_at,
          customer:customers (
            name
          )
        `,
        { count: "exact" },
      );

      // Apply filters
      if (filters.search) {
        query = query.or(
          `invoice_number.ilike.%${filters.search}%,customer.name.ilike.%${filters.search}%`,
        );
      }

      if (filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters.paymentStatus !== "all") {
        query = query.eq("payment_status", filters.paymentStatus);
      }

      if (filters.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }

      if (filters.minAmount !== undefined) {
        query = query.gte("grand_total", filters.minAmount);
      }

      if (filters.maxAmount !== undefined) {
        query = query.lte("grand_total", filters.maxAmount);
      }

      if (filters.dateRange?.from) {
        const fromDate = filters.dateRange.from.toISOString();
        if (filters.dateRange.to) {
          const toDate = filters.dateRange.to.toISOString();
          query = query
            .gte("invoice_date", fromDate)
            .lte("invoice_date", toDate);
        } else {
          query = query.eq("invoice_date", fromDate);
        }
      }

      // Apply pagination
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      query = query
        .order("updated_at", { ascending: false }) // ✅ FIXED: Changed from created_at to updated_at descending
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      const { data, error, count } = await query;

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
        }),
      );

      setInvoices(invoicesWithCounts);
      setTotalCount(count || 0);
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

  // Pagination calculations
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    const pageNum = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(pageNum);
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

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
            Showing {startIndex} to {endIndex} of {totalCount} invoice
            {totalCount !== 1 ? "s" : ""}
          </span>
          {totalCount > 0 && (
            <span className="text-primary font-medium">
              {totalCount} results
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <Card className="p-6">
        <InvoiceTable
          invoices={invoices}
          loading={loading}
          onRefresh={fetchInvoices}
        />
      </Card>

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                title="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => {
                    const showPage =
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - currentPage) <= 1;

                    if (!showPage && Math.abs(page - currentPage) === 2) {
                      return <span key={page}>...</span>;
                    }

                    if (showPage) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          className="h-8 w-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    }

                    return null;
                  },
                )}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {ITEMS_PER_PAGE} items per page
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
