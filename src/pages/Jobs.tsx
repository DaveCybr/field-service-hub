import { useToast } from "@/hooks/use-toast";
import { ServiceTeamManager } from "@/components/technician/ServiceTeamManager";
import { DataTableServer } from "@/components/ui/data-table";
import {
  createJobColumns,
  Job,
  JobColumnActions,
} from "@/components/jobs/columns";
import { useServerPagination } from "@/hooks/useServerPagination";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  MapPin,
  Users,
  RefreshCw,
  Wrench,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { DialogHeader } from "@/components/ui/dialog";
import { supabase } from "@/services/technicianService";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@radix-ui/react-dialog";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

const STATUS_TABS = [
  { value: "all", label: "Semua", count: null },
  { value: "pending", label: "Menunggu", color: "#d97706" },
  { value: "assigned", label: "Ditugaskan", color: "#2563eb" },
  { value: "in_progress", label: "Dikerjakan", color: "#7c3aed" },
  { value: "completed", label: "Selesai", color: "#16a34a" },
  { value: "cancelled", label: "Dibatalkan", color: "#9ca3af" },
];

const STAT_CARDS = [
  {
    key: "pending",
    label: "Menunggu",
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    key: "assigned",
    label: "Ditugaskan",
    icon: User,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    key: "in_progress",
    label: "Dikerjakan",
    icon: Wrench,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    key: "completed",
    label: "Selesai",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
];

export default function Jobs() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState({
    pending: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
  });

  const {
    data: jobs,
    loading,
    pageCount,
    totalRows,
    pagination,
    setPagination,
    refetch,
  } = useServerPagination<Job>({
    table: "invoice_services",
    select: `*, invoice:invoices!inner(id,invoice_number,customer:customers(name,phone)), unit:units(unit_type,brand)`,
    orderBy: { column: "created_at", ascending: false },
    filters: { status: statusFilter },
    searchColumn: "title",
    searchValue,
    initialPageSize: 10,
  });

  useEffect(() => {
    fetchStats();
  }, []);
  useEffect(() => {
    if (jobs.length > 0) fetchTeamCounts();
  }, [jobs]);

  const fetchStats = async () => {
    const [p, a, ip, c] = await Promise.all([
      supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .eq("status", "assigned"),
      supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_progress"),
      supabase
        .from("invoice_services")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
    ]);
    setStats({
      pending: p.count || 0,
      assigned: a.count || 0,
      in_progress: ip.count || 0,
      completed: c.count || 0,
    });
  };

  const fetchTeamCounts = async () => {
    const ids = jobs.map((j) => j.id);
    const { data } = await supabase
      .from("service_technician_assignments")
      .select("service_id")
      .in("service_id", ids);
    const counts = data?.reduce((acc: Record<string, number>, a) => {
      if (a.service_id) acc[a.service_id] = (acc[a.service_id] || 0) + 1;
      return acc;
    }, {});
    setTeamCounts(counts || {});
  };

  const jobsWithTeam = useMemo(
    () => jobs.map((j) => ({ ...j, team_count: teamCounts[j.id] || 0 })),
    [jobs, teamCounts],
  );

  const columnActions: JobColumnActions = {
    onViewDetails: (j) => navigate(`/jobs/${j.id}`),
    onManageTeam: (j) => {
      setSelectedJob(j);
      setTeamDialogOpen(true);
    },
    onViewInvoice: (j) => navigate(`/invoices/${j.invoice.invoice_number}`),
    onCopyId: (j) => {
      navigator.clipboard.writeText(j.id);
      toast({ title: "Tersalin!", description: "ID pekerjaan disalin" });
    },
  };

  const columns = createJobColumns(columnActions);

  const statsData = stats as Record<string, number>;

  return (
    <DashboardLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .jobs-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .stat-card { transition: box-shadow 0.18s, transform 0.18s; cursor: pointer; }
        .stat-card:hover { box-shadow: 0 8px 32px -4px rgba(15,23,42,0.10); transform: translateY(-1px); }
        .stat-card.active { ring: 2px; }
        .tab-pill { border-radius: 99px; transition: all 0.15s; white-space: nowrap; }
        .tab-pill.active { background: #0f172a; color: #fff; border-color: #0f172a; }
        .tab-pill:not(.active):hover { background: #f1f5f9; }
        .shimmer { background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation: shimmer 1.4s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .jobs-fade { animation: fadeUp 0.2s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .bulk-bar { animation: slideDown 0.2s ease; }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
      `}</style>

      <div className="jobs-root jobs-fade space-y-5">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Operasional
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Manajemen Pekerjaan
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola dan tugaskan pekerjaan service ke tim teknisi
            </p>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            />
            Refresh
          </button>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(({ key, label, icon: Icon, color, bg, border }) => {
            const isActive = statusFilter === key;
            return (
              <div
                key={key}
                className={cn(
                  "stat-card bg-white rounded-xl border p-5",
                  border,
                  isActive && "ring-2 ring-slate-900 ring-offset-1",
                )}
                onClick={() =>
                  setStatusFilter((f) => (f === key ? "all" : key))
                }
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p
                      className={cn(
                        "text-[11px] font-bold uppercase tracking-wide",
                        isActive ? "text-slate-700" : "text-slate-400",
                      )}
                    >
                      {label}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 mt-2 leading-none tabular-nums">
                      {statsData[key] ?? 0}
                    </p>
                    <p className="text-xs text-slate-400 mt-1.5">pekerjaan</p>
                  </div>
                  <div className={cn("rounded-lg p-2.5", bg)}>
                    <Icon className={cn("h-5 w-5", color)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Bulk Action Bar ── */}
        {selectedJobs.length > 0 && (
          <div className="bulk-bar flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl">
            <span className="text-sm font-semibold">
              {selectedJobs.length} pekerjaan dipilih
            </span>
            <div className="h-4 w-px bg-white/20" />
            <button
              onClick={() =>
                toast({
                  title: "Tugaskan Massal",
                  description: `${selectedJobs.length} pekerjaan akan diproses`,
                })
              }
              className="flex items-center gap-2 text-sm font-semibold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              Tugaskan Massal
            </button>
            <button
              onClick={() => setSelectedJobs([])}
              className="ml-auto text-xs text-white/60 hover:text-white transition-colors"
            >
              Batalkan pilihan
            </button>
          </div>
        )}

        {/* ── Table Card ── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Toolbar: Tab Filters */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const count =
                tab.value !== "all" ? (statsData[tab.value] ?? 0) : null;
              const isActive = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={cn(
                    "tab-pill text-xs font-semibold px-3 py-1.5 border shrink-0",
                    isActive
                      ? "active border-slate-900"
                      : "border-slate-200 text-slate-600",
                  )}
                >
                  {tab.label}
                  {count !== null && count > 0 && (
                    <span
                      className={cn(
                        "ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* DataTable */}
          <div className="p-4">
            <DataTableServer
              columns={columns}
              data={jobsWithTeam}
              pageCount={pageCount}
              totalRows={totalRows}
              pagination={pagination}
              onPaginationChange={setPagination}
              loading={loading}
              searchKey="title"
              searchPlaceholder="Cari berdasarkan judul pekerjaan..."
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              onRowClick={(job) => navigate(`/jobs/${job.id}`)}
              onSelectionChange={setSelectedJobs}
              enableMultiSelect={true}
              enableColumnVisibility={true}
              emptyMessage="Tidak ada pekerjaan"
              emptyDescription="Pekerjaan akan muncul di sini ketika faktur dengan service dibuat."
            />
          </div>
        </div>
      </div>

      {/* ── Team Dialog ── */}
      <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
        <DialogContent
          className="max-w-2xl"
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Kelola Tim Service
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {selectedJob && (
                <span className="flex items-center gap-2 mt-1">
                  <span className="font-semibold text-slate-700">
                    {selectedJob.title}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                    {selectedJob.invoice.invoice_number}
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 pt-2">
            {selectedJob?.service_address && (
              <div className="flex items-start gap-3 bg-slate-50 rounded-lg p-3.5 border border-slate-200">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-0.5">
                    Alamat Service
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedJob.service_address}
                  </p>
                </div>
              </div>
            )}
            {selectedJob && (
              <ServiceTeamManager
                serviceId={selectedJob.id}
                invoiceId={selectedJob.invoice.id}
                onTeamUpdated={() => {
                  refetch();
                  fetchTeamCounts();
                  setTeamDialogOpen(false);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
