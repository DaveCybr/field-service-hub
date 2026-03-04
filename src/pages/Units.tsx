import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  QrCode,
  Edit,
  Trash2,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Package,
  ShieldCheck,
  ShieldOff,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { EditUnitModal } from "@/components/units/EditUnitModal";
import { DeleteUnitDialog } from "@/components/units/DeleteUnitDialog";
import { RegisterUnitModal } from "@/components/units/RegisterUnitModal";
import { cn } from "@/lib/utils";

interface Unit {
  id: string;
  qr_code: string;
  customer_id: string;
  unit_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  capacity: string | null;
  warranty_expiry_date: string | null;
  created_at: string;
  customer: { id: string; name: string };
}

interface Customer {
  id: string;
  name: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  from: number;
  to: number;
}

type SortField =
  | "qr_code"
  | "unit_type"
  | "brand"
  | "created_at"
  | "warranty_expiry_date";
type SortOrder = "asc" | "desc";

export default function Units() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [units, setUnits] = useState<Unit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    activeWarranty: 0,
    expiredWarranty: 0,
    noWarranty: 0,
  });

  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    itemsPerPage: 20,
    from: 0,
    to: 0,
  });
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [showQRUnit, setShowQRUnit] = useState<Unit | null>(null);

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, []);
  useEffect(() => {
    fetchUnits();
  }, [
    pagination.currentPage,
    pagination.itemsPerPage,
    searchQuery,
    selectedCustomer,
    selectedType,
    sortField,
    sortOrder,
  ]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .eq("blacklisted", false)
      .order("name");
    if (data) setCustomers(data);
  };

  const fetchStats = async () => {
    const { count: total } = await supabase
      .from("units")
      .select("*", { count: "exact", head: true });
    const now = new Date().toISOString();
    const { count: active } = await supabase
      .from("units")
      .select("*", { count: "exact", head: true })
      .gt("warranty_expiry_date", now);
    const { count: expired } = await supabase
      .from("units")
      .select("*", { count: "exact", head: true })
      .lt("warranty_expiry_date", now)
      .not("warranty_expiry_date", "is", null);
    const { count: noWarr } = await supabase
      .from("units")
      .select("*", { count: "exact", head: true })
      .is("warranty_expiry_date", null);
    setStats({
      total: total || 0,
      activeWarranty: active || 0,
      expiredWarranty: expired || 0,
      noWarranty: noWarr || 0,
    });
  };

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const from = (pagination.currentPage - 1) * pagination.itemsPerPage;
      const to = from + pagination.itemsPerPage - 1;

      let query = supabase
        .from("units")
        .select(`*, customer:customers!units_customer_id_fkey (id, name)`, {
          count: "exact",
        });

      if (searchQuery)
        query = query.or(
          `qr_code.ilike.%${searchQuery}%,unit_type.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,model.ilike.%${searchQuery}%,serial_number.ilike.%${searchQuery}%`,
        );
      if (selectedCustomer !== "all")
        query = query.eq("customer_id", selectedCustomer);
      if (selectedType !== "all") query = query.eq("unit_type", selectedType);
      query = query.order(sortField, { ascending: sortOrder === "asc" });

      const { data, error, count } = await query.range(from, to);
      if (error) throw error;

      setUnits(
        data?.map((u) => ({
          ...u,
          customer: Array.isArray(u.customer) ? u.customer[0] : u.customer,
        })) || [],
      );

      const totalCount = count || 0;
      setPagination((prev) => ({
        ...prev,
        totalPages: Math.ceil(totalCount / prev.itemsPerPage),
        totalCount,
        from: totalCount > 0 ? from + 1 : 0,
        to: Math.min(from + prev.itemsPerPage, totalCount),
      }));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memuat data unit",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field)
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-slate-900" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-slate-900" />
    );
  };

  const SortTh = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th className={cn("px-4 py-3 text-left", className)}>
      <button
        onClick={() => handleSort(field)}
        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
      >
        {children} <SortIcon field={field} />
      </button>
    </th>
  );

  const isWarrantyActive = (date: string | null) =>
    date ? new Date(date) > new Date() : false;
  const getUnitTypes = () => Array.from(new Set(units.map((u) => u.unit_type)));

  const handleDownloadQR = (unit: Unit) => {
    const svg = document.getElementById(`qr-${unit.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 300;
      canvas.height = 350;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 300, 350);
        ctx.drawImage(img, 50, 20, 200, 200);
        ctx.fillStyle = "black";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.fillText(unit.qr_code, 150, 250);
        ctx.font = "12px Arial";
        ctx.fillText(unit.unit_type, 150, 275);
        if (unit.brand || unit.model)
          ctx.fillText(
            `${unit.brand || ""} ${unit.model || ""}`.trim(),
            150,
            295,
          );
        ctx.fillText(unit.customer.name, 150, 315);
        const link = document.createElement("a");
        link.download = `QR-${unit.qr_code}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    };
    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const STAT_CARDS = [
    {
      key: "total",
      label: "Total Unit",
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      key: "activeWarranty",
      label: "Garansi Aktif",
      icon: ShieldCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    {
      key: "expiredWarranty",
      label: "Garansi Expired",
      icon: ShieldOff,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    {
      key: "noWarranty",
      label: "Tanpa Garansi",
      icon: Users,
      color: "text-slate-500",
      bg: "bg-slate-50",
      border: "border-slate-200",
    },
  ];

  return (
    <DashboardLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .units-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .units-fade { animation: fadeUp 0.2s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .stat-card { transition: box-shadow 0.18s, transform 0.18s; }
        .stat-card:hover { box-shadow: 0 8px 32px -4px rgba(15,23,42,0.10); transform: translateY(-1px); }
        .trow { transition: background 0.1s; }
        .trow:hover { background: #f8fafc; }
      `}</style>

      <div className="units-root units-fade space-y-5">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Inventaris
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Manajemen Unit
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola dan lacak semua unit terdaftar
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchUnits();
                fetchStats();
              }}
              disabled={loading}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
              Refresh
            </button>
            <button
              onClick={() => setRegisterModalOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Daftarkan Unit
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ key, label, icon: Icon, color, bg, border }) => (
            <div
              key={key}
              className={cn("stat-card bg-white rounded-xl border p-5", border)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {label}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-2 leading-none tabular-nums">
                    {(stats as any)[key]}
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5">unit</p>
                </div>
                <div className={cn("rounded-lg p-2.5", bg)}>
                  <Icon className={cn("h-5 w-5", color)} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                placeholder="Cari QR, tipe, merek, model..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination((p) => ({ ...p, currentPage: 1 }));
                }}
                className="w-full h-8 pl-9 pr-3 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
              />
            </div>
            <Select
              value={selectedCustomer}
              onValueChange={(v) => {
                setSelectedCustomer(v);
                setPagination((p) => ({ ...p, currentPage: 1 }));
              }}
            >
              <SelectTrigger className="w-[180px] h-8 text-sm border-slate-200">
                <SelectValue placeholder="Semua Pelanggan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pelanggan</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedType}
              onValueChange={(v) => {
                setSelectedType(v);
                setPagination((p) => ({ ...p, currentPage: 1 }));
              }}
            >
              <SelectTrigger className="w-[150px] h-8 text-sm border-slate-200">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {getUnitTypes().map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {pagination.totalCount > 0 && (
              <span className="ml-auto text-xs text-slate-400 font-medium shrink-0">
                {pagination.totalCount.toLocaleString("id-ID")} unit
              </span>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-100 bg-slate-50/50">
                <tr>
                  <SortTh field="qr_code">QR Code</SortTh>
                  <SortTh field="unit_type">Tipe</SortTh>
                  <SortTh field="brand">Merek / Model</SortTh>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    No. Seri
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Pelanggan
                  </th>
                  <SortTh field="warranty_expiry_date">Garansi</SortTh>
                  <SortTh field="created_at">Terdaftar</SortTh>
                  <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <RefreshCw className="h-5 w-5 animate-spin text-slate-300 mx-auto" />
                    </td>
                  </tr>
                ) : units.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center">
                      <Package className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-400">
                        {searchQuery ||
                        selectedCustomer !== "all" ||
                        selectedType !== "all"
                          ? "Tidak ada unit yang cocok dengan filter"
                          : "Belum ada unit yang terdaftar"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  units.map((unit) => (
                    <tr
                      key={unit.id}
                      className="trow cursor-pointer"
                      onClick={() => navigate(`/units/${unit.id}`)}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowQRUnit(
                              showQRUnit?.id === unit.id ? null : unit,
                            );
                          }}
                          className="flex items-center gap-2 group"
                        >
                          <div className="bg-slate-100 group-hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                            <QrCode className="h-3.5 w-3.5 text-slate-500" />
                          </div>
                          <span className="font-mono text-sm font-semibold text-slate-700">
                            {unit.qr_code}
                          </span>
                        </button>
                        {showQRUnit?.id === unit.id && (
                          <div
                            className="mt-2 p-3 bg-white rounded-lg border border-slate-200 inline-block shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <QRCodeSVG
                              id={`qr-${unit.id}`}
                              value={unit.qr_code}
                              size={100}
                              level="H"
                              includeMargin
                            />
                            <button
                              onClick={() => handleDownloadQR(unit)}
                              className="mt-2 w-full flex items-center justify-center gap-1.5 h-7 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                            >
                              <Download className="h-3 w-3" /> Download
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-slate-800">
                          {unit.unit_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-slate-800">
                          {unit.brand || "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {unit.model || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-500">
                          {unit.serial_number || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">
                          {unit.customer.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {unit.warranty_expiry_date ? (
                          <div>
                            {isWarrantyActive(unit.warranty_expiry_date) ? (
                              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 w-fit">
                                <ShieldCheck className="h-3 w-3" /> Aktif
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 w-fit">
                                <ShieldOff className="h-3 w-3" /> Expired
                              </span>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              {format(
                                new Date(unit.warranty_expiry_date),
                                "d MMM yyyy",
                              )}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-500">
                          {format(new Date(unit.created_at), "d MMM yyyy")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => navigate(`/units/${unit.id}`)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUnit(unit);
                              setEditModalOpen(true);
                            }}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUnit(unit);
                              setDeleteDialogOpen(true);
                            }}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && pagination.totalCount > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">
                    Tampilkan
                  </span>
                  <Select
                    value={pagination.itemsPerPage.toString()}
                    onValueChange={(v) =>
                      setPagination((p) => ({
                        ...p,
                        itemsPerPage: parseInt(v),
                        currentPage: 1,
                      }))
                    }
                  >
                    <SelectTrigger className="h-7 w-[60px] text-xs border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 20, 50, 100].map((n) => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-xs text-slate-400">
                  {pagination.from}–{pagination.to} dari{" "}
                  {pagination.totalCount.toLocaleString("id-ID")} unit
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[
                  {
                    icon: ChevronsLeft,
                    action: () =>
                      setPagination((p) => ({ ...p, currentPage: 1 })),
                    disabled: pagination.currentPage === 1,
                  },
                  {
                    icon: ChevronLeft,
                    action: () =>
                      setPagination((p) => ({
                        ...p,
                        currentPage: p.currentPage - 1,
                      })),
                    disabled: pagination.currentPage === 1,
                  },
                  {
                    icon: ChevronRight,
                    action: () =>
                      setPagination((p) => ({
                        ...p,
                        currentPage: p.currentPage + 1,
                      })),
                    disabled: pagination.currentPage === pagination.totalPages,
                  },
                  {
                    icon: ChevronsRight,
                    action: () =>
                      setPagination((p) => ({
                        ...p,
                        currentPage: pagination.totalPages,
                      })),
                    disabled: pagination.currentPage === pagination.totalPages,
                  },
                ].map(({ icon: Icon, action, disabled }, i) => (
                  <button
                    key={i}
                    onClick={action}
                    disabled={disabled || loading}
                    className="h-7 w-7 rounded-lg flex items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <RegisterUnitModal
        open={registerModalOpen}
        onOpenChange={setRegisterModalOpen}
        onSuccess={() => {
          fetchUnits();
          fetchStats();
        }}
      />
      {selectedUnit && (
        <EditUnitModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          unit={selectedUnit}
          customers={customers}
          onSuccess={() => {
            fetchUnits();
            fetchStats();
          }}
        />
      )}
      {selectedUnit && (
        <DeleteUnitDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          unit={selectedUnit}
          onSuccess={() => {
            fetchUnits();
            fetchStats();
          }}
        />
      )}
    </DashboardLayout>
  );
}
