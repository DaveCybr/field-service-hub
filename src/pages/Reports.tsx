import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Download,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Wrench,
  Package,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  BarChart2,
  ShoppingCart,
  Star,
  Activity,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

// ── Types ────────────────────────────────────────────────────────────────────
interface OverviewData {
  totalRevenue: number;
  prevRevenue: number;
  totalInvoices: number;
  prevInvoices: number;
  totalServices: number;
  prevServices: number;
  completedServices: number;
  avgOrderValue: number;
  totalPaid: number;
  outstanding: number;
  collectionRate: number;
  completionRate: number;
  revenueGrowth: number;
  invoiceGrowth: number;
  serviceGrowth: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  invoices: number;
}
interface TopProduct {
  name: string;
  qty: number;
  revenue: number;
  category: string;
}
interface TechPerf {
  id: string;
  name: string;
  jobs: number;
  completed: number;
  revenue: number;
  rating: number;
  avgDuration: number;
}
interface TopCustomer {
  name: string;
  orders: number;
  revenue: number;
  outstanding: number;
  category: string;
}
interface StockAlert {
  id: string;
  name: string;
  sku: string;
  stock: number;
  threshold: number;
  category: string;
  severity: string;
}
interface PaymentMethod {
  method: string;
  count: number;
  amount: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];
const STATUS_MAP: Record<string, string> = {
  pending_assignment: "Menunggu Penugasan",
  pending_approval: "Menunggu Persetujuan",
  approved: "Disetujui",
  in_progress: "Dalam Proses",
  completed: "Selesai",
  completed_paid: "Selesai & Dibayar",
  cancelled: "Dibatalkan",
};
const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700 border-red-200" },
  high: {
    label: "Tinggi",
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  normal: {
    label: "Normal",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  low: {
    label: "Rendah",
    color: "bg-slate-100 text-slate-600 border-slate-200",
  },
};
const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  paid: {
    label: "Lunas",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  partial: {
    label: "Sebagian",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  unpaid: {
    label: "Belum Bayar",
    color: "bg-red-100 text-red-700 border-red-200",
  },
  overdue: {
    label: "Jatuh Tempo",
    color: "bg-red-100 text-red-700 border-red-200",
  },
};
const CATEGORY_LABELS: Record<string, string> = {
  spare_parts: "Spare Parts",
  consumables: "Consumables",
  equipment: "Equipment",
  accessories: "Accessories",
  service_labor: "Jasa",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const growth = (cur: number, prev: number) =>
  prev > 0 ? ((cur - prev) / prev) * 100 : cur > 0 ? 100 : 0;

// ── Sub-components ─────────────────────────────────────────────────────────────
function KPICard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  trendLabel,
  accent = "blue",
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  trend?: number;
  trendLabel?: string;
  accent?: "blue" | "green" | "amber" | "red" | "violet";
}) {
  const accentMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="stat-card bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
          {title}
        </p>
        <div
          className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center",
            accentMap[accent],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 tabular-nums leading-tight">
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1">
          {trend >= 0 ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
          )}
          <span
            className={cn(
              "text-xs font-semibold",
              trend >= 0 ? "text-emerald-600" : "text-red-600",
            )}
          >
            {pct(trend)}
          </span>
          {trendLabel && (
            <span className="text-xs text-slate-400">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  sub,
  children,
  className,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 overflow-hidden",
        className,
      )}
    >
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded", className)} />;
}

