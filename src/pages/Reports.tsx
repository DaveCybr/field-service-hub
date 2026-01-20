import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  Users,
  Package,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import * as XLSX from "xlsx";

const COLORS = {
  primary: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  teal: "#14b8a6",
};

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function Reports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });

  // Overview Data
  const [overview, setOverview] = useState({
    totalRevenue: 0,
    revenueGrowth: 0,
    totalOrders: 0,
    ordersGrowth: 0,
    avgOrderValue: 0,
    totalServices: 0,
    servicesGrowth: 0,
    completionRate: 0,
    outstandingAmount: 0,
    collectionRate: 0,
  });

  // Detailed Data
  const [salesData, setSalesData] = useState({
    dailyRevenue: [] as any[],
    topProducts: [] as any[],
    categoryBreakdown: [] as any[],
    hourlyPattern: [] as any[],
  });

  const [serviceData, setServiceData] = useState({
    statusDistribution: [] as any[],
    priorityBreakdown: [] as any[],
    technicianPerformance: [] as any[],
    dailyCompletion: [] as any[],
  });

  const [financialData, setFinancialData] = useState({
    revenueBreakdown: [] as any[],
    paymentStatus: [] as any[],
    topCustomers: [] as any[],
    agingReceivables: [] as any[],
  });

  const [inventoryData, setInventoryData] = useState({
    stockLevels: [] as any[],
    fastMoving: [] as any[],
    slowMoving: [] as any[],
    alerts: [] as any[],
  });

  useEffect(() => {
    fetchOverviewData();
  }, [dateRange]);

  useEffect(() => {
    if (activeTab === "sales") fetchSalesData();
    else if (activeTab === "services") fetchServiceData();
    else if (activeTab === "financial") fetchFinancialData();
    else if (activeTab === "inventory") fetchInventoryData();
  }, [activeTab, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID").format(num);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();

      // Get previous period for comparison
      const daysDiff = Math.ceil(
        (dateRange.to.getTime() - dateRange.from.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      const prevFrom = new Date(dateRange.from);
      prevFrom.setDate(prevFrom.getDate() - daysDiff);
      const prevFromDate = prevFrom.toISOString();

      // Current period invoices
      const { data: currentInvoices } = await supabase
        .from("invoices")
        .select("grand_total, amount_paid, payment_status")
        .gte("invoice_date", fromDate)
        .lte("invoice_date", toDate);

      // Previous period invoices
      const { data: prevInvoices } = await supabase
        .from("invoices")
        .select("grand_total")
        .gte("invoice_date", prevFromDate)
        .lt("invoice_date", fromDate);

      // Current services
      const { data: currentServices } = await supabase
        .from("invoice_services")
        .select(`*, invoice:invoices!inner(invoice_date)`)
        .gte("invoice.invoice_date", fromDate)
        .lte("invoice.invoice_date", toDate);

      // Previous services
      const { data: prevServices } = await supabase
        .from("invoice_services")
        .select(`*, invoice:invoices!inner(invoice_date)`)
        .gte("invoice.invoice_date", prevFromDate)
        .lt("invoice.invoice_date", fromDate);

      // Calculate metrics
      const totalRevenue =
        currentInvoices?.reduce((sum, inv) => sum + inv.grand_total, 0) || 0;
      const prevRevenue =
        prevInvoices?.reduce((sum, inv) => sum + inv.grand_total, 0) || 0;
      const revenueGrowth =
        prevRevenue > 0
          ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
          : 0;

      const totalOrders = currentInvoices?.length || 0;
      const prevOrders = prevInvoices?.length || 0;
      const ordersGrowth =
        prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0;

      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const totalServices = currentServices?.length || 0;
      const prevTotalServices = prevServices?.length || 0;
      const servicesGrowth =
        prevTotalServices > 0
          ? ((totalServices - prevTotalServices) / prevTotalServices) * 100
          : 0;

      const completedServices =
        currentServices?.filter((s) => s.status === "completed").length || 0;
      const completionRate =
        totalServices > 0 ? (completedServices / totalServices) * 100 : 0;

      const totalPaid =
        currentInvoices?.reduce((sum, inv) => sum + inv.amount_paid, 0) || 0;
      const outstandingAmount = totalRevenue - totalPaid;
      const collectionRate =
        totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0;

      setOverview({
        totalRevenue,
        revenueGrowth,
        totalOrders,
        ordersGrowth,
        avgOrderValue,
        totalServices,
        servicesGrowth,
        completionRate,
        outstandingAmount,
        collectionRate,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const { data: items } = await supabase
        .from("invoice_items")
        .select(
          `
          *,
          invoice:invoices!inner(invoice_date, created_at),
          product:products(name, category)
        `,
        )
        .gte("invoice.invoice_date", dateRange.from.toISOString())
        .lte("invoice.invoice_date", dateRange.to.toISOString())
        .in("invoice.payment_status", ["paid", "partial"]);

      // Daily revenue
      const dailyMap = new Map();
      items?.forEach((item) => {
        const date = new Date(item.invoice.invoice_date).toLocaleDateString(
          "id-ID",
          { month: "short", day: "numeric" },
        );
        dailyMap.set(date, (dailyMap.get(date) || 0) + item.total_price);
      });
      const dailyRevenue = Array.from(dailyMap.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-14); // Last 14 days

      // Top products
      const productMap = new Map();
      items?.forEach((item) => {
        const name = item.product?.name || item.product_name;
        if (!productMap.has(name)) {
          productMap.set(name, { quantity: 0, revenue: 0 });
        }
        const current = productMap.get(name);
        productMap.set(name, {
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + item.total_price,
        });
      });
      const topProducts = Array.from(productMap.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8);

      // Category breakdown
      const categoryMap = new Map();
      items?.forEach((item) => {
        const category = item.product?.category || "Other";
        categoryMap.set(
          category,
          (categoryMap.get(category) || 0) + item.total_price,
        );
      });
      const categoryBreakdown = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      // Hourly pattern
      const hourlyMap = new Map();
      for (let i = 0; i < 24; i++) hourlyMap.set(i, 0);
      items?.forEach((item) => {
        const hour = new Date(item.invoice.created_at).getHours();
        hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + item.total_price);
      });
      const hourlyPattern = Array.from(hourlyMap.entries()).map(
        ([hour, revenue]) => ({ hour: `${hour}:00`, revenue }),
      );

      setSalesData({
        dailyRevenue,
        topProducts,
        categoryBreakdown,
        hourlyPattern,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceData = async () => {
    setLoading(true);
    try {
      const { data: services } = await supabase
        .from("invoice_services")
        .select(
          `
          *,
          invoice:invoices!inner(invoice_date),
          technician:employees(name, rating)
        `,
        )
        .gte("invoice.invoice_date", dateRange.from.toISOString())
        .lte("invoice.invoice_date", dateRange.to.toISOString());

      // Status distribution
      const statusMap = new Map([
        ["completed", 0],
        ["in_progress", 0],
        ["pending", 0],
        ["cancelled", 0],
      ]);
      services?.forEach((s) => {
        statusMap.set(s.status, (statusMap.get(s.status) || 0) + 1);
      });
      const statusDistribution = Array.from(statusMap.entries()).map(
        ([name, value]) => ({ name, value }),
      );

      // Priority breakdown
      const priorityMap = new Map([
        ["urgent", 0],
        ["high", 0],
        ["normal", 0],
        ["low", 0],
      ]);
      services?.forEach((s) => {
        priorityMap.set(s.priority, (priorityMap.get(s.priority) || 0) + 1);
      });
      const priorityBreakdown = Array.from(priorityMap.entries()).map(
        ([name, value]) => ({ name, value }),
      );

      // Technician performance
      const techMap = new Map();
      services?.forEach((s) => {
        if (s.technician) {
          const name = s.technician.name;
          if (!techMap.has(name)) {
            techMap.set(name, {
              jobs: 0,
              completed: 0,
              revenue: 0,
              rating: s.technician.rating || 0,
            });
          }
          const current = techMap.get(name);
          techMap.set(name, {
            jobs: current.jobs + 1,
            completed: current.completed + (s.status === "completed" ? 1 : 0),
            revenue: current.revenue + s.total_cost,
            rating: current.rating,
          });
        }
      });
      const technicianPerformance = Array.from(techMap.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Daily completion
      const dailyMap = new Map();
      services?.forEach((s) => {
        if (s.status === "completed") {
          const date = new Date(s.invoice.invoice_date).toLocaleDateString(
            "id-ID",
            { month: "short", day: "numeric" },
          );
          dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
        }
      });
      const dailyCompletion = Array.from(dailyMap.entries())
        .map(([date, count]) => ({ date, count }))
        .slice(-14);

      setServiceData({
        statusDistribution,
        priorityBreakdown,
        technicianPerformance,
        dailyCompletion,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const { data: invoices } = await supabase
        .from("invoices")
        .select(
          `
          *,
          customer:customers(name),
          items:invoice_items(total_price),
          services:invoice_services(total_cost)
        `,
        )
        .gte("invoice_date", dateRange.from.toISOString())
        .lte("invoice_date", dateRange.to.toISOString());

      // Revenue breakdown (Products vs Services)
      const productRevenue =
        invoices?.reduce(
          (sum, inv) =>
            sum + (inv.items?.reduce((s, i) => s + i.total_price, 0) || 0),
          0,
        ) || 0;
      const serviceRevenue =
        invoices?.reduce(
          (sum, inv) =>
            sum + (inv.services?.reduce((s, i) => s + i.total_cost, 0) || 0),
          0,
        ) || 0;

      const revenueBreakdown = [
        { name: "Products", value: productRevenue },
        { name: "Services", value: serviceRevenue },
      ];

      // Payment status
      const paymentMap = new Map([
        ["paid", 0],
        ["partial", 0],
        ["unpaid", 0],
      ]);
      invoices?.forEach((inv) => {
        paymentMap.set(
          inv.payment_status,
          (paymentMap.get(inv.payment_status) || 0) + inv.grand_total,
        );
      });
      const paymentStatus = Array.from(paymentMap.entries()).map(
        ([name, value]) => ({ name, value }),
      );

      // Top customers
      const customerMap = new Map();
      invoices?.forEach((inv) => {
        const name = inv.customer?.name || "Unknown";
        if (!customerMap.has(name)) {
          customerMap.set(name, { orders: 0, revenue: 0, outstanding: 0 });
        }
        const current = customerMap.get(name);
        customerMap.set(name, {
          orders: current.orders + 1,
          revenue: current.revenue + inv.grand_total,
          outstanding:
            current.outstanding + (inv.grand_total - inv.amount_paid),
        });
      });
      const topCustomers = Array.from(customerMap.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Aging receivables
      const now = new Date();
      const aging = {
        current: 0,
        days30: 0,
        days60: 0,
        days90: 0,
        over90: 0,
      };

      invoices?.forEach((inv) => {
        if (inv.payment_status !== "paid") {
          const outstanding = inv.grand_total - inv.amount_paid;
          const daysOld = Math.floor(
            (now.getTime() - new Date(inv.invoice_date).getTime()) /
              (1000 * 60 * 60 * 24),
          );

          if (daysOld <= 30) aging.current += outstanding;
          else if (daysOld <= 60) aging.days30 += outstanding;
          else if (daysOld <= 90) aging.days60 += outstanding;
          else aging.over90 += outstanding;
        }
      });

      const agingReceivables = [
        { name: "0-30 days", value: aging.current },
        { name: "31-60 days", value: aging.days30 },
        { name: "61-90 days", value: aging.days60 },
        { name: ">90 days", value: aging.over90 },
      ];

      setFinancialData({
        revenueBreakdown,
        paymentStatus,
        topCustomers,
        agingReceivables,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const { data: products } = await supabase
        .from("products")
        .select(
          `
          *,
          transactions:inventory_transactions(quantity, transaction_date)
        `,
        )
        .eq("is_active", true);

      // Stock levels by category
      const categoryMap = new Map();
      products?.forEach((p) => {
        if (!categoryMap.has(p.category)) {
          categoryMap.set(p.category, { stock: 0, value: 0 });
        }
        const current = categoryMap.get(p.category);
        categoryMap.set(p.category, {
          stock: current.stock + p.stock,
          value: current.value + p.stock * p.sell_price,
        });
      });
      const stockLevels = Array.from(categoryMap.entries()).map(
        ([name, stats]) => ({ name, ...stats }),
      );

      // Fast moving (high sales volume)
      const fastMoving =
        products
          ?.filter((p) => {
            const totalSold =
              p.transactions?.reduce(
                (sum, t) => (t.quantity < 0 ? sum + Math.abs(t.quantity) : sum),
                0,
              ) || 0;
            return totalSold > 10; // Sold more than 10 units
          })
          .map((p) => ({
            name: p.name,
            stock: p.stock,
            sold:
              p.transactions?.reduce(
                (sum, t) => (t.quantity < 0 ? sum + Math.abs(t.quantity) : sum),
                0,
              ) || 0,
          }))
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 10) || [];

      // Slow moving (low sales)
      const slowMoving =
        products
          ?.filter((p) => {
            const totalSold =
              p.transactions?.reduce(
                (sum, t) => (t.quantity < 0 ? sum + Math.abs(t.quantity) : sum),
                0,
              ) || 0;
            return p.stock > 0 && totalSold < 5;
          })
          .map((p) => ({
            name: p.name,
            stock: p.stock,
            value: p.stock * p.sell_price,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10) || [];

      // Alerts
      const alerts =
        products
          ?.filter((p) => p.stock <= p.min_stock_threshold)
          .map((p) => ({
            name: p.name,
            stock: p.stock,
            threshold: p.min_stock_threshold,
            severity: p.stock === 0 ? "critical" : "warning",
          })) || [];

      setInventoryData({ stockLevels, fastMoving, slowMoving, alerts });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Overview sheet
    const overviewData = [
      ["Metric", "Value", "Growth"],
      [
        "Total Revenue",
        overview.totalRevenue,
        formatPercent(overview.revenueGrowth),
      ],
      [
        "Total Orders",
        overview.totalOrders,
        formatPercent(overview.ordersGrowth),
      ],
      ["Avg Order Value", overview.avgOrderValue, "-"],
      [
        "Total Services",
        overview.totalServices,
        formatPercent(overview.servicesGrowth),
      ],
      ["Completion Rate", `${overview.completionRate.toFixed(1)}%`, "-"],
      ["Outstanding", overview.outstandingAmount, "-"],
      ["Collection Rate", `${overview.collectionRate.toFixed(1)}%`, "-"],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, ws1, "Overview");

    if (activeTab === "sales" && salesData.topProducts.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(salesData.topProducts);
      XLSX.utils.book_append_sheet(wb, ws2, "Top Products");
    }

    if (activeTab === "financial" && financialData.topCustomers.length > 0) {
      const ws3 = XLSX.utils.json_to_sheet(financialData.topCustomers);
      XLSX.utils.book_append_sheet(wb, ws3, "Top Customers");
    }

    XLSX.writeFile(wb, `REKAMTEKNIK_Report_${Date.now()}.xlsx`);
    toast({
      title: "Export Successful",
      description: "Report exported to Excel",
    });
  };

  const StatCard = ({ title, value, growth, icon: Icon, trend }: any) => (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {growth !== undefined && (
          <div className="flex items-center gap-1 mt-1">
            {growth >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
            <span
              className={`text-xs font-medium ${growth >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatPercent(growth)}
            </span>
            <span className="text-xs text-muted-foreground">
              vs prev period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground">
              {dateRange.from.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
              })}{" "}
              -{" "}
              {dateRange.to.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <Button onClick={exportToExcel} size="lg">
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="space-y-6">
                {/* Key Metrics */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Revenue"
                    value={formatCurrency(overview.totalRevenue)}
                    growth={overview.revenueGrowth}
                    icon={DollarSign}
                  />
                  <StatCard
                    title="Total Orders"
                    value={formatNumber(overview.totalOrders)}
                    growth={overview.ordersGrowth}
                    icon={FileText}
                  />
                  <StatCard
                    title="Avg Order Value"
                    value={formatCurrency(overview.avgOrderValue)}
                    icon={TrendingUp}
                  />
                  <StatCard
                    title="Collection Rate"
                    value={`${overview.collectionRate.toFixed(1)}%`}
                    icon={Target}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    title="Total Services"
                    value={formatNumber(overview.totalServices)}
                    growth={overview.servicesGrowth}
                    icon={FileText}
                  />
                  <StatCard
                    title="Completion Rate"
                    value={`${overview.completionRate.toFixed(1)}%`}
                    icon={CheckCircle2}
                  />
                  <StatCard
                    title="Outstanding"
                    value={formatCurrency(overview.outstandingAmount)}
                    icon={AlertTriangle}
                  />
                  <StatCard
                    title="Active Period"
                    value={`${Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))} Days`}
                    icon={Calendar}
                  />
                </div>

                {/* Performance Indicators */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        Business Health Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              Revenue Growth
                            </span>
                            <span
                              className={`text-sm font-bold ${overview.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {formatPercent(overview.revenueGrowth)}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${overview.revenueGrowth >= 0 ? "bg-green-600" : "bg-red-600"}`}
                              style={{
                                width: `${Math.min(Math.abs(overview.revenueGrowth), 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              Completion Rate
                            </span>
                            <span className="text-sm font-bold text-blue-600">
                              {overview.completionRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${overview.completionRate}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">
                              Collection Rate
                            </span>
                            <span className="text-sm font-bold text-purple-600">
                              {overview.collectionRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${overview.collectionRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        Quick Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-medium">
                              Services Completed
                            </span>
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            {Math.round(
                              overview.totalServices *
                                (overview.completionRate / 100),
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-medium">
                              In Progress
                            </span>
                          </div>
                          <span className="text-lg font-bold text-blue-600">
                            {Math.round(
                              overview.totalServices *
                                (1 - overview.completionRate / 100),
                            )}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            <span className="text-sm font-medium">
                              Outstanding Balance
                            </span>
                          </div>
                          <span className="text-lg font-bold text-orange-600">
                            {formatCurrency(overview.outstandingAmount)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* SALES TAB */}
              <TabsContent value="sales" className="space-y-6">
                {/* Revenue Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend (Last 14 Days)</CardTitle>
                    <CardDescription>Daily revenue performance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={salesData.dailyRevenue}>
                        <defs>
                          <linearGradient
                            id="colorRevenue"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={COLORS.primary}
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor={COLORS.primary}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-muted"
                        />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis
                          className="text-xs"
                          tickFormatter={(value) =>
                            `${(value / 1000000).toFixed(1)}M`
                          }
                        />
                        <Tooltip
                          formatter={(value: any) => [
                            formatCurrency(value),
                            "Revenue",
                          ]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke={COLORS.primary}
                          fillOpacity={1}
                          fill="url(#colorRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Top Products */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Products</CardTitle>
                      <CardDescription>Best sellers by revenue</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={salesData.topProducts.slice(0, 6)}
                          layout="vertical"
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis
                            type="number"
                            className="text-xs"
                            tickFormatter={(value) =>
                              `${(value / 1000000).toFixed(1)}M`
                            }
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            className="text-xs"
                            width={100}
                          />
                          <Tooltip
                            formatter={(value: any) => [
                              formatCurrency(value),
                              "Revenue",
                            ]}
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                          <Bar
                            dataKey="revenue"
                            fill={COLORS.success}
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Category Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Category Distribution</CardTitle>
                      <CardDescription>
                        Revenue by product category
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={salesData.categoryBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {salesData.categoryBreakdown.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Hourly Pattern */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Sales Pattern by Hour</CardTitle>
                      <CardDescription>
                        Peak sales hours analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={salesData.hourlyPattern}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis dataKey="hour" className="text-xs" />
                          <YAxis
                            className="text-xs"
                            tickFormatter={(value) =>
                              `${(value / 1000000).toFixed(1)}M`
                            }
                          />
                          <Tooltip
                            formatter={(value: any) => [
                              formatCurrency(value),
                              "Revenue",
                            ]}
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                          <Bar
                            dataKey="revenue"
                            fill={COLORS.purple}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Product Performance Table */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Product Performance Detail</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">
                              Units Sold
                            </TableHead>
                            <TableHead className="text-right">
                              Revenue
                            </TableHead>
                            <TableHead className="text-right">
                              Avg Price
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {salesData.topProducts.map((product, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {idx + 1}
                              </TableCell>
                              <TableCell className="font-medium">
                                {product.name}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatNumber(product.quantity)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(product.revenue)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(
                                  product.revenue / product.quantity,
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* SERVICES TAB */}
              <TabsContent value="services" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Status Distribution */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Service Status</CardTitle>
                      <CardDescription>
                        Current service distribution
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={serviceData.statusDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {serviceData.statusDistribution.map(
                              (entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    CHART_COLORS[index % CHART_COLORS.length]
                                  }
                                />
                              ),
                            )}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Priority Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Priority Levels</CardTitle>
                      <CardDescription>Services by priority</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={serviceData.priorityBreakdown}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                          <Bar
                            dataKey="value"
                            fill={COLORS.warning}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Daily Completion */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Completion Trend</CardTitle>
                      <CardDescription>
                        Services completed per day (Last 14 days)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={serviceData.dailyCompletion}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="count"
                            stroke={COLORS.success}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Technician Performance */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Technician Performance</CardTitle>
                      <CardDescription>
                        Top performers by revenue
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Technician</TableHead>
                            <TableHead className="text-right">
                              Total Jobs
                            </TableHead>
                            <TableHead className="text-right">
                              Completed
                            </TableHead>
                            <TableHead className="text-right">
                              Completion %
                            </TableHead>
                            <TableHead className="text-right">
                              Revenue
                            </TableHead>
                            <TableHead className="text-right">Rating</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {serviceData.technicianPerformance.map(
                            (tech, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {tech.name}
                                </TableCell>
                                <TableCell className="text-right">
                                  {tech.jobs}
                                </TableCell>
                                <TableCell className="text-right">
                                  {tech.completed}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge
                                    variant={
                                      tech.completed / tech.jobs >= 0.8
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {(
                                      (tech.completed / tech.jobs) *
                                      100
                                    ).toFixed(0)}
                                    %
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(tech.revenue)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="text-yellow-600">★</span>{" "}
                                  {tech.rating.toFixed(1)}
                                </TableCell>
                              </TableRow>
                            ),
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* FINANCIAL TAB */}
              <TabsContent value="financial" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Revenue Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Sources</CardTitle>
                      <CardDescription>Products vs Services</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={financialData.revenueBreakdown}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, value }) =>
                              `${name}: ${formatCurrency(value)}`
                            }
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell fill={COLORS.primary} />
                            <Cell fill={COLORS.success} />
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Payment Status */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Status</CardTitle>
                      <CardDescription>Collection breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={financialData.paymentStatus}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis
                            className="text-xs"
                            tickFormatter={(value) =>
                              `${(value / 1000000).toFixed(1)}M`
                            }
                          />
                          <Tooltip
                            formatter={(value: any) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                          <Bar
                            dataKey="value"
                            fill={COLORS.teal}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Aging Receivables */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Aging Receivables</CardTitle>
                      <CardDescription>
                        Outstanding balances by age
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={financialData.agingReceivables}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis
                            className="text-xs"
                            tickFormatter={(value) =>
                              `${(value / 1000000).toFixed(1)}M`
                            }
                          />
                          <Tooltip
                            formatter={(value: any) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                          <Bar
                            dataKey="value"
                            fill={COLORS.danger}
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Top Customers */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Top Customers</CardTitle>
                      <CardDescription>
                        Best customers by revenue
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Orders</TableHead>
                            <TableHead className="text-right">
                              Total Revenue
                            </TableHead>
                            <TableHead className="text-right">
                              Outstanding
                            </TableHead>
                            <TableHead className="text-right">
                              Payment Rate
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {financialData.topCustomers.map((customer, idx) => {
                            const paymentRate =
                              customer.revenue > 0
                                ? ((customer.revenue - customer.outstanding) /
                                    customer.revenue) *
                                  100
                                : 0;
                            return (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {customer.name}
                                </TableCell>
                                <TableCell className="text-right">
                                  {customer.orders}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(customer.revenue)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span
                                    className={
                                      customer.outstanding > 0
                                        ? "text-orange-600"
                                        : "text-green-600"
                                    }
                                  >
                                    {formatCurrency(customer.outstanding)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge
                                    variant={
                                      paymentRate >= 80
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {paymentRate.toFixed(0)}%
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* INVENTORY TAB */}
              <TabsContent value="inventory" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Stock Levels by Category */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Stock by Category</CardTitle>
                      <CardDescription>Inventory distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={inventoryData.stockLevels}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            className="stroke-muted"
                          />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip
                            formatter={(value: any, name: string) =>
                              name === "value" ? formatCurrency(value) : value
                            }
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                          <Bar
                            dataKey="stock"
                            fill={COLORS.primary}
                            name="Units"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Stock Value by Category */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Stock Value</CardTitle>
                      <CardDescription>
                        Value distribution by category
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={inventoryData.stockLevels}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {inventoryData.stockLevels.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => formatCurrency(value)}
                            contentStyle={{
                              backgroundColor: "hsl(var(--background))",
                              border: "1px solid hsl(var(--border))",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Stock Alerts */}
                  {inventoryData.alerts.length > 0 && (
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-600" />
                          Stock Alerts ({inventoryData.alerts.length})
                        </CardTitle>
                        <CardDescription>
                          Low stock and out of stock items
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {inventoryData.alerts
                            .slice(0, 6)
                            .map((alert, idx) => (
                              <div
                                key={idx}
                                className={`p-3 rounded-lg border-2 ${
                                  alert.severity === "critical"
                                    ? "border-red-600 bg-red-50 dark:bg-red-950"
                                    : "border-orange-600 bg-orange-50 dark:bg-orange-950"
                                }`}
                              >
                                <div className="font-medium text-sm">
                                  {alert.name}
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    Stock: {alert.stock} / Min:{" "}
                                    {alert.threshold}
                                  </span>
                                  <Badge
                                    variant={
                                      alert.severity === "critical"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {alert.severity === "critical"
                                      ? "Out of Stock"
                                      : "Low Stock"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Fast Moving Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Fast Moving Items</CardTitle>
                      <CardDescription>High volume products</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right">Sold</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryData.fastMoving
                            .slice(0, 5)
                            .map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">
                                  {item.name}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.stock}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge>{item.sold} units</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Slow Moving Items */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Slow Moving Items</CardTitle>
                      <CardDescription>
                        Consider promotions or discounts
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Stock</TableHead>
                            <TableHead className="text-right">Value</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inventoryData.slowMoving
                            .slice(0, 5)
                            .map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-medium">
                                  {item.name}
                                </TableCell>
                                <TableCell className="text-right">
                                  {item.stock}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(item.value)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
