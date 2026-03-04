import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { StockHistory } from "@/components/inventory/StockHistory";
import { ProductImageUpload } from "@/components/inventory/ProductImageUpload";
import { ExportProducts } from "@/components/inventory/ExportProducts";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  RefreshCw,
  Package,
  AlertTriangle,
  Minus,
  TrendingDown,
  TrendingUp,
  PackageX,
  Pencil,
  Trash2,
  MoreVertical,
  History,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CheckSquare,
  Square,
  X,
  DollarSign,
  BarChart2,
  ShieldAlert,
  CheckCheck,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  stock: number;
  min_stock_threshold: number;
  is_service_item: boolean;
  is_active: boolean;
  image_url?: string | null;
  created_at: string;
}

interface StockAlert {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  alert_type: string;
  current_stock: number;
  threshold: number;
  status: string;
  created_at: string;
}

type SortField =
  | "sku"
  | "name"
  | "category"
  | "cost_price"
  | "sell_price"
  | "stock"
  | "created_at";
type SortOrder = "asc" | "desc";
type ActiveTab = "products" | "alerts";

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    value: "spare_parts",
    label: "Spare Parts",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "consumables",
    label: "Consumables",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "equipment",
    label: "Equipment",
    color: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    value: "accessories",
    label: "Accessories",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "service_labor",
    label: "Jasa/Labor",
    color: "bg-rose-50 text-rose-700 border-rose-200",
  },
];

const CATEGORY_PREFIXES: Record<string, string> = {
  spare_parts: "SP",
  consumables: "CS",
  equipment: "EQ",
  accessories: "AC",
  service_labor: "SV",
};