function ProgressBar({
  value,
  max,
  color = "bg-blue-500",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label, currency = true }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {currency ? fmt(p.value) : fmtNum(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── TABS CONFIG ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview", icon: BarChart2 },
  { id: "revenue", label: "Revenue", icon: DollarSign },
  { id: "services", label: "Servis", icon: Wrench },
  { id: "customers", label: "Pelanggan", icon: Users },
  { id: "inventory", label: "Inventaris", icon: Package },
];

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function Reports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  // State per tab
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentStatusData, setPaymentStatusData] = useState<any[]>([]);
  const [techPerf, setTechPerf] = useState<TechPerf[]>([]);
  const [serviceStatusDist, setServiceStatusDist] = useState<any[]>([]);
  const [priorityDist, setPriorityDist] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [inventoryValue, setInventoryValue] = useState<any[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<any[]>([]);

  // ── Fetch Overview ─────────────────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const from = dateRange.from.toISOString();
      const to = new Date(dateRange.to.setHours(23, 59, 59, 999)).toISOString();
      const daysDiff =
        Math.ceil(
          (dateRange.to.getTime() - dateRange.from.getTime()) / 86400000,
        ) + 1;
      const prevFrom = subDays(dateRange.from, daysDiff).toISOString();

      const [
        { data: cur },
        { data: prev },
        { data: curSvc },
        { data: prevSvc },
        { data: payments },
      ] = await Promise.all([
        supabase
          .from("invoices")
          .select(
            "grand_total,amount_paid,payment_status,services_total,items_total",
          )
          .gte("invoice_date", from)
          .lte("invoice_date", to),
        supabase
          .from("invoices")
          .select("grand_total")
          .gte("invoice_date", prevFrom)
          .lt("invoice_date", from),
        supabase
          .from("invoice_services")
          .select("status,total_cost,actual_duration_minutes")
          .gte("created_at", from)
          .lte("created_at", to),
        supabase
          .from("invoice_services")
          .select("id")
          .gte("created_at", prevFrom)
          .lt("created_at", from),
        supabase
          .from("invoice_payments")
          .select("amount,payment_method")
          .gte("payment_date", from)
          .lte("payment_date", to),
      ]);

      const totalRevenue = cur?.reduce((s, i) => s + i.grand_total, 0) ?? 0;
      const prevRevenue = prev?.reduce((s, i) => s + i.grand_total, 0) ?? 0;
      const totalPaid = cur?.reduce((s, i) => s + i.amount_paid, 0) ?? 0;
      const totalInvoices = cur?.length ?? 0;
      const prevInvoices = prev?.length ?? 0;
      const totalServices = curSvc?.length ?? 0;
      const prevServices = prevSvc?.length ?? 0;
      const completed =
        curSvc?.filter((s) => s.status === "completed").length ?? 0;

      // Payment methods
      const pmMap = new Map<string, { count: number; amount: number }>();
      payments?.forEach((p) => {
        const k = p.payment_method;
        const cur = pmMap.get(k) ?? { count: 0, amount: 0 };
        pmMap.set(k, { count: cur.count + 1, amount: cur.amount + p.amount });
      });
      setPaymentMethods(
        Array.from(pmMap.entries()).map(([method, v]) => ({ method, ...v })),
      );

      // Payment status distribution
      const psMap = new Map<string, number>();
      cur?.forEach((i) =>
        psMap.set(
          i.payment_status,
          (psMap.get(i.payment_status) ?? 0) + i.grand_total,
        ),
      );
      setPaymentStatusData(
        Array.from(psMap.entries()).map(([name, value]) => ({
          name: PAYMENT_STATUS_MAP[name]?.label ?? name,
          value,
        })),
      );

      setOverview({
        totalRevenue,
        prevRevenue,
        totalInvoices,
        prevInvoices,
        totalServices,
        prevServices,
        completedServices: completed,
        avgOrderValue: totalInvoices > 0 ? totalRevenue / totalInvoices : 0,
        totalPaid,
        outstanding: totalRevenue - totalPaid,
        collectionRate: totalRevenue > 0 ? (totalPaid / totalRevenue) * 100 : 0,
        completionRate:
          totalServices > 0 ? (completed / totalServices) * 100 : 0,
        revenueGrowth: growth(totalRevenue, prevRevenue),
        invoiceGrowth: growth(totalInvoices, prevInvoices),
        serviceGrowth: growth(totalServices, prevServices),
      });
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal memuat overview",
        description: e.message,
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // ── Fetch Revenue Tab ──────────────────────────────────────────────────────
  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    try {
      const from = dateRange.from.toISOString();
      const to = new Date(dateRange.to.setHours(23, 59, 59, 999)).toISOString();

      const [{ data: invoices }, { data: items }] = await Promise.all([
        supabase
          .from("invoices")
          .select("invoice_date,grand_total,payment_status")
          .gte("invoice_date", from)
          .lte("invoice_date", to)
          .order("invoice_date"),
        supabase
          .from("invoice_items")
          .select(
            "product_name,quantity,total_price,product:products(category)",
          )
          .gte("created_at", from)
          .lte("created_at", to),
      ]);

      // Daily revenue
      const dayMap = new Map<string, { revenue: number; invoices: number }>();
      invoices?.forEach((inv) => {
        const d = format(new Date(inv.invoice_date), "dd MMM", {
          locale: localeId,
        });
        const cur = dayMap.get(d) ?? { revenue: 0, invoices: 0 };
        dayMap.set(d, {
          revenue: cur.revenue + inv.grand_total,
          invoices: cur.invoices + 1,
        });
      });
      setDailyRevenue(
        Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v })),
      );

      // Top products
      const prodMap = new Map<
        string,
        { qty: number; revenue: number; category: string }
      >();
      items?.forEach((it: any) => {
        const name = it.product_name;
        const cat = it.product?.category ?? "other";
        const cur = prodMap.get(name) ?? { qty: 0, revenue: 0, category: cat };
        prodMap.set(name, {
          qty: cur.qty + it.quantity,
          revenue: cur.revenue + it.total_price,
          category: cat,
        });
      });
      setTopProducts(
        Array.from(prodMap.entries())
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
      );

      // Category revenue
      const catMap = new Map<string, number>();
      items?.forEach((it: any) => {
        const cat = it.product?.category ?? "other";
        catMap.set(cat, (catMap.get(cat) ?? 0) + it.total_price);
      });
      setCategoryRevenue(
        Array.from(catMap.entries()).map(([name, value]) => ({
          name: CATEGORY_LABELS[name] ?? name,
          value,
        })),
      );
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal memuat data revenue",
        description: e.message,
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // ── Fetch Services Tab ─────────────────────────────────────────────────────
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const from = dateRange.from.toISOString();
      const to = new Date(dateRange.to.setHours(23, 59, 59, 999)).toISOString();

      const { data: svcs } = await supabase
        .from("invoice_services")
        .select(
          `
          id, status, priority, total_cost, actual_duration_minutes,
          estimated_duration_minutes, scheduled_date, created_at,
          technician:employees!invoice_services_assigned_technician_id_fkey(
            id, name, rating, total_jobs_completed
          )
        `,
        )
        .gte("created_at", from)
        .lte("created_at", to);

      // Status distribution
      const stMap = new Map<string, number>();
      svcs?.forEach((s) => stMap.set(s.status, (stMap.get(s.status) ?? 0) + 1));
      setServiceStatusDist(
        Array.from(stMap.entries()).map(([name, value]) => ({
          name: STATUS_MAP[name] ?? name,
          value,
        })),
      );

      // Priority distribution
      const prMap = new Map<string, number>();
      svcs?.forEach((s) =>
        prMap.set(s.priority, (prMap.get(s.priority) ?? 0) + 1),
      );
      setPriorityDist(
        Array.from(prMap.entries()).map(([name, value]) => ({
          name: PRIORITY_MAP[name]?.label ?? name,
          value,
        })),
      );

      // Technician performance
      const techMap = new Map<string, TechPerf>();
      svcs?.forEach((s: any) => {
        if (!s.technician) return;
        const t = s.technician;
        const cur = techMap.get(t.id) ?? {
          id: t.id,
          name: t.name,
          jobs: 0,
          completed: 0,
          revenue: 0,
          rating: t.rating ?? 0,
          avgDuration: 0,
        };
        techMap.set(t.id, {
          ...cur,
          jobs: cur.jobs + 1,
          completed: cur.completed + (s.status === "completed" ? 1 : 0),
          revenue: cur.revenue + s.total_cost,
          avgDuration: cur.avgDuration + (s.actual_duration_minutes ?? 0),
        });
      });
      setTechPerf(
        Array.from(techMap.values())
          .map((t) => ({
            ...t,
            avgDuration: t.jobs > 0 ? Math.round(t.avgDuration / t.jobs) : 0,
          }))
          .sort((a, b) => b.completed - a.completed),
      );
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal memuat data servis",
        description: e.message,
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // ── Fetch Customers Tab ────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const from = dateRange.from.toISOString();
      const to = new Date(dateRange.to.setHours(23, 59, 59, 999)).toISOString();

      const { data: invoices } = await supabase
        .from("invoices")
        .select(
          "grand_total,amount_paid,customer:customers(id,name,category,current_outstanding)",
        )
        .gte("invoice_date", from)
        .lte("invoice_date", to);

      const custMap = new Map<string, TopCustomer>();
      invoices?.forEach((inv: any) => {
        if (!inv.customer) return;
        const c = inv.customer;
        const cur = custMap.get(c.id) ?? {
          name: c.name,
          orders: 0,
          revenue: 0,
          outstanding: c.current_outstanding ?? 0,
          category: c.category,
        };
        custMap.set(c.id, {
          ...cur,
          orders: cur.orders + 1,
          revenue: cur.revenue + inv.grand_total,
        });
      });
      setTopCustomers(
        Array.from(custMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 15),
      );
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal memuat data pelanggan",
        description: e.message,
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // ── Fetch Inventory Tab ────────────────────────────────────────────────────
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const { data: products } = await supabase
        .from("products")
        .select(
          "id,name,sku,category,stock,min_stock_threshold,cost_price,sell_price,is_active",
        )
        .eq("is_active", true);

      // Stock alerts
      const alerts = (products ?? [])
        .filter((p) => p.stock <= p.min_stock_threshold)
        .map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          threshold: p.min_stock_threshold,
          category: p.category,
          severity: p.stock === 0 ? "critical" : "warning",
        }))
        .sort((a, b) => a.stock - b.stock);
      setStockAlerts(alerts);

      // Inventory value by category
      const catMap = new Map<
        string,
        { items: number; value: number; cost: number }
      >();
      products?.forEach((p) => {
        const cat = p.category;
        const cur = catMap.get(cat) ?? { items: 0, value: 0, cost: 0 };
        catMap.set(cat, {
          items: cur.items + 1,
          value: cur.value + p.stock * p.sell_price,
          cost: cur.cost + p.stock * p.cost_price,
        });
      });
      setInventoryValue(
        Array.from(catMap.entries()).map(([cat, v]) => ({
          name: CATEGORY_LABELS[cat] ?? cat,
          ...v,
        })),
      );
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal memuat data inventaris",
        description: e.message,
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);
  useEffect(() => {
    if (activeTab === "revenue") fetchRevenue();
    if (activeTab === "services") fetchServices();
    if (activeTab === "customers") fetchCustomers();
    if (activeTab === "inventory") fetchInventory();
  }, [activeTab, fetchRevenue, fetchServices, fetchCustomers, fetchInventory]);

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    if (overview) {
      const ws = XLSX.utils.aoa_to_sheet([
        ["Metrik", "Nilai"],
        ["Total Revenue", overview.totalRevenue],
        ["Total Invoice", overview.totalInvoices],
        ["Total Servis", overview.totalServices],
        ["Servis Selesai", overview.completedServices],
        ["Completion Rate (%)", overview.completionRate.toFixed(1)],
        ["Collection Rate (%)", overview.collectionRate.toFixed(1)],
        ["Rata-rata Nilai Order", overview.avgOrderValue],
        ["Outstanding", overview.outstanding],
      ]);
      XLSX.utils.book_append_sheet(wb, ws, "Overview");
    }
    if (topProducts.length) {
      const ws = XLSX.utils.json_to_sheet(
        topProducts.map((p) => ({
          Produk: p.name,
          Kategori: CATEGORY_LABELS[p.category] ?? p.category,
          Qty: p.qty,
          Revenue: p.revenue,
        })),
      );
      XLSX.utils.book_append_sheet(wb, ws, "Top Produk");
    }
    if (techPerf.length) {
      const ws = XLSX.utils.json_to_sheet(
        techPerf.map((t) => ({
          Teknisi: t.name,
          "Total Job": t.jobs,
          Selesai: t.completed,
          "Completion %":
            t.jobs > 0 ? ((t.completed / t.jobs) * 100).toFixed(0) + "%" : "0%",
          Revenue: t.revenue,
          Rating: t.rating.toFixed(1),
          "Avg Durasi (menit)": t.avgDuration,
        })),
      );
      XLSX.utils.book_append_sheet(wb, ws, "Performa Teknisi");
    }
    if (topCustomers.length) {
      const ws = XLSX.utils.json_to_sheet(
        topCustomers.map((c) => ({
          Pelanggan: c.name,
          Kategori: c.category,
          "Total Order": c.orders,
          Revenue: c.revenue,
          Outstanding: c.outstanding,
        })),
      );
      XLSX.utils.book_append_sheet(wb, ws, "Top Pelanggan");
    }
    XLSX.writeFile(
      wb,
      `Laporan_REKAMTEKNIK_${format(new Date(), "yyyyMMdd")}.xlsx`,
    );
    toast({
      title: "Export berhasil",
      description: "File Excel telah diunduh.",
    });
  };

  const handleRefresh = () => {
    fetchOverview();
    if (activeTab === "revenue") fetchRevenue();
    if (activeTab === "services") fetchServices();
    if (activeTab === "customers") fetchCustomers();
    if (activeTab === "inventory") fetchInventory();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <style>{`
        .stat-card { transition: box-shadow .18s, transform .18s; }
        .stat-card:hover { box-shadow: 0 8px 32px -4px rgba(15,23,42,.10); transform: translateY(-1px); }
        .shimmer { background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .tab-btn { transition: all .15s; }
        .tab-btn.active { background:#0f172a; color:#fff; }
        .tab-btn:not(.active):hover { background:#f1f5f9; }
      `}</style>

      <div
        className="space-y-6"
        style={{ fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}
      >
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Administrasi Sistem
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Laporan & Analitik
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {format(dateRange.from, "d MMM yyyy", { locale: localeId })} –{" "}
              {format(dateRange.to, "d MMM yyyy", { locale: localeId })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 border border-slate-200"
              onClick={handleRefresh}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4 text-slate-500",
                  loading && "animate-spin",
                )}
              />
            </Button>
            <Button
              size="sm"
              className="h-9 gap-2 bg-slate-900 hover:bg-slate-800"
              onClick={handleExport}
            >
              <Download className="h-3.5 w-3.5" />
              Export Excel
            </Button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "tab-btn flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg border",
                activeTab === tab.id
                  ? "active border-slate-900"
                  : "border-slate-200 text-slate-600",
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {loading || !overview ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
                  >
                    <Shimmer className="h-3 w-24" />
                    <Shimmer className="h-8 w-32" />
                    <Shimmer className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* KPI Row 1 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KPICard
                    title="Total Revenue"
                    value={fmt(overview.totalRevenue)}
                    sub={`${fmtNum(overview.totalInvoices)} invoice`}
                    icon={DollarSign}
                    trend={overview.revenueGrowth}
                    trendLabel="vs periode lalu"
                    accent="green"
                  />
                  <KPICard
                    title="Rata-rata Nilai Order"
                    value={fmt(overview.avgOrderValue)}
                    sub="per invoice"
                    icon={ShoppingCart}
                    accent="blue"
                  />
                  <KPICard
                    title="Total Servis"
                    value={fmtNum(overview.totalServices)}
                    sub={`${fmtNum(overview.completedServices)} selesai`}
                    icon={Wrench}
                    trend={overview.serviceGrowth}
                    trendLabel="vs periode lalu"
                    accent="violet"
                  />
                  <KPICard
                    title="Completion Rate"
                    value={`${overview.completionRate.toFixed(1)}%`}
                    sub="servis diselesaikan"
                    icon={CheckCircle2}
                    accent={overview.completionRate >= 80 ? "green" : "amber"}
                  />
                </div>

                {/* KPI Row 2 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <KPICard
                    title="Total Dibayar"
                    value={fmt(overview.totalPaid)}
                    sub="pembayaran masuk"
                    icon={Target}
                    accent="green"
                  />
                  <KPICard
                    title="Outstanding"
                    value={fmt(overview.outstanding)}
                    sub="belum terbayar"
                    icon={AlertTriangle}
                    accent={overview.outstanding > 0 ? "red" : "green"}
                  />
                  <KPICard
                    title="Collection Rate"
                    value={`${overview.collectionRate.toFixed(1)}%`}
                    sub="tingkat koleksi"
                    icon={Activity}
                    accent={overview.collectionRate >= 80 ? "green" : "amber"}
                  />
                  <KPICard
                    title="Invoice Baru"
                    value={fmtNum(overview.totalInvoices)}
                    sub="dalam periode ini"
                    icon={FileText}
                    trend={overview.invoiceGrowth}
                    trendLabel="vs periode lalu"
                    accent="blue"
                  />
                </div>

                {/* Health Score */}
                <div className="grid md:grid-cols-2 gap-4">
                  <SectionCard
                    title="Business Health Score"
                    sub="Indikator kinerja bisnis"
                  >
                    <div className="space-y-4">
                      {[
                        {
                          label: "Revenue Growth",
                          val: Math.min(Math.abs(overview.revenueGrowth), 100),
                          display: pct(overview.revenueGrowth),
                          color:
                            overview.revenueGrowth >= 0
                              ? "bg-emerald-500"
                              : "bg-red-400",
                        },
                        {
                          label: "Completion Rate",
                          val: overview.completionRate,
                          display: `${overview.completionRate.toFixed(1)}%`,
                          color: "bg-blue-500",
                        },
                        {
                          label: "Collection Rate",
                          val: overview.collectionRate,
                          display: `${overview.collectionRate.toFixed(1)}%`,
                          color: "bg-violet-500",
                        },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-slate-600">
                              {item.label}
                            </span>
                            <span className="font-bold text-slate-800">
                              {item.display}
                            </span>
                          </div>
                          <ProgressBar
                            value={item.val}
                            max={100}
                            color={item.color}
                          />
                        </div>
                      ))}
                    </div>
                  </SectionCard>

                  <SectionCard
                    title="Metode Pembayaran"
                    sub="Distribusi transaksi masuk"
                  >
                    {paymentMethods.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">
                        Tidak ada data pembayaran
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {paymentMethods
                          .sort((a, b) => b.amount - a.amount)
                          .map((pm, i) => (
                            <div
                              key={pm.method}
                              className="flex items-center gap-3"
                            >
                              <div
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{
                                  background:
                                    CHART_COLORS[i % CHART_COLORS.length],
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="font-medium text-slate-700 capitalize">
                                    {pm.method.replace(/_/g, " ")}
                                  </span>
                                  <span className="font-bold text-slate-800">
                                    {fmt(pm.amount)}
                                  </span>
                                </div>
                                <ProgressBar
                                  value={pm.amount}
                                  max={paymentMethods.reduce(
                                    (s, p) => s + p.amount,
                                    0,
                                  )}
                                  color={`bg-[${CHART_COLORS[i % CHART_COLORS.length]}]`}
                                />
                              </div>
                              <span className="text-xs text-slate-400 shrink-0">
                                {pm.count}x
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </SectionCard>
                </div>

                {/* Payment status pie */}
                <SectionCard
                  title="Status Pembayaran Invoice"
                  sub="Distribusi berdasarkan nilai"
                >
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={paymentStatusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {paymentStatusData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CHART_COLORS[i % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </SectionCard>
              </>
            )}
          </div>
        )}

        {/* ── REVENUE TAB ── */}
        {activeTab === "revenue" && (
          <div className="space-y-6">
            {loading ? (
              <div className="space-y-4">
                <Shimmer className="h-64 w-full" />
                <Shimmer className="h-64 w-full" />
              </div>
            ) : (
              <>
                {/* Daily Revenue Chart */}
                <SectionCard
                  title="Tren Revenue Harian"
                  sub="Total pendapatan per hari dalam periode"
                >
                  {dailyRevenue.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <BarChart2 className="h-10 w-10 mb-2" />
                      <p className="text-sm">
                        Tidak ada data revenue dalam periode ini
                      </p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={dailyRevenue}>
                        <defs>
                          <linearGradient
                            id="revGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#3b82f6"
                              stopOpacity={0.15}
                            />
                            <stop
                              offset="95%"
                              stopColor="#3b82f6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${(v / 1e6).toFixed(1)}Jt`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#revGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </SectionCard>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Invoice count per day */}
                  <SectionCard
                    title="Jumlah Invoice Harian"
                    sub="Volume transaksi per hari"
                  >
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={dailyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip currency={false} />} />
                        <Bar
                          dataKey="invoices"
                          name="Invoice"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </SectionCard>

                  {/* Category Revenue */}
                  <SectionCard
                    title="Revenue per Kategori"
                    sub="Kontribusi penjualan berdasarkan kategori produk"
                  >
                    {categoryRevenue.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">
                        Tidak ada data
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={categoryRevenue}
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                          >
                            {categoryRevenue.map((_, i) => (
                              <Cell
                                key={i}
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </SectionCard>
                </div>

                {/* Top Products Table */}
                <SectionCard
                  title="Top Produk Terjual"
                  sub="Berdasarkan total revenue dalam periode"
                >
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Cari produk..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-8 w-56 text-sm border-slate-200 bg-slate-50"
                    />
                  </div>
                  {topProducts.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                      Tidak ada data produk
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/60">
                            {[
                              "#",
                              "Produk",
                              "Kategori",
                              "Qty",
                              "Revenue",
                              "Avg Harga",
                            ].map((h) => (
                              <TableHead
                                key={h}
                                className="text-[11px] font-bold uppercase tracking-wide text-slate-400 py-2.5"
                              >
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topProducts
                            .filter((p) =>
                              p.name
                                .toLowerCase()
                                .includes(search.toLowerCase()),
                            )
                            .map((p, i) => (
                              <TableRow
                                key={p.name}
                                className="border-slate-100"
                              >
                                <TableCell className="text-xs text-slate-400 font-medium">
                                  {i + 1}
                                </TableCell>
                                <TableCell className="text-sm font-semibold text-slate-800">
                                  {p.name}
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
                                    {CATEGORY_LABELS[p.category] ?? p.category}
                                  </span>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                  {fmtNum(p.qty)}
                                </TableCell>
                                <TableCell className="text-sm font-semibold text-slate-800">
                                  {fmt(p.revenue)}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                  {fmt(p.qty > 0 ? p.revenue / p.qty : 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </SectionCard>
              </>
            )}
          </div>
        )}

        {/* ── SERVICES TAB ── */}
        {activeTab === "services" && (
          <div className="space-y-6">
            {loading ? (
              <Shimmer className="h-96 w-full" />
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Status Dist */}
                  <SectionCard
                    title="Distribusi Status Servis"
                    sub="Jumlah servis per status"
                  >
                    {serviceStatusDist.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">
                        Tidak ada data
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={serviceStatusDist} layout="vertical">
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f1f5f9"
                          />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 11 }}
                            allowDecimals={false}
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fontSize: 10 }}
                            width={120}
                          />
                          <Tooltip
                            content={<CustomTooltip currency={false} />}
                          />
                          <Bar
                            dataKey="value"
                            name="Jumlah"
                            fill="#3b82f6"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </SectionCard>

                  {/* Priority Dist */}
                  <SectionCard
                    title="Distribusi Prioritas"
                    sub="Komposisi prioritas pekerjaan"
                  >
                    {priorityDist.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">
                        Tidak ada data
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie
                            data={priorityDist}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            dataKey="value"
                            nameKey="name"
                            paddingAngle={3}
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {priorityDist.map((_, i) => (
                              <Cell
                                key={i}
                                fill={
                                  ["#ef4444", "#f59e0b", "#3b82f6", "#94a3b8"][
                                    i % 4
                                  ]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={<CustomTooltip currency={false} />}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </SectionCard>
                </div>

                {/* Technician Performance Table */}
                <SectionCard
                  title="Performa Teknisi"
                  sub="Ranking berdasarkan jumlah servis selesai"
                >
                  {techPerf.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Users className="h-10 w-10 mb-2" />
                      <p className="text-sm">
                        Belum ada data teknisi dalam periode ini
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/60">
                            {[
                              "#",
                              "Teknisi",
                              "Total Job",
                              "Selesai",
                              "Completion",
                              "Revenue",
                              "Rating",
                              "Avg Durasi",
                            ].map((h) => (
                              <TableHead
                                key={h}
                                className="text-[11px] font-bold uppercase tracking-wide text-slate-400 py-2.5"
                              >
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {techPerf.map((t, i) => {
                            const compPct =
                              t.jobs > 0 ? (t.completed / t.jobs) * 100 : 0;
                            return (
                              <TableRow key={t.id} className="border-slate-100">
                                <TableCell className="text-xs text-slate-400 font-bold">
                                  {i + 1}
                                </TableCell>
                                <TableCell className="text-sm font-semibold text-slate-800">
                                  {t.name}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                  {t.jobs}
                                </TableCell>
                                <TableCell className="text-sm text-slate-600">
                                  {t.completed}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2 min-w-[80px]">
                                    <ProgressBar
                                      value={compPct}
                                      max={100}
                                      color={
                                        compPct >= 80
                                          ? "bg-emerald-500"
                                          : compPct >= 50
                                            ? "bg-amber-500"
                                            : "bg-red-400"
                                      }
                                    />
                                    <span
                                      className={cn(
                                        "text-xs font-bold shrink-0",
                                        compPct >= 80
                                          ? "text-emerald-600"
                                          : compPct >= 50
                                            ? "text-amber-600"
                                            : "text-red-600",
                                      )}
                                    >
                                      {compPct.toFixed(0)}%
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm font-semibold text-slate-800">
                                  {fmt(t.revenue)}
                                </TableCell>
                                <TableCell>
                                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    {t.rating > 0 ? t.rating.toFixed(1) : "—"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-slate-500">
                                  {t.avgDuration > 0
                                    ? `${t.avgDuration} mnt`
                                    : "—"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </SectionCard>
              </>
            )}
          </div>
        )}

        {/* ── CUSTOMERS TAB ── */}
        {activeTab === "customers" && (
          <div className="space-y-6">
            {loading ? (
              <Shimmer className="h-96 w-full" />
            ) : (
              <>
                <SectionCard
                  title="Top Pelanggan"
                  sub="Berdasarkan revenue dalam periode yang dipilih"
                >
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Cari pelanggan..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-8 w-56 text-sm border-slate-200 bg-slate-50"
                    />
                  </div>
                  {topCustomers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Users className="h-10 w-10 mb-2" />
                      <p className="text-sm">
                        Tidak ada data pelanggan dalam periode ini
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/60">
                            {[
                              "#",
                              "Pelanggan",
                              "Kategori",
                              "Total Order",
                              "Revenue",
                              "Outstanding",
                              "Payment Rate",
                            ].map((h) => (
                              <TableHead
                                key={h}
                                className="text-[11px] font-bold uppercase tracking-wide text-slate-400 py-2.5"
                              >
                                {h}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topCustomers
                            .filter((c) =>
                              c.name
                                .toLowerCase()
                                .includes(search.toLowerCase()),
                            )
                            .map((c, i) => {
                              const payRate =
                                c.revenue > 0
                                  ? ((c.revenue - c.outstanding) / c.revenue) *
                                    100
                                  : 100;
                              return (
                                <TableRow key={i} className="border-slate-100">
                                  <TableCell className="text-xs text-slate-400 font-bold">
                                    {i + 1}
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold text-slate-800">
                                    {c.name}
                                  </TableCell>
                                  <TableCell>
                                    <span
                                      className={cn(
                                        "text-xs px-2 py-0.5 rounded-full border font-medium",
                                        c.category === "project"
                                          ? "bg-violet-50 text-violet-700 border-violet-200"
                                          : "bg-blue-50 text-blue-700 border-blue-200",
                                      )}
                                    >
                                      {c.category === "project"
                                        ? "Project"
                                        : "Retail"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-600">
                                    {c.orders}
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold text-slate-800">
                                    {fmt(c.revenue)}
                                  </TableCell>
                                  <TableCell>
                                    <span
                                      className={cn(
                                        "text-sm font-medium",
                                        c.outstanding > 0
                                          ? "text-red-600"
                                          : "text-emerald-600",
                                      )}
                                    >
                                      {fmt(c.outstanding)}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2 min-w-[70px]">
                                      <ProgressBar
                                        value={payRate}
                                        max={100}
                                        color={
                                          payRate >= 80
                                            ? "bg-emerald-500"
                                            : "bg-amber-500"
                                        }
                                      />
                                      <span className="text-xs font-bold text-slate-600 shrink-0">
                                        {payRate.toFixed(0)}%
                                      </span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </SectionCard>

                {/* Revenue by customer category bar */}
                <SectionCard
                  title="Revenue per Kategori Pelanggan"
                  sub="Retail vs Project"
                >
                  {topCustomers.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8">
                      Tidak ada data
                    </p>
                  ) : (
                    (() => {
                      const retail = topCustomers
                        .filter((c) => c.category !== "project")
                        .reduce((s, c) => s + c.revenue, 0);
                      const project = topCustomers
                        .filter((c) => c.category === "project")
                        .reduce((s, c) => s + c.revenue, 0);
                      const data = [
                        { name: "Retail", value: retail, color: "#3b82f6" },
                        { name: "Project", value: project, color: "#8b5cf6" },
                      ];
                      return (
                        <div className="space-y-3">
                          {data.map((d) => (
                            <div key={d.name}>
                              <div className="flex justify-between text-xs mb-1.5">
                                <span className="font-medium text-slate-600">
                                  {d.name}
                                </span>
                                <span className="font-bold text-slate-800">
                                  {fmt(d.value)}
                                </span>
                              </div>
                              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${retail + project > 0 ? (d.value / (retail + project)) * 100 : 0}%`,
                                    background: d.color,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </SectionCard>
              </>
            )}
          </div>
        )}

        {/* ── INVENTORY TAB ── */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            {loading ? (
              <Shimmer className="h-96 w-full" />
            ) : (
              <>
                {/* Stock Alerts */}
                {stockAlerts.length > 0 && (
                  <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <p className="text-sm font-bold text-red-800">
                        Peringatan Stok — {stockAlerts.length} produk perlu
                        perhatian
                      </p>
                    </div>
                    <div className="p-5">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {stockAlerts.map((a) => (
                          <div
                            key={a.id}
                            className={cn(
                              "rounded-lg border p-3",
                              a.severity === "critical"
                                ? "border-red-200 bg-red-50"
                                : "border-amber-200 bg-amber-50",
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {a.name}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {a.sku}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                                  a.severity === "critical"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700",
                                )}
                              >
                                {a.severity === "critical" ? "HABIS" : "LOW"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-500">
                                Stok:{" "}
                                <strong
                                  className={
                                    a.stock === 0
                                      ? "text-red-600"
                                      : "text-amber-600"
                                  }
                                >
                                  {a.stock}
                                </strong>{" "}
                                / Min: {a.threshold}
                              </span>
                              <span className="text-xs text-slate-400">
                                {CATEGORY_LABELS[a.category] ?? a.category}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Inventory value chart */}
                <div className="grid md:grid-cols-2 gap-6">
                  <SectionCard
                    title="Nilai Inventaris per Kategori"
                    sub="Berdasarkan harga jual × stok saat ini"
                  >
                    {inventoryValue.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">
                        Tidak ada data
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={inventoryValue}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#f1f5f9"
                          />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => `${(v / 1e6).toFixed(1)}Jt`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar
                            dataKey="value"
                            name="Nilai Jual"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="cost"
                            name="Nilai HPP"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </SectionCard>

                  <SectionCard
                    title="Distribusi Item per Kategori"
                    sub="Jumlah SKU aktif per kategori"
                  >
                    {inventoryValue.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-8">
                        Tidak ada data
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={240}>
                        <PieChart>
                          <Pie
                            data={inventoryValue}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="items"
                            nameKey="name"
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {inventoryValue.map((_, i) => (
                              <Cell
                                key={i}
                                fill={CHART_COLORS[i % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            content={<CustomTooltip currency={false} />}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </SectionCard>
                </div>

                {/* Inventory summary table */}
                <SectionCard
                  title="Ringkasan Inventaris"
                  sub="Nilai dan jumlah per kategori"
                >
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/60">
                          {[
                            "Kategori",
                            "Jumlah SKU",
                            "Nilai Jual",
                            "Nilai HPP",
                            "Potensi Margin",
                          ].map((h) => (
                            <TableHead
                              key={h}
                              className="text-[11px] font-bold uppercase tracking-wide text-slate-400 py-2.5"
                            >
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryValue.map((row, i) => {
                          const margin = row.value - row.cost;
                          const marginPct =
                            row.value > 0 ? (margin / row.value) * 100 : 0;
                          return (
                            <TableRow key={i} className="border-slate-100">
                              <TableCell className="text-sm font-semibold text-slate-800">
                                {row.name}
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {row.items} SKU
                              </TableCell>
                              <TableCell className="text-sm font-semibold text-slate-800">
                                {fmt(row.value)}
                              </TableCell>
                              <TableCell className="text-sm text-slate-600">
                                {fmt(row.cost)}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={cn(
                                    "text-sm font-semibold",
                                    marginPct >= 20
                                      ? "text-emerald-600"
                                      : "text-amber-600",
                                  )}
                                >
                                  {fmt(margin)}{" "}
                                  <span className="text-xs font-normal text-slate-400">
                                    ({marginPct.toFixed(0)}%)
                                  </span>
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {inventoryValue.length > 0 && (
                          <TableRow className="bg-slate-50/60 font-bold border-t-2 border-slate-200">
                            <TableCell className="text-sm font-bold text-slate-900">
                              Total
                            </TableCell>
                            <TableCell className="text-sm font-bold text-slate-900">
                              {inventoryValue.reduce((s, r) => s + r.items, 0)}{" "}
                              SKU
                            </TableCell>
                            <TableCell className="text-sm font-bold text-slate-900">
                              {fmt(
                                inventoryValue.reduce((s, r) => s + r.value, 0),
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-bold text-slate-900">
                              {fmt(
                                inventoryValue.reduce((s, r) => s + r.cost, 0),
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-bold text-emerald-600">
                              {fmt(
                                inventoryValue.reduce(
                                  (s, r) => s + (r.value - r.cost),
                                  0,
                                ),
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </SectionCard>
              </>
            )}
          </div>
        )}

        {/* Footer note */}
        <p className="text-xs text-slate-400 text-center pb-2">
          Data diperbarui secara real-time dari database. Periode:{" "}
          {format(dateRange.from, "d MMM yyyy", { locale: localeId })} –{" "}
          {format(dateRange.to, "d MMM yyyy", { locale: localeId })}
        </p>
      </div>
    </DashboardLayout>
  );
}
