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

      // Fetch invoices for this month
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select(
          "id, grand_total, amount_paid, payment_status, due_date, created_at"
        )
        .gte("created_at", monthStart)
        .lte("created_at", monthEnd);

      if (error) throw error;

      // Calculate stats
      const totalThisMonth = invoices?.length || 0;

      // Pending payments (unpaid + partial)
      const pendingInvoices =
        invoices?.filter(
          (inv) =>
            inv.payment_status === "unpaid" || inv.payment_status === "partial"
        ) || [];

      const pendingPaymentAmount = pendingInvoices.reduce(
        (sum, inv) => sum + (inv.grand_total - (inv.amount_paid || 0)),
        0
      );

      const pendingPaymentCount = pendingInvoices.length;

      // Overdue (past due_date and not paid)
      const overdueCount =
        invoices?.filter((inv) => {
          if (!inv.due_date) return false;
          if (inv.payment_status === "paid") return false;
          return isPast(new Date(inv.due_date));
        }).length || 0;

      // Monthly revenue (all paid invoices)
      const monthlyRevenue =
        invoices
          ?.filter((inv) => inv.payment_status === "paid")
          .reduce((sum, inv) => sum + inv.grand_total, 0) || 0;

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
      {/* Total Invoices This Month */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                This Month
              </p>
              <p className="text-2xl font-bold">{stats.totalThisMonth}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Total invoices
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Payment */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Pending Payment
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(stats.pendingPaymentAmount)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.pendingPaymentCount} invoice
                {stats.pendingPaymentCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overdue */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Overdue
              </p>
              <p className="text-2xl font-bold text-destructive">
                {stats.overdueCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Past due date
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Revenue */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-x-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Revenue
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(stats.monthlyRevenue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
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
