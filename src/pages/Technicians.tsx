import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  RefreshCw,
  Wrench,
  Clock,
  UserCheck,
  AlertCircle,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  Activity,
  Users,
  Star,
  MoreHorizontal,
  Download,
  ExternalLink,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Teknisi {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  total_jobs_completed: number;
  avatar_url: string | null;
  active_jobs_count: number;
  rating?: number | null;
  technician_level?: string | null;
}

type FilterStatus =
  | "semua"
  | "tersedia"
  | "bertugas"
  | "terkunci"
  | "tidak_bertugas";

const STATUS_CONFIG = {
  tersedia: {
    label: "Tersedia",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  bertugas: {
    label: "Bertugas",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Wrench,
  },
  terkunci: {
    label: "Terkunci",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    icon: AlertCircle,
  },
  tidak_bertugas: {
    label: "Tidak Bertugas",
    dot: "bg-slate-400",
    badge: "bg-slate-50 text-slate-600 border-slate-200",
    icon: Clock,
  },
};

function getEffectiveStatus(
  status: string,
  activeJobs: number,
): keyof typeof STATUS_CONFIG {
  if (status === "locked") return "terkunci";
  if (status === "off_duty") return "tidak_bertugas";
  if (activeJobs > 0) return "bertugas";
  return "tersedia";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function StarRating({ rating }: { rating: number | null | undefined }) {
  const val = rating ?? 0;
  return (
    <div className="flex items-center gap-1">
      <Star
        className={cn(
          "h-3.5 w-3.5",
          val > 0 ? "fill-amber-400 text-amber-400" : "text-slate-300",
        )}
      />
      <span className="text-sm font-medium text-slate-700">
        {val > 0 ? val.toFixed(1) : "—"}
      </span>
    </div>
  );
}

export default function Teknisi() {
  const navigate = useNavigate();
  const [teknisi, setTeknisi] = useState<Teknisi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("semua");
  const { toast } = useToast();

  const stats = {
    total: teknisi.length,
    tersedia: teknisi.filter(
      (t) => getEffectiveStatus(t.status, t.active_jobs_count) === "tersedia",
    ).length,
    bertugas: teknisi.filter((t) => t.active_jobs_count > 0).length,
    pekerjaanAktif: teknisi.reduce((sum, t) => sum + t.active_jobs_count, 0),
  };

  useEffect(() => {
    fetchTeknisi();
  }, []);

  const fetchTeknisi = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select(`*, active_jobs:invoice_services!assigned_technician_id(count)`)
        .eq("role", "technician")
        .order("name");
      if (error) throw error;
      setTeknisi(
        data?.map((t) => ({
          ...t,
          total_jobs_completed: t.total_jobs_completed || 0,
          active_jobs_count: t.active_jobs?.[0]?.count || 0,
        })) || [],
      );
    } catch {
      toast({ variant: "destructive", title: "Gagal memuat data teknisi" });
    } finally {
      setLoading(false);
    }
  };

  const filteredTeknisi = teknisi.filter((t) => {
    const cocokCari =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase());
    const statusEfektif = getEffectiveStatus(t.status, t.active_jobs_count);
    const cocokFilter =
      filterStatus === "semua" ||
      (filterStatus === "tersedia" && statusEfektif === "tersedia") ||
      (filterStatus === "bertugas" && statusEfektif === "bertugas") ||
      (filterStatus === "terkunci" && statusEfektif === "terkunci") ||
      (filterStatus === "tidak_bertugas" && statusEfektif === "tidak_bertugas");
    return cocokCari && cocokFilter;
  });

  const filterLabels: Record<FilterStatus, string> = {
    semua: "Semua",
    tersedia: "Tersedia",
    bertugas: "Bertugas",
    terkunci: "Terkunci",
    tidak_bertugas: "Tidak Bertugas",
  };

  return (
    <DashboardLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .tek-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .stat-card { transition: box-shadow 0.18s, transform 0.18s; }
        .stat-card:hover { box-shadow: 0 8px 32px -4px rgba(15,23,42,0.10); transform: translateY(-1px); }
        .tek-row { transition: background 0.12s; cursor: pointer; }
        .tek-row:hover { background: #f8fafc; }
        .tek-row:hover .row-action { opacity: 1; }
        .row-action { opacity: 0; transition: opacity 0.15s; }
        .filter-pill { transition: all 0.15s; border-radius: 99px; }
        .filter-pill.active { background: #0f172a; color: #fff; border-color: #0f172a; }
        .filter-pill:not(.active):hover { background: #f1f5f9; }
        .shimmer { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        .info-banner { background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%); }
      `}</style>

      <div className="tek-root space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Manajemen SDM
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Data Teknisi
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Monitor aktivitas dan performa tim teknisi lapangan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 text-slate-600 border-slate-200 hover:border-slate-300"
              onClick={() => navigate("/jobs?status=pending")}
            >
              <Briefcase className="h-3.5 w-3.5" />
              Pekerjaan Pending
            </Button>

            {/* Tombol mengarah ke Manajemen User — satu pintu buat akun */}
            <Button
              size="sm"
              className="h-9 gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
              onClick={() => navigate("/users")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Tambah Teknisi
            </Button>
          </div>
        </div>

        {/* ── Info Banner: Menjelaskan alur ke user ── */}
        <div className="info-banner rounded-xl border border-blue-100 px-5 py-3.5 flex items-start gap-3">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">
              Cara menambah teknisi baru
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Teknisi baru dibuat melalui{" "}
              <button
                onClick={() => navigate("/users")}
                className="font-bold underline hover:text-blue-800"
              >
                Manajemen User
              </button>{" "}
              — buat akun dengan role <strong>Teknisi</strong>, lalu akun
              tersebut otomatis muncul di halaman ini.
            </p>
          </div>
        </div>

        {/* ── KPI Stats ── */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Total Teknisi",
              value: stats.total,
              sub: "terdaftar",
              icon: Users,
              color: "text-blue-600",
              bg: "bg-blue-50",
              border: "border-blue-100",
            },
            {
              label: "Tersedia",
              value: stats.tersedia,
              sub: `${stats.total ? Math.round((stats.tersedia / stats.total) * 100) : 0}% dari tim`,
              icon: CheckCircle2,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              border: "border-emerald-100",
              showBar: true,
            },
            {
              label: "Sedang Bertugas",
              value: stats.bertugas,
              sub: "sedang mengerjakan",
              icon: Wrench,
              color: "text-amber-600",
              bg: "bg-amber-50",
              border: "border-amber-100",
            },
            {
              label: "Pekerjaan Aktif",
              value: stats.pekerjaanAktif,
              sub: "sedang berjalan",
              icon: Activity,
              color: "text-violet-600",
              bg: "bg-violet-50",
              border: "border-violet-100",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`stat-card bg-white rounded-xl border ${s.border} p-5`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    {s.label}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-2 leading-none tabular-nums">
                    {s.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5">{s.sub}</p>
                </div>
                <div className={`${s.bg} rounded-lg p-2.5`}>
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
              </div>
              {s.showBar && stats.total > 0 && (
                <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{
                      width: `${(stats.tersedia / stats.total) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Tabel Teknisi ── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              {(Object.keys(filterLabels) as FilterStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "filter-pill text-xs font-semibold px-3 py-1.5 border transition-all",
                    filterStatus === s
                      ? "active"
                      : "border-slate-200 text-slate-600",
                  )}
                >
                  {filterLabels[s]}
                  {s !== "semua" && (
                    <span
                      className={cn(
                        "ml-1.5 text-[10px] font-bold",
                        filterStatus === s ? "text-white/70" : "text-slate-400",
                      )}
                    >
                      {
                        teknisi.filter(
                          (t) =>
                            getEffectiveStatus(
                              t.status,
                              t.active_jobs_count,
                            ) === s.replace("semua", ""),
                        ).length
                      }
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Cari teknisi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 w-52 text-sm border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-slate-900"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500"
                onClick={fetchTeknisi}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", loading && "animate-spin")}
                />
              </Button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="shimmer h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="shimmer h-3 w-40 rounded" />
                    <div className="shimmer h-2.5 w-56 rounded" />
                  </div>
                  <div className="shimmer h-6 w-20 rounded-full" />
                  <div className="shimmer h-3 w-8 rounded" />
                  <div className="shimmer h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : filteredTeknisi.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Tidak ada teknisi ditemukan
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Coba ubah filter atau kata pencarian
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-4 gap-2 text-xs"
                onClick={() => navigate("/users")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Tambah Teknisi di Manajemen User
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                    {[
                      "Teknisi",
                      "Kontak",
                      "Status",
                      "Pekerjaan Aktif",
                      "Selesai",
                      "Rating",
                      "",
                    ].map((h) => (
                      <TableHead
                        key={h}
                        className="text-[11px] font-bold uppercase tracking-wide text-slate-400 py-3 first:pl-5"
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeknisi.map((t) => {
                    const statusKey = getEffectiveStatus(
                      t.status,
                      t.active_jobs_count,
                    );
                    const cfg = STATUS_CONFIG[statusKey];
                    const StatusIcon = cfg.icon;

                    return (
                      <TableRow
                        key={t.id}
                        className="tek-row border-slate-100"
                        onClick={() => navigate(`/technicians/${t.id}`)}
                      >
                        {/* Teknisi */}
                        <TableCell className="pl-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={t.avatar_url || undefined} />
                                <AvatarFallback
                                  className={`bg-gradient-to-br ${getAvatarColor(t.name)} text-white text-xs font-bold`}
                                >
                                  {getInitials(t.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${cfg.dot}`}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">
                                {t.name}
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">
                                {t.technician_level
                                  ? `Level ${t.technician_level}`
                                  : "Teknisi Lapangan"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Kontak */}
                        <TableCell
                          className="py-3.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="space-y-1">
                            {t.phone && (
                              <a
                                href={`tel:${t.phone}`}
                                className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 w-fit"
                              >
                                📞 {t.phone}
                              </a>
                            )}
                            <a
                              href={`mailto:${t.email}`}
                              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 w-fit"
                            >
                              ✉️ {t.email}
                            </a>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </TableCell>

                        {/* Pekerjaan Aktif */}
                        <TableCell
                          className="py-3.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "text-xl font-bold tabular-nums",
                                t.active_jobs_count > 0
                                  ? "text-slate-900"
                                  : "text-slate-300",
                              )}
                            >
                              {t.active_jobs_count}
                            </span>
                            {t.active_jobs_count > 0 && (
                              <button
                                onClick={() =>
                                  navigate(`/jobs?technician=${t.id}`)
                                }
                                className="text-[11px] font-semibold text-blue-600 hover:underline"
                              >
                                Lihat →
                              </button>
                            )}
                          </div>
                        </TableCell>

                        {/* Selesai */}
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3 w-3 text-slate-400" />
                            <span className="text-sm font-bold text-slate-800 tabular-nums">
                              {t.total_jobs_completed}
                            </span>
                            <span className="text-xs text-slate-400">
                              pekerjaan
                            </span>
                          </div>
                        </TableCell>

                        {/* Rating */}
                        <TableCell className="py-3.5">
                          <StarRating rating={t.rating} />
                        </TableCell>

                        {/* Aksi */}
                        <TableCell
                          className="py-3.5 pr-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="row-action h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-44 text-sm"
                            >
                              <DropdownMenuItem
                                onClick={() => navigate(`/technicians/${t.id}`)}
                              >
                                Lihat Profil
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/jobs?technician=${t.id}`)
                                }
                              >
                                Lihat Pekerjaan
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                                onClick={() => navigate("/users")}
                              >
                                Edit di Manajemen User
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

          {/* Footer */}
          {!loading && filteredTeknisi.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-400">
                Menampilkan{" "}
                <span className="font-semibold text-slate-600">
                  {filteredTeknisi.length}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-slate-600">
                  {teknisi.length}
                </span>{" "}
                teknisi
              </p>
              <button className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 hover:underline">
                <Download className="h-3 w-3" />
                Ekspor CSV
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
