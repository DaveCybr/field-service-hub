// Dashboard.tsx - Dashboard utama untuk Admin/Manager
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  DollarSign,
  Users,
  Wrench,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  Package,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface DashboardStats {
  todayRevenue: number;
  monthlyRevenue: number;
  totalCustomers: number;
  activeJobs: number;
  pendingJobs: number;
  completedJobsToday: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  customer: { name: string };
  grand_total: number;
  payment_status: string;
  created_at: string;
}

interface PendingJob {
  id: string;
  title: string;
  priority: string;
  invoice: {
    invoice_number: string;
    customer: { name: string };
  };
}

interface StockAlert {
  id: string;
  product: {
    name: string;
    stock: number;
    min_stock_threshold: number;
  };
}

interface TechnicianStatus {
  id: string;
  name: string;
  status: string;
  active_jobs_count: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    activeJobs: 0,
    pendingJobs: 0,
    completedJobsToday: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchRecentInvoices(),
        fetchPendingJobs(),
        fetchStockAlerts(),
        fetchTechnicians(),
      ]);
    } catch (error) {
      console.error("Error mengambil data dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Pendapatan hari ini
      const { data: todayInvoices } = await supabase
        .from("invoices")
        .select("grand_total")
        .gte("created_at", today.toISOString())
        .in("payment_status", ["paid", "partial"]);

      // Pendapatan bulanan
      const { data: monthlyInvoices } = await supabase
        .from("invoices")
        .select("grand_total")
        .gte("created_at", startOfMonth.toISOString())
        .in("payment_status", ["paid", "partial"]);

      // Total pelanggan
      const { count: customersCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

      // Pekerjaan aktif (assigned + in_progress)
      const { count: activeJobsCount } = await supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .in("status", ["assigned", "in_progress"]);

      // Pekerjaan tertunda
      const { count: pendingJobsCount } = await supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // Pekerjaan selesai hari ini
      const { count: completedTodayCount } = await supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("actual_checkout_at", today.toISOString());

      setStats({
        todayRevenue:
          todayInvoices?.reduce(
            (sum, inv) => sum + (inv.grand_total || 0),
            0,
          ) || 0,
        monthlyRevenue:
          monthlyInvoices?.reduce(
            (sum, inv) => sum + (inv.grand_total || 0),
            0,
          ) || 0,
        totalCustomers: customersCount || 0,
        activeJobs: activeJobsCount || 0,
        pendingJobs: pendingJobsCount || 0,
        completedJobsToday: completedTodayCount || 0,
      });
    } catch (error) {
      console.error("Error mengambil statistik:", error);
    }
  };

  const fetchRecentInvoices = async () => {
    try {
      const { data } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, grand_total, payment_status, created_at, customer:customers(name)",
        )
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentInvoices(data || []);
    } catch (error) {
      console.error("Error mengambil faktur terbaru:", error);
    }
  };

  const fetchPendingJobs = async () => {
    try {
      const { data } = await supabase
        .from("invoice_services")
        .select(
          `
          id, 
          title, 
          priority,
          invoice:invoices!inner(
            invoice_number,
            customer:customers(name)
          )
        `,
        )
        .eq("status", "pending")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(5);

      setPendingJobs(data || []);
    } catch (error) {
      console.error("Error mengambil pekerjaan tertunda:", error);
    }
  };

  const fetchStockAlerts = async () => {
    try {
      const { data } = await supabase
        .from("stock_alerts")
        .select(
          `
          id,
          product:products!inner(name, stock, min_stock_threshold)
        `,
        )
        .eq("status", "active")
        .limit(5);

      setStockAlerts(data || []);
    } catch (error) {
      console.error("Error mengambil peringatan stok:", error);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const { data } = await supabase
        .from("employees")
        .select(
          `
          id,
          name,
          status,
          active_jobs:invoice_services!assigned_technician_id(count)
        `,
        )
        .eq("role", "technician")
        .order("name");

      const techsWithCount = (data || []).map((tech: any) => ({
        ...tech,
        active_jobs_count: tech.active_jobs?.[0]?.count || 0,
      }));

      setTechnicians(techsWithCount);
    } catch (error) {
      console.error("Error mengambil data teknisi:", error);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      paid: { label: "Lunas", className: "bg-green-100 text-green-800" },
      partial: {
        label: "Sebagian",
        className: "bg-yellow-100 text-yellow-800",
      },
      pending: { label: "Tertunda", className: "bg-gray-100 text-gray-800" },
      overdue: { label: "Jatuh Tempo", className: "bg-red-100 text-red-800" },
    };
    const { label, className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityLabels: Record<string, string> = {
      urgent: "MENDESAK",
      high: "TINGGI",
      normal: "NORMAL",
      low: "RENDAH",
    };
    const config: Record<string, { className: string }> = {
      urgent: { className: "bg-red-100 text-red-800" },
      high: { className: "bg-orange-100 text-orange-800" },
      normal: { className: "bg-blue-100 text-blue-800" },
      low: { className: "bg-gray-100 text-gray-800" },
    };
    const { className } = config[priority] || config.normal;
    return (
      <Badge className={className}>
        {priorityLabels[priority] || priority.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Selamat datang, {employee?.name}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Berikut ringkasan aktivitas bisnis Anda hari ini
            </p>
          </div>
          <Button onClick={() => navigate("/invoices/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Faktur Baru
          </Button>
        </div>

        {/* Kartu Statistik */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pendapatan Hari Ini
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(stats.todayRevenue)}
                  </p>
                </div>
                <div className="rounded-lg p-3 bg-green-100">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pendapatan Bulanan
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(stats.monthlyRevenue)}
                  </p>
                </div>
                <div className="rounded-lg p-3 bg-blue-100">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Pekerjaan Aktif
                  </p>
                  <p className="text-2xl font-bold mt-1">{stats.activeJobs}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.pendingJobs} tertunda
                  </p>
                </div>
                <div className="rounded-lg p-3 bg-purple-100">
                  <Wrench className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Pelanggan
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {stats.totalCustomers}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.completedJobsToday} pekerjaan selesai hari ini
                  </p>
                </div>
                <div className="rounded-lg p-3 bg-amber-100">
                  <Users className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dua Kolom */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Faktur Terbaru */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                Faktur Terbaru
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/invoices")}
              >
                Lihat Semua
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Belum ada faktur
                </p>
              ) : (
                <div className="space-y-3">
                  {recentInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() =>
                        navigate(`/invoices/${invoice.invoice_number}`)
                      }
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {invoice.customer.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {invoice.invoice_number}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-medium text-sm">
                          {formatCurrency(invoice.grand_total)}
                        </p>
                        {getPaymentStatusBadge(invoice.payment_status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pekerjaan Tertunda */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                <div className="flex items-center gap-2">
                  Pekerjaan Tertunda
                  {stats.pendingJobs > 0 && (
                    <Badge variant="destructive">{stats.pendingJobs}</Badge>
                  )}
                </div>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/jobs?status=pending")}
              >
                Lihat Semua
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {pendingJobs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Semua pekerjaan sudah ditugaskan!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 cursor-pointer transition-colors"
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {job.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.invoice.customer.name}
                        </p>
                      </div>
                      <div className="ml-4">
                        {getPriorityBadge(job.priority)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Baris Bawah */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Peringatan Stok */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                <div className="flex items-center gap-2">
                  Peringatan Stok Menipis
                  {stockAlerts.length > 0 && (
                    <Badge variant="destructive">{stockAlerts.length}</Badge>
                  )}
                </div>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/inventory")}
              >
                Lihat Semua
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {stockAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-10 w-10 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Semua stok dalam kondisi baik!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stockAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <div>
                          <p className="font-medium text-sm">
                            {alert.product.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Saat ini: {alert.product.stock} | Min:{" "}
                            {alert.product.min_stock_threshold}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Teknisi */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold">
                Status Teknisi
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/technicians")}
              >
                Lihat Semua
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {technicians.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Belum ada teknisi
                </p>
              ) : (
                <div className="space-y-2">
                  {technicians.map((tech) => (
                    <div
                      key={tech.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            tech.active_jobs_count === 0
                              ? "bg-green-500"
                              : "bg-amber-500"
                          }`}
                        />
                        <span className="font-medium text-sm">{tech.name}</span>
                      </div>
                      <div className="text-right">
                        {tech.active_jobs_count === 0 ? (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-600"
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            Tersedia
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            {tech.active_jobs_count} aktif
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
