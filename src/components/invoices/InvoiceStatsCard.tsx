import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { startOfMonth, endOfMonth, isPast } from "date-fns";

interface InvoiceStats {
  totalThisMonth: number;
  pendingPaymentAmount: number;
  pendingPaymentCount: number;
  overdueCount: number;
  monthlyRevenue: number;
}

export function InvoiceStatsCards() {
  const [stats, setStats] = useState<InvoiceStats>({
    totalThisMonth: 0,
    pendingPaymentAmount: 0,
    pendingPaymentCount: 0,
    overdueCount: 0,
    monthlyRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      const { data: allInvoices, error } = await supabase
        .from("invoices")
        .select(
          "id, invoice_date, grand_total, amount_paid, payment_status, due_date, created_at",
        )
        .order("invoice_date", { ascending: false });

      if (error) throw error;

      const invoicesThisMonth =
        allInvoices?.filter((inv) => {
          const invoiceDate = new Date(inv.invoice_date);
          return (
            invoiceDate >= new Date(monthStart) &&
            invoiceDate <= new Date(monthEnd)
          );
        }) || [];

      const totalThisMonth = invoicesThisMonth.length;

      const allPendingInvoices =
        allInvoices?.filter(
          (inv) =>
            inv.payment_status === "unpaid" || inv.payment_status === "partial",
        ) || [];

      const pendingPaymentAmount = allPendingInvoices.reduce(
        (sum, inv) => sum + (inv.grand_total - (inv.amount_paid || 0)),
        0,
      );

      const pendingPaymentCount = allPendingInvoices.length;

      const overdueCount =
        allInvoices?.filter((inv) => {
          if (!inv.due_date) return false;
          if (inv.payment_status === "paid") return false;
          return isPast(new Date(inv.due_date));
        }).length || 0;

      const monthlyRevenue = invoicesThisMonth.reduce(
        (sum, inv) => sum + (inv.amount_paid || 0),
        0,
      );

      setStats({
        totalThisMonth,
        pendingPaymentAmount,
        pendingPaymentCount,
        overdueCount,
        monthlyRevenue,
      });
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Faktur Bulan Ini */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Bulan Ini
              </p>
              <p className="text-2xl font-bold">{stats.totalThisMonth}</p>
              <p className="text-xs text-muted-foreground mt-1">Total faktur</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menunggu Pembayaran */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Belum Lunas
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.pendingPaymentAmount)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingPaymentCount} faktur
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lewat Jatuh Tempo */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Jatuh Tempo
              </p>
              <p className="text-2xl font-bold text-destructive">
                {stats.overdueCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Melewati batas waktu
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pendapatan Bulan Ini */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Pendapatan
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Bulan ini</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