const AVATAR_COLORS = [
  "from-blue-500 to-cyan-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-600",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
const fmtCompact = (n: number) => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}M`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}Jt`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}Rb`;
  return fmt(n);
};
const getCategoryConfig = (cat: string) =>
  CATEGORIES.find((c) => c.value === cat) ?? {
    value: cat,
    label: cat,
    color: "bg-slate-50 text-slate-600 border-slate-200",
  };

const getStockStatus = (p: Product) => {
  if (p.stock === 0)
    return {
      label: "Habis",
      color: "bg-red-50 text-red-700 border-red-200",
      dot: "bg-red-500",
      level: 0,
    };
  if (p.stock <= p.min_stock_threshold)
    return {
      label: "Menipis",
      color: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
      level: 1,
    };
  return {
    label: "Tersedia",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    level: 2,
  };
};

const getMargin = (cost: number, sell: number) =>
  sell > 0 ? ((sell - cost) / sell) * 100 : 0;

function getCatInitials(cat: string) {
  return CATEGORY_PREFIXES[cat] ?? cat.slice(0, 2).toUpperCase();
}
function getCatAvatarColor(cat: string) {
  return AVATAR_COLORS[
    Object.keys(CATEGORY_PREFIXES).indexOf(cat) % AVATAR_COLORS.length
  ];
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Shimmer({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded", className)} />;
}

function StockBar({ stock, threshold }: { stock: number; threshold: number }) {
  if (threshold === 0) return null;
  const safe = threshold * 3;
  const pct = Math.min((stock / safe) * 100, 100);
  const color =
    stock === 0
      ? "bg-red-400"
      : stock <= threshold
        ? "bg-amber-400"
        : "bg-emerald-400";
  return (
    <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function Inventory() {
  const { toast } = useToast();
  const { employee } = useAuth();

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // all | low | out | ok

  // Sorting
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Selection (bulk)
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "spare_parts",
    unit: "pcs",
    cost_price: 0,
    sell_price: 0,
    stock: "0",
    min_stock_threshold: "5",
    is_service_item: false,
  });
  const [creating, setCreating] = useState(false);

  // Adjust stock
  const [adjType, setAdjType] = useState<"add" | "remove">("add");
  const [adjQty, setAdjQty] = useState("");
  const [adjNotes, setAdjNotes] = useState("");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let q = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("is_active", true);
      if (categoryFilter !== "all") q = q.eq("category", categoryFilter as any);
      if (searchQuery)
        q = q.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
      if (stockFilter === "out") q = q.eq("stock", 0);
      if (stockFilter === "low")
        q = q.gt("stock", 0).lte("stock" as any, supabase.rpc as any);

      q = q
        .order(sortField, { ascending: sortOrder === "asc" })
        .range(from, to);
      const { data, error, count } = await q;
      if (error) throw error;

      let filtered = data ?? [];
      // Client-side stock filter (simpler than complex RPC)
      if (stockFilter === "low")
        filtered = filtered.filter(
          (p) => p.stock > 0 && p.stock <= p.min_stock_threshold,
        );
      if (stockFilter === "out")
        filtered = filtered.filter((p) => p.stock === 0);
      if (stockFilter === "ok")
        filtered = filtered.filter((p) => p.stock > p.min_stock_threshold);

      setProducts(filtered);
      setTotalCount(count ?? 0);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal memuat produk",
        description: e.message,
      });
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    itemsPerPage,
    categoryFilter,
    searchQuery,
    sortField,
    sortOrder,
    stockFilter,
  ]);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("stock_alerts")
        .select("*, products(name,sku)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAlerts(
        (data ?? []).map((a: any) => ({
          ...a,
          product_name: a.products?.name ?? "—",
          product_sku: a.products?.sku ?? "—",
        })),
      );
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // ── Sorting ────────────────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field)
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField !== field ? (
      <ArrowUpDown className="h-3 w-3 text-slate-400" />
    ) : sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 text-slate-700" />
    ) : (
      <ArrowDown className="h-3 w-3 text-slate-700" />
    );

  // ── Selection ─────────────────────────────────────────────────────────────
  const allSelected = products.length > 0 && selected.size === products.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(
    () => ({
      total: totalCount,
      lowStock: products.filter(
        (p) => p.stock > 0 && p.stock <= p.min_stock_threshold,
      ).length,
      outOfStock: products.filter((p) => p.stock === 0).length,
      totalValue: products.reduce((s, p) => s + p.stock * p.cost_price, 0),
      totalSell: products.reduce((s, p) => s + p.stock * p.sell_price, 0),
      avgMargin:
        products.length > 0
          ? products.reduce(
              (s, p) => s + getMargin(p.cost_price, p.sell_price),
              0,
            ) / products.length
          : 0,
    }),
    [products, totalCount],
  );

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "spare_parts",
      unit: "pcs",
      cost_price: 0,
      sell_price: 0,
      stock: "0",
      min_stock_threshold: "5",
      is_service_item: false,
    });
    setEditingProduct(null);
  };

  const generateSKU = async (category: string) => {
    const prefix = CATEGORY_PREFIXES[category] ?? "XX";
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    return `${prefix}-${String((count ?? 0) + 1).padStart(5, "0")}`;
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.category) {
      toast({ variant: "destructive", title: "Nama dan kategori wajib diisi" });
      return;
    }
    setCreating(true);
    try {
      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update({
            name: formData.name,
            description: formData.description || null,
            category: formData.category as any,
            unit: formData.unit,
            cost_price: formData.cost_price,
            sell_price: formData.sell_price,
            stock: parseInt(formData.stock) || 0,
            min_stock_threshold: parseInt(formData.min_stock_threshold) || 5,
            is_service_item: formData.is_service_item,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast({
          title: "Produk diperbarui",
          description: `${formData.name} berhasil diperbarui.`,
        });
      } else {
        const sku = await generateSKU(formData.category);
        const { error } = await supabase.from("products").insert([
          {
            sku,
            name: formData.name,
            description: formData.description || null,
            category: formData.category as any,
            unit: formData.unit,
            cost_price: formData.cost_price,
            sell_price: formData.sell_price,
            stock: parseInt(formData.stock) || 0,
            min_stock_threshold: parseInt(formData.min_stock_threshold) || 5,
            is_service_item: formData.is_service_item,
          },
        ]);
        if (error) throw error;
        toast({
          title: "Produk ditambahkan",
          description: `${formData.name} (${sku}) berhasil ditambahkan.`,
        });
      }
      setFormOpen(false);
      resetForm();
      fetchProducts();
      fetchAlerts();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan produk",
        description: e.message,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedProduct || !adjQty) return;
    const qty = parseInt(adjQty);
    if (isNaN(qty) || qty <= 0) {
      toast({ variant: "destructive", title: "Masukkan jumlah yang valid" });
      return;
    }
    const delta = adjType === "add" ? qty : -qty;
    const newStock = selectedProduct.stock + delta;
    if (newStock < 0) {
      toast({ variant: "destructive", title: "Stok tidak boleh negatif" });
      return;
    }
    try {
      const { error: ue } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", selectedProduct.id);
      if (ue) throw ue;
      const { error: te } = await supabase
        .from("inventory_transactions")
        .insert([
          {
            product_id: selectedProduct.id,
            transaction_type: "adjustment",
            quantity: delta,
            stock_before: selectedProduct.stock,
            stock_after: newStock,
            notes:
              adjNotes ||
              `Penyesuaian stok ${adjType === "add" ? "tambah" : "kurang"}`,
            created_by: employee?.id,
          },
        ]);
      if (te) throw te;
      toast({
        title: "Stok diperbarui",
        description: `${selectedProduct.name}: ${delta > 0 ? "+" : ""}${delta} unit.`,
      });
      setAdjustOpen(false);
      setSelectedProduct(null);
      setAdjQty("");
      setAdjNotes("");
      fetchProducts();
      fetchAlerts();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menyesuaikan stok",
        description: e.message,
      });
    }
  };

  const handleDelete = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", product.id);
      if (error) throw error;
      toast({
        title: "Produk dinonaktifkan",
        description: `${product.name} telah dihapus.`,
      });
      setDeleteOpen(false);
      setSelectedProduct(null);
      fetchProducts();
      fetchAlerts();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus",
        description: e.message,
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selected);
      const { error } = await supabase
        .from("products")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      toast({ title: `${ids.length} produk dinonaktifkan` });
      setBulkDeleteOpen(false);
      setSelected(new Set());
      fetchProducts();
      fetchAlerts();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Gagal bulk delete",
        description: e.message,
      });
    }
  };

  const acknowledgeAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from("stock_alerts")
        .update({
          status: "acknowledged",
          acknowledged_by: employee?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Alert diterima" });
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  const acknowledgeAllAlerts = async () => {
    try {
      const ids = alerts.map((a) => a.id);
      await supabase
        .from("stock_alerts")
        .update({
          status: "acknowledged",
          acknowledged_by: employee?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .in("id", ids);
      toast({ title: `${ids.length} alert diterima` });
      fetchAlerts();
    } catch (e) {
      console.error(e);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <style>{`
        .inv-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .stat-card { transition: box-shadow .18s, transform .18s; }
        .stat-card:hover { box-shadow: 0 8px 32px -4px rgba(15,23,42,.10); transform: translateY(-1px); }
        .inv-row { transition: background .12s; }
        .inv-row:hover { background: #f8fafc; }
        .inv-row:hover .row-action { opacity: 1; }
        .row-action { opacity: 0; transition: opacity .15s; }
        .shimmer { background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .filter-pill { transition: all .15s; border-radius: 99px; }
        .filter-pill.active { background: #0f172a; color: #fff; border-color: #0f172a; }
        .filter-pill:not(.active):hover { background: #f1f5f9; }
        .tab-btn { transition: all .15s; }
        .tab-btn.active { border-bottom: 2px solid #0f172a; color: #0f172a; }
        .tab-btn:not(.active) { color: #94a3b8; border-bottom: 2px solid transparent; }
      `}</style>

      <div className="inv-root space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Manajemen Stok
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Inventaris
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola produk, stok, harga, dan peringatan stok
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportProducts products={products} />
            <Button
              size="sm"
              className="h-9 gap-2 bg-slate-900 hover:bg-slate-800 shadow-sm"
              onClick={() => {
                resetForm();
                setFormOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Produk
            </Button>
          </div>
        </div>

        {/* ── KPI Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            {
              label: "Total Produk",
              value: totalCount.toString(),
              sub: "SKU aktif",
              icon: Package,
              accent: "blue",
              accentCls: "bg-blue-50 text-blue-600",
            },
            {
              label: "Stok Menipis",
              value: stats.lowStock.toString(),
              sub: "di bawah minimum",
              icon: TrendingDown,
              accent: "amber",
              accentCls: "bg-amber-50 text-amber-600",
            },
            {
              label: "Stok Habis",
              value: stats.outOfStock.toString(),
              sub: "perlu restock",
              icon: PackageX,
              accent: "red",
              accentCls: "bg-red-50 text-red-600",
            },
            {
              label: "Nilai Stok HPP",
              value: fmtCompact(stats.totalValue),
              sub: "harga pokok",
              icon: DollarSign,
              accent: "green",
              accentCls: "bg-emerald-50 text-emerald-600",
            },
            {
              label: "Nilai Stok Jual",
              value: fmtCompact(stats.totalSell),
              sub: "harga jual",
              icon: TrendingUp,
              accent: "violet",
              accentCls: "bg-violet-50 text-violet-600",
            },
            {
              label: "Rata-rata Margin",
              value: `${stats.avgMargin.toFixed(1)}%`,
              sub: "margin kotor",
              icon: BarChart2,
              accent: "slate",
              accentCls: "bg-slate-100 text-slate-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="stat-card bg-white rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">
                  {s.label}
                </p>
                <div
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0",
                    s.accentCls,
                  )}
                >
                  <s.icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold text-slate-900 tabular-nums">
                {s.value}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-6 border-b border-slate-200">
          {[
            { id: "products", label: "Produk" },
            { id: "alerts", label: "Peringatan Stok", badge: alerts.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={cn(
                "tab-btn flex items-center gap-2 text-sm font-semibold pb-3 px-1",
                activeTab === tab.id ? "active" : "",
              )}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══ PRODUCTS TAB ══ */}
        {activeTab === "products" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-slate-100 space-y-3">
              {/* Row 1: search + filters */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Cari nama / SKU..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 h-8 text-sm border-slate-200 bg-slate-50 focus-visible:bg-white"
                  />
                </div>

                {/* Category pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[{ value: "all", label: "Semua" }, ...CATEGORIES].map(
                    (f) => (
                      <button
                        key={f.value}
                        onClick={() => {
                          setCategoryFilter(f.value);
                          setCurrentPage(1);
                        }}
                        className={cn(
                          "filter-pill text-[11px] font-semibold px-3 py-1 border",
                          categoryFilter === f.value
                            ? "active"
                            : "border-slate-200 text-slate-600",
                        )}
                      >
                        {f.label}
                      </button>
                    ),
                  )}
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Stock filter */}
                  <Select
                    value={stockFilter}
                    onValueChange={(v) => {
                      setStockFilter(v);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-36 text-xs border-slate-200">
                      <SelectValue placeholder="Filter stok" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Stok</SelectItem>
                      <SelectItem value="ok">Stok Aman</SelectItem>
                      <SelectItem value="low">Stok Menipis</SelectItem>
                      <SelectItem value="out">Stok Habis</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={fetchProducts}
                  >
                    <RefreshCw
                      className={cn(
                        "h-3.5 w-3.5 text-slate-500",
                        loading && "animate-spin",
                      )}
                    />
                  </Button>
                </div>
              </div>

              {/* Row 2: bulk actions (visible when items selected) */}
              {selected.size > 0 && (
                <div className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <CheckCheck className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="text-sm font-semibold text-blue-800">
                    {selected.size} produk dipilih
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-blue-300"
                      onClick={() => setSelected(new Set())}
                    >
                      <X className="h-3 w-3 mr-1" /> Batal
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setBulkDeleteOpen(true)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Hapus {selected.size}{" "}
                      Produk
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Table */}
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Shimmer className="h-9 w-9 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Shimmer className="h-3 w-32" />
                      <Shimmer className="h-2.5 w-48" />
                    </div>
                    <Shimmer className="h-5 w-16 rounded-full" />
                    <Shimmer className="h-5 w-20 rounded-full" />
                    <Shimmer className="h-3 w-16" />
                    <Shimmer className="h-3 w-16" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Package className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Tidak ada produk ditemukan
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchQuery || categoryFilter !== "all"
                    ? "Coba ubah filter pencarian"
                    : "Tambah produk pertama untuk memulai"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                      <TableHead className="w-10 pl-5">
                        <button
                          onClick={toggleAll}
                          className="flex items-center justify-center"
                        >
                          {allSelected ? (
                            <CheckSquare className="h-4 w-4 text-slate-700" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead className="w-12">—</TableHead>
                      {(
                        [
                          { field: "sku", label: "SKU" },
                          { field: "name", label: "Produk" },
                          { field: "category", label: "Kategori" },
                          { field: "stock", label: "Stok" },
                          { field: "cost_price", label: "HPP" },
                          { field: "sell_price", label: "Harga Jual" },
                        ] as { field: SortField; label: string }[]
                      ).map((col) => (
                        <TableHead
                          key={col.field}
                          className="text-[11px] font-bold uppercase tracking-wide text-slate-400 py-3"
                        >
                          <button
                            className="flex items-center gap-1.5 hover:text-slate-700 transition-colors"
                            onClick={() => handleSort(col.field)}
                          >
                            {col.label} <SortIcon field={col.field} />
                          </button>
                        </TableHead>
                      ))}
                      <TableHead className="text-[11px] font-bold uppercase tracking-wide text-slate-400 py-3">
                        Margin
                      </TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wide text-slate-400 py-3">
                        Status
                      </TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const catCfg = getCategoryConfig(product.category);
                      const stockStat = getStockStatus(product);
                      const margin = getMargin(
                        product.cost_price,
                        product.sell_price,
                      );
                      const isSelected = selected.has(product.id);

                      return (
                        <TableRow
                          key={product.id}
                          className={cn(
                            "inv-row border-slate-100",
                            isSelected && "bg-blue-50/50",
                          )}
                        >
                          {/* Checkbox */}
                          <TableCell className="pl-5">
                            <button
                              onClick={() => toggleOne(product.id)}
                              className="flex items-center justify-center"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-300" />
                              )}
                            </button>
                          </TableCell>

                          {/* Avatar / Image */}
                          <TableCell>
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-9 w-9 object-cover rounded-lg border border-slate-200"
                              />
                            ) : (
                              <div
                                className={cn(
                                  "h-9 w-9 rounded-lg flex items-center justify-center text-white text-[10px] font-bold bg-gradient-to-br",
                                  getCatAvatarColor(product.category),
                                )}
                              >
                                {getCatInitials(product.category)}
                              </div>
                            )}
                          </TableCell>

                          {/* SKU */}
                          <TableCell className="font-mono text-xs text-slate-500">
                            {product.sku}
                          </TableCell>

                          {/* Name */}
                          <TableCell>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {product.name}
                              </p>
                              {product.description && (
                                <p className="text-xs text-slate-400 truncate max-w-[180px]">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          {/* Category */}
                          <TableCell>
                            <span
                              className={cn(
                                "text-xs font-semibold px-2 py-0.5 rounded-full border",
                                catCfg.color,
                              )}
                            >
                              {catCfg.label}
                            </span>
                          </TableCell>

                          {/* Stock */}
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm font-bold text-slate-800 tabular-nums">
                                {product.stock}
                                <span className="text-xs font-normal text-slate-400 ml-1">
                                  {product.unit}
                                </span>
                              </p>
                              <StockBar
                                stock={product.stock}
                                threshold={product.min_stock_threshold}
                              />
                              <p className="text-[10px] text-slate-400">
                                Min: {product.min_stock_threshold}
                              </p>
                            </div>
                          </TableCell>

                          {/* Cost */}
                          <TableCell className="text-sm text-slate-600 tabular-nums">
                            {fmt(product.cost_price)}
                          </TableCell>

                          {/* Sell */}
                          <TableCell className="text-sm font-semibold text-slate-800 tabular-nums">
                            {fmt(product.sell_price)}
                          </TableCell>

                          {/* Margin */}
                          <TableCell>
                            <span
                              className={cn(
                                "text-xs font-bold",
                                margin >= 30
                                  ? "text-emerald-600"
                                  : margin >= 15
                                    ? "text-amber-600"
                                    : "text-red-600",
                              )}
                            >
                              {margin.toFixed(1)}%
                            </span>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border",
                                stockStat.color,
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  stockStat.dot,
                                )}
                              />
                              {stockStat.label}
                            </span>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="pr-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="row-action h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-48 text-sm"
                              >
                                <DropdownMenuLabel className="text-xs text-slate-400 font-normal">
                                  Aksi
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingProduct(product);
                                    setFormData({
                                      name: product.name,
                                      description: product.description ?? "",
                                      category: product.category,
                                      unit: product.unit,
                                      cost_price: product.cost_price,
                                      sell_price: product.sell_price,
                                      stock: product.stock.toString(),
                                      min_stock_threshold:
                                        product.min_stock_threshold.toString(),
                                      is_service_item: product.is_service_item,
                                    });
                                    setFormOpen(true);
                                  }}
                                >
                                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                                  Produk
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setAdjType("add");
                                    setAdjQty("");
                                    setAdjNotes("");
                                    setAdjustOpen(true);
                                  }}
                                >
                                  <ArrowUpDown className="mr-2 h-3.5 w-3.5" />{" "}
                                  Sesuaikan Stok
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setHistoryOpen(true);
                                  }}
                                >
                                  <History className="mr-2 h-3.5 w-3.5" />{" "}
                                  Riwayat Stok
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setImageOpen(true);
                                  }}
                                >
                                  <ImageIcon className="mr-2 h-3.5 w-3.5" />{" "}
                                  Upload Gambar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setDeleteOpen(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Hapus
                                  Produk
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination */}
            {!loading && products.length > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(v) => {
                      setItemsPerPage(parseInt(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-7 w-20 text-xs border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50, 100].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n} / hal
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">
                    Menampilkan{" "}
                    <span className="font-semibold text-slate-600">
                      {(currentPage - 1) * itemsPerPage + 1}–
                      {Math.min(currentPage * itemsPerPage, totalCount)}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-slate-600">
                      {totalCount}
                    </span>{" "}
                    produk
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[
                    {
                      icon: ChevronsLeft,
                      action: () => setCurrentPage(1),
                      disabled: currentPage === 1,
                    },
                    {
                      icon: ChevronLeft,
                      action: () => setCurrentPage((p) => p - 1),
                      disabled: currentPage === 1,
                    },
                    {
                      icon: ChevronRight,
                      action: () => setCurrentPage((p) => p + 1),
                      disabled: currentPage >= totalPages,
                    },
                    {
                      icon: ChevronsRight,
                      action: () => setCurrentPage(totalPages),
                      disabled: currentPage >= totalPages,
                    },
                  ].map(({ icon: Icon, action, disabled }, i) => (
                    <button
                      key={i}
                      onClick={action}
                      disabled={disabled || loading}
                      className="h-7 w-7 rounded-md flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                  <span className="text-xs text-slate-500 ml-2 tabular-nums">
                    {currentPage} / {totalPages}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ ALERTS TAB ══ */}
        {activeTab === "alerts" && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  Peringatan Stok Aktif
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {alerts.length} produk memerlukan perhatian
                </p>
              </div>
              {alerts.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={acknowledgeAllAlerts}
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Terima Semua
                </Button>
              )}
            </div>

            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <Package className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Semua stok dalam kondisi baik
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Tidak ada produk di bawah batas minimum stok
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {alerts.map((alert) => {
                  const isCritical =
                    alert.alert_type === "out_of_stock" ||
                    alert.current_stock === 0;
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        "flex items-center justify-between px-5 py-4 transition-colors hover:bg-slate-50/60",
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {/* Severity icon */}
                        <div
                          className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                            isCritical ? "bg-red-100" : "bg-amber-100",
                          )}
                        >
                          {isCritical ? (
                            <PackageX className="h-5 w-5 text-red-600" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800">
                              {alert.product_name}
                            </p>
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                isCritical
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700",
                              )}
                            >
                              {isCritical ? "HABIS" : "MENIPIS"}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            SKU:{" "}
                            <span className="font-mono">
                              {alert.product_sku}
                            </span>
                            {" · "}Stok saat ini:{" "}
                            <strong
                              className={
                                isCritical ? "text-red-600" : "text-amber-600"
                              }
                            >
                              {alert.current_stock}
                            </strong>
                            {" / "}Min: <strong>{alert.threshold}</strong>
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {format(
                              new Date(alert.created_at),
                              "dd MMM yyyy, HH:mm",
                              { locale: localeId },
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => {
                            const prod = products.find(
                              (p) => p.id === alert.product_id,
                            );
                            if (prod) {
                              setSelectedProduct(prod);
                              setAdjType("add");
                              setAdjQty("");
                              setAdjNotes("");
                              setAdjustOpen(true);
                            }
                          }}
                        >
                          <Plus className="h-3 w-3" /> Isi Stok
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-slate-500"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Terima
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Dialog: Form Produk ── */}
        <Dialog
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                {editingProduct
                  ? `Perbarui detail untuk ${editingProduct.name}`
                  : "SKU akan digenerate otomatis berdasarkan kategori."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Nama Produk <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="cth. Kompresor 1 PK"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                  className="h-9 border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Deskripsi</Label>
                <Textarea
                  placeholder="Deskripsi produk..."
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, description: e.target.value }))
                  }
                  className="border-slate-200 text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Kategori <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, category: v }))
                    }
                  >
                    <SelectTrigger className="h-9 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Satuan</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, unit: v }))
                    }
                  >
                    <SelectTrigger className="h-9 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "pcs",
                        "set",
                        "meter",
                        "liter",
                        "kg",
                        "roll",
                        "box",
                      ].map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Harga Pokok (HPP)
                  </Label>
                  <CurrencyInput
                    value={formData.cost_price}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, cost_price: v }))
                    }
                    placeholder="Rp 0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Harga Jual</Label>
                  <CurrencyInput
                    value={formData.sell_price}
                    onValueChange={(v) =>
                      setFormData((p) => ({ ...p, sell_price: v }))
                    }
                    placeholder="Rp 0"
                  />
                </div>
              </div>
              {/* Margin preview */}
              {(formData.cost_price > 0 || formData.sell_price > 0) && (
                <div
                  className={cn(
                    "rounded-lg px-4 py-2.5 flex items-center justify-between text-sm",
                    getMargin(formData.cost_price, formData.sell_price) >= 20
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-amber-50 border border-amber-200",
                  )}
                >
                  <span className="font-medium text-slate-600">
                    Estimasi Margin
                  </span>
                  <span className="font-bold">
                    {fmt(formData.sell_price - formData.cost_price)}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      (
                      {getMargin(
                        formData.cost_price,
                        formData.sell_price,
                      ).toFixed(1)}
                      %)
                    </span>
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Stok Awal</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, stock: e.target.value }))
                    }
                    className="h-9 border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Minimum Stok Alert
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="5"
                    value={formData.min_stock_threshold}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        min_stock_threshold: e.target.value,
                      }))
                    }
                    className="h-9 border-slate-200"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                disabled={creating}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={creating}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {creating
                  ? editingProduct
                    ? "Menyimpan..."
                    : "Menambahkan..."
                  : editingProduct
                    ? "Simpan Perubahan"
                    : "Tambah Produk"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Adjust Stock ── */}
        <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Sesuaikan Stok
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                {selectedProduct && (
                  <>
                    <strong>{selectedProduct.name}</strong>
                    {" · "}Stok saat ini:{" "}
                    <strong className="text-slate-800">
                      {selectedProduct.stock} {selectedProduct.unit}
                    </strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex gap-2">
                {(["add", "remove"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAdjType(type)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-semibold transition-all",
                      adjType === type
                        ? type === "add"
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "bg-red-600 border-red-600 text-white"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50",
                    )}
                  >
                    {type === "add" ? (
                      <Plus className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                    {type === "add" ? "Tambah Stok" : "Kurangi Stok"}
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Jumlah</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Masukkan jumlah"
                  value={adjQty}
                  onChange={(e) => setAdjQty(e.target.value)}
                  className="h-9 border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Catatan (opsional)
                </Label>
                <Textarea
                  placeholder="Alasan penyesuaian..."
                  rows={2}
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="border-slate-200 text-sm resize-none"
                />
              </div>
              {selectedProduct && adjQty && parseInt(adjQty) > 0 && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Stok setelah penyesuaian
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {selectedProduct.stock +
                      (adjType === "add"
                        ? parseInt(adjQty) || 0
                        : -(parseInt(adjQty) || 0))}{" "}
                    {selectedProduct.unit}
                  </span>
                </div>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAdjustOpen(false)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleAdjustStock}
                className="bg-slate-900 hover:bg-slate-800"
              >
                Konfirmasi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Delete ── */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Produk</AlertDialogTitle>
              <AlertDialogDescription>
                Produk <strong>{selectedProduct?.name}</strong> akan
                dinonaktifkan. Anda dapat mengaktifkannya kembali jika
                diperlukan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedProduct(null)}>
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => selectedProduct && handleDelete(selectedProduct)}
              >
                Ya, Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Dialog: Bulk Delete ── */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus {selected.size} Produk</AlertDialogTitle>
              <AlertDialogDescription>
                {selected.size} produk yang dipilih akan dinonaktifkan
                sekaligus. Tindakan ini dapat dibatalkan dengan mengaktifkan
                kembali produk tersebut.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={handleBulkDelete}
              >
                Hapus {selected.size} Produk
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Dialog: Stock History ── */}
        <StockHistory
          productId={selectedProduct?.id ?? null}
          productName={selectedProduct?.name ?? ""}
          open={historyOpen}
          onOpenChange={setHistoryOpen}
        />

        {/* ── Dialog: Image Upload ── */}
        <Dialog open={imageOpen} onOpenChange={setImageOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Gambar Produk</DialogTitle>
              <DialogDescription>
                Upload atau ganti gambar untuk{" "}
                <strong>{selectedProduct?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <ProductImageUpload
                productId={selectedProduct.id}
                productName={selectedProduct.name}
                currentImageUrl={selectedProduct.image_url}
                onImageUpdate={(url) => {
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.id === selectedProduct.id
                        ? { ...p, image_url: url }
                        : p,
                    ),
                  );
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
