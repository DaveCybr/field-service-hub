// InvoiceList.tsx - Daftar Faktur dengan Pagination SERVER-SIDE
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInvoiceFilters } from "@/hooks/invoices/useInvoiceFilters";
import { InvoiceStatsCards } from "@/components/invoices/InvoiceStatsCard";
import { InvoiceFiltersBar } from "@/components/invoices/InvoiceFiltersBar";
import { InvoiceTable, Invoice } from "@/components/invoices/InvoiceTable";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      // ✅ FIX PAGINATION: Pisahkan count query dari data query.
      // Query dengan relasi one-to-many (invoice_services, invoice_items) membuat
      // count: "exact" menghitung rows join, bukan rows invoice — pagination jadi salah.
      // Solusi: count query terpisah hanya dari tabel invoices, tanpa join.

      // 1. Bangun base filter (dipakai di kedua query)
      const buildFilters = (q: any) => {
        if (filters.search) {
          q = q.or(`invoice_number.ilike.%${filters.search}%`);
        }
        if (filters.status !== "all") q = q.eq("status", filters.status);
        if (filters.paymentStatus !== "all")
          q = q.eq("payment_status", filters.paymentStatus);
        if (filters.customerId) q = q.eq("customer_id", filters.customerId);
        if (filters.minAmount !== undefined)
          q = q.gte("grand_total", filters.minAmount);
        if (filters.maxAmount !== undefined)
          q = q.lte("grand_total", filters.maxAmount);
        if (filters.dateRange?.from) {
          const fromDate = filters.dateRange.from.toISOString();
          if (filters.dateRange.to) {
            q = q
              .gte("invoice_date", fromDate)
              .lte("invoice_date", filters.dateRange.to.toISOString());
          } else {
            q = q.eq("invoice_date", fromDate);
          }
        }
        return q;
      };

      // 2. Count query — tanpa join relasi agar hasilnya akurat
      const countQuery = buildFilters(
        supabase.from("invoices").select("id", { count: "exact", head: true }),
      );
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      // 3. Data query — dengan join relasi untuk services_count & items_count
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const dataQuery = buildFilters(
        supabase.from("invoices").select(`
          id,
          invoice_number,
          customer_id,
          invoice_date,
          grand_total,
          status,
          payment_status,
          updated_at,
          customer:customers (name),
          invoice_services(id),
          invoice_items(id)
        `),
      )
        .order("updated_at", { ascending: false })
        .range(offset, offset + ITEMS_PER_PAGE - 1);

      const { data, error } = await dataQuery;

      if (error) throw error;

      // ✅ FIX: Hitung dari relasi yang sudah di-join, tidak perlu query tambahan
      const invoicesFormatted = (data || []).map((invoice: any) => ({
        ...invoice,
        customer: Array.isArray(invoice.customer)
          ? invoice.customer[0]
          : invoice.customer,
        services_count: invoice.invoice_services?.length || 0,
        items_count: invoice.invoice_items?.length || 0,
      }));

      setInvoices(invoicesFormatted);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      toast({
        variant: "destructive",
        title: "Gagal Memuat",
        description:
          error.message || "Terjadi kesalahan saat memuat daftar faktur",
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

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    const pageNum = Math.max(1, Math.min(page, totalPages || 1));
    setCurrentPage(pageNum);
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  return (
    <div className="space-y-6">
      {/* Kartu Statistik */}
      <InvoiceStatsCards />

      {/* Filter */}
      <Card className="p-6">
        <InvoiceFiltersBar
          customers={customers}
          filters={filters}
          onFiltersChange={updateFilters}
          onClearFilters={clearFilters}
        />
      </Card>

      {/* Tabel */}
      <Card className="p-6">
        {/* ✅ FIX: Ringkasan hasil hanya di satu tempat, tidak duplikat */}
        {!loading && totalCount > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            Menampilkan {startIndex}–{endIndex} dari {totalCount} faktur
          </p>
        )}
        <InvoiceTable
          invoices={invoices}
          loading={loading}
          onRefresh={fetchInvoices}
        />
        {!loading && totalCount > 0 && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              Halaman {currentPage} dari {totalPages}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                title="Halaman pertama"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                title="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {totalPages > 1 &&
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => {
                      const showPage =
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1;

                      if (!showPage && Math.abs(page - currentPage) === 2) {
                        return (
                          <span key={page} className="px-1">
                            ...
                          </span>
                        );
                      }

                      if (showPage) {
                        return (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
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
                title="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Halaman terakhir"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              {ITEMS_PER_PAGE} per halaman
            </div>
          </div>
        )}
      </Card>

      {/* Pagination — tampil selalu jika ada data, bukan hanya jika > ITEMS_PER_PAGE */}
    </div>
  );
}
