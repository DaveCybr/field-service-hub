import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import CashierDashboard from "@/components/dashboard/CashierDashboard";
import TechnicianDashboard from "@/components/dashboard/TechnicianDashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  ArrowRight,
  Plus,
  TrendingUp,
  FileText,
  DollarSign,
} from "lucide-react";

interface DashboardStats {
  totalInvoicesToday: number;
  totalServicesToday: number;
  pendingServices: number;
  inProgressServices: number;
  completedServicesToday: number;
  availableTechnicians: number;
  totalTechnicians: number;
  todayRevenue: number;
}

interface RecentInvoice {
  id: string;
  invoice_number: string;
  status: string;
  payment_status: string;
  customer_name: string;
  service_count: number;
  grand_total: number;
  created_at: string;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { employee, userRole, isSuperadmin, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoicesToday: 0,
    totalServicesToday: 0,
    pendingServices: 0,
    inProgressServices: 0,
    completedServicesToday: 0,
    availableTechnicians: 0,
    totalTechnicians: 0,
    todayRevenue: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Check role for conditional rendering
  const isCashier = userRole === "cashier";
  const isTechnician = userRole === "technician";
  const isManagerOrAbove = isSuperadmin || isAdmin || userRole === "manager";

  useEffect(() => {
    // Only fetch admin dashboard data if user is manager or above
    if (isManagerOrAbove) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [isManagerOrAbove]);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // ✅ Fetch today's invoices count
      const { count: todayInvoices } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      // ✅ Fetch today's services count
      const { count: todayServices } = await supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .gte("created_at", `${today}T00:00:00`)
        .lte("created_at", `${today}T23:59:59`);

      // ✅ Fetch pending services (status = 'pending')
      const { count: pendingCount } = await supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      // ✅ Fetch in progress services
      const { count: progressCount } = await supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_progress");

      // ✅ Fetch completed services today
      const { count: completedCount } = await supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("updated_at", `${today}T00:00:00`);

      // ✅ Fetch technician counts
      const { data: technicians } = await supabase
        .from("employees")
        .select("id, status")
        .eq("role", "technician");

      const availableTechs =
        technicians?.filter((t) => t.status === "available").length || 0;
      const totalTechs = technicians?.length || 0;

      // ✅ Calculate today's revenue (completed_paid invoices only)
      const { data: paidInvoices } = await supabase
        .from("invoices")
        .select("grand_total")
        .eq("payment_status", "paid")
        .gte("updated_at", `${today}T00:00:00`)
        .lte("updated_at", `${today}T23:59:59`);

      const todayRevenue =
        paidInvoices?.reduce((sum, inv) => sum + (inv.grand_total || 0), 0) ||
        0;

      setStats({
        totalInvoicesToday: todayInvoices || 0,
        totalServicesToday: todayServices || 0,
        pendingServices: pendingCount || 0,
        inProgressServices: progressCount || 0,
        completedServicesToday: completedCount || 0,
        availableTechnicians: availableTechs,
        totalTechnicians: totalTechs,
        todayRevenue,
      });

      // ✅ Fetch recent invoices with customer info and service count
      const { data: invoices } = await supabase
        .from("invoices")
        .select(
          `
          id,
          invoice_number,
          status,
          payment_status,
          grand_total,
          created_at,
          customers (name)
        `
        )
        .order("created_at", { ascending: false })
        .limit(5);

      if (invoices) {
        // Get service counts for each invoice
        const invoicesWithCounts = await Promise.all(
          invoices.map(async (invoice) => {
            const { count } = await supabase
              .from("invoice_services")
              .select("*", { count: "exact", head: true })
              .eq("invoice_id", invoice.id);

            return {
              id: invoice.id,
              invoice_number: invoice.invoice_number,
              status: invoice.status,
              payment_status: invoice.payment_status,
              customer_name:
                (invoice.customers as any)?.name || t("common.unknown"),
              service_count: count || 0,
              grand_total: invoice.grand_total || 0,
              created_at: invoice.created_at,
            };
          })
        );

        setRecentInvoices(invoicesWithCounts);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { labelKey: string; className: string }
    > = {
      draft: {
        labelKey: "invoiceStatus.draft",
        className: "badge-status-pending",
      },
      sent: {
        labelKey: "invoiceStatus.sent",
        className: "badge-status-approved",
      },
      paid: {
        labelKey: "invoiceStatus.paid",
        className: "badge-status-completed",
      },
      cancelled: {
        labelKey: "invoiceStatus.cancelled",
        className: "badge-status-cancelled",
      },
    };
    const config = statusConfig[status] || { labelKey: status, className: "" };
    return (
      <Badge variant="outline" className={config.className}>
        {t(config.labelKey)}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { labelKey: string; className: string }
    > = {
      unpaid: {
        labelKey: "paymentStatus.unpaid",
        className: "badge-status-pending",
      },
      partial: {
        labelKey: "paymentStatus.partial",
        className: "badge-status-progress",
      },
      paid: {
        labelKey: "paymentStatus.paid",
        className: "badge-status-completed",
      },
    };
    const config = statusConfig[status] || { labelKey: status, className: "" };
    return (
      <Badge variant="outline" className={config.className}>
        {t(config.labelKey)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      title: t("dashboard.todayInvoices"),
      value: stats.totalInvoicesToday,
      icon: FileText,
      color: "text-primary",
      bgColor: "bg-primary/10",
      description: `${stats.totalServicesToday} services`,
    },
    {
      title: t("dashboard.pendingServices"),
      value: stats.pendingServices,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      description: "Needs assignment",
    },
    {
      title: t("dashboard.inProgress"),
      value: stats.inProgressServices,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      description: "Active services",
    },
    {
      title: t("dashboard.todayRevenue"),
      value: formatCurrency(stats.todayRevenue),
      icon: DollarSign,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
      description: "Paid invoices",
    },
  ];

  // Render role-specific dashboard
  if (isCashier) {
    return (
      <DashboardLayout>
        <CashierDashboard />
      </DashboardLayout>
    );
  }

  if (isTechnician) {
    return (
      <DashboardLayout>
        <TechnicianDashboard />
      </DashboardLayout>
    );
  }

  // Admin/Manager Dashboard
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("dashboard.welcomeBack")},{" "}
              {employee?.name?.split(" ")[0] || "User"}!
            </h1>
            <p className="text-muted-foreground">
              {t("dashboard.welcomeMessage")}
            </p>
          </div>
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("dashboard.newInvoice")}
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <Card key={index} className="stats-card">
              <div className="stats-card-gradient" />
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Technicians Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {t("dashboard.technicianAvailability")}
              </CardTitle>
              <CardDescription>
                {t("dashboard.techniciansAvailable", {
                  available: stats.availableTechnicians,
                  total: stats.totalTechnicians,
                })}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/technicians">
                {t("dashboard.viewAll")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width:
                      stats.totalTechnicians > 0
                        ? `${
                            (stats.availableTechnicians /
                              stats.totalTechnicians) *
                            100
                          }%`
                        : "0%",
                  }}
                />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {stats.totalTechnicians > 0
                  ? Math.round(
                      (stats.availableTechnicians / stats.totalTechnicians) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                {t("dashboard.recentInvoices")}
              </CardTitle>
              <CardDescription>
                {t("dashboard.latestInvoicesCreated")}
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link to="/invoices">
                {t("dashboard.viewAllInvoices")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : recentInvoices.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">
                  {t("dashboard.noInvoicesYet")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("dashboard.getStartedInvoice")}
                </p>
                <Button asChild className="mt-4">
                  <Link to="/invoices/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t("dashboard.createInvoice")}
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentInvoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    to={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm text-muted-foreground">
                          {invoice.invoice_number}
                        </span>
                        {getStatusBadge(invoice.status)}
                        {getPaymentStatusBadge(invoice.payment_status)}
                      </div>
                      <p className="font-medium truncate">
                        {invoice.customer_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {invoice.service_count} service
                        {invoice.service_count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-right">
                      <p className="font-bold text-primary">
                        {formatCurrency(invoice.grand_total)}
                      </p>
                      <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
