// ============================================
// FILE: src/pages/Jobs.tsx
// Enterprise-grade Jobs management page
// ============================================
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Filter,
  Wrench,
} from "lucide-react";

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? "#eff6ff" : "white",
        borderRadius: "12px",
        border: active ? "1.5px solid #bfdbfe" : "1px solid #e5e7eb",
        padding: "20px",
        cursor: onClick ? "pointer" : "default",
        boxShadow: active
          ? "0 0 0 3px rgba(37,99,235,0.08)"
          : "0 1px 2px rgba(0,0,0,0.04)",
        transition: "all 0.15s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: active ? "#2563eb" : "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: 0,
          }}
        >
          {label}
        </p>
        <div
          style={{ background: iconBg, borderRadius: "8px", padding: "7px" }}
        >
          <Icon style={{ width: "15px", height: "15px", color: iconColor }} />
        </div>
      </div>
      <p
        style={{
          fontSize: "30px",
          fontWeight: 700,
          color: active ? "#1d4ed8" : "#111827",
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; dot: string }
> = {
  pending: {
    label: "Menunggu",
    color: "#92400e",
    bg: "#fef9c3",
    dot: "#d97706",
  },
  assigned: {
    label: "Ditugaskan",
    color: "#1e40af",
    bg: "#dbeafe",
    dot: "#2563eb",
  },
  in_progress: {
    label: "Dikerjakan",
    color: "#5b21b6",
    bg: "#ede9fe",
    dot: "#7c3aed",
  },
  completed: {
    label: "Selesai",
    color: "#14532d",
    bg: "#dcfce7",
    dot: "#16a34a",
  },
  cancelled: {
    label: "Dibatalkan",
    color: "#374151",
    bg: "#f3f4f6",
    dot: "#9ca3af",
  },
};

// ── Tab Filter ────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Menunggu" },
  { value: "assigned", label: "Ditugaskan" },
  { value: "in_progress", label: "Dikerjakan" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

// ── Main Component ────────────────────────────────────────────────────────────
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
    select: `*,
      invoice:invoices!inner(id,invoice_number,customer:customers(name,phone)),
      unit:units(unit_type,brand)`,
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

  return (
    <DashboardLayout>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
        .jobs-fade { animation: fadeIn 0.2s ease; }
        .tab-btn { background:none; border:none; cursor:pointer; transition:all 0.15s; }
        .tab-btn:hover { background: #f3f4f6; }
      `}</style>

      <div
        className="jobs-fade"
        style={{ display: "flex", flexDirection: "column", gap: "20px" }}
      >
        {/* ── Page Header ── */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#111827",
                margin: "0 0 4px",
                letterSpacing: "-0.01em",
              }}
            >
              Manajemen Pekerjaan
            </h1>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
              Kelola dan tugaskan pekerjaan service ke tim teknisi
            </p>
          </div>
          <button
            onClick={refetch}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "8px",
              background: "white",
              border: "1px solid #e5e7eb",
              color: "#374151",
              fontSize: "13px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              transition: "all 0.15s",
            }}
          >
            <RefreshCw
              style={{ width: "14px", height: "14px" }}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* ── Stats ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: "14px",
          }}
        >
          <StatCard
            label="Menunggu"
            value={stats.pending}
            icon={AlertCircle}
            iconColor="#d97706"
            iconBg="#fef9c3"
            active={statusFilter === "pending"}
            onClick={() =>
              setStatusFilter((f) => (f === "pending" ? "all" : "pending"))
            }
          />
          <StatCard
            label="Ditugaskan"
            value={stats.assigned}
            icon={User}
            iconColor="#2563eb"
            iconBg="#dbeafe"
            active={statusFilter === "assigned"}
            onClick={() =>
              setStatusFilter((f) => (f === "assigned" ? "all" : "assigned"))
            }
          />
          <StatCard
            label="Dikerjakan"
            value={stats.in_progress}
            icon={Clock}
            iconColor="#7c3aed"
            iconBg="#ede9fe"
            active={statusFilter === "in_progress"}
            onClick={() =>
              setStatusFilter((f) =>
                f === "in_progress" ? "all" : "in_progress",
              )
            }
          />
          <StatCard
            label="Selesai"
            value={stats.completed}
            icon={CheckCircle2}
            iconColor="#16a34a"
            iconBg="#dcfce7"
            active={statusFilter === "completed"}
            onClick={() =>
              setStatusFilter((f) => (f === "completed" ? "all" : "completed"))
            }
          />
        </div>

        {/* ── Table Card ── */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {/* Table toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderBottom: "1px solid #f3f4f6",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {/* Status tabs */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "2px",
                background: "#f3f4f6",
                borderRadius: "8px",
                padding: "3px",
              }}
            >
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  className="tab-btn"
                  onClick={() => setStatusFilter(tab.value)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: statusFilter === tab.value ? "#111827" : "#6b7280",
                    background: statusFilter === tab.value ? "white" : "none",
                    boxShadow:
                      statusFilter === tab.value
                        ? "0 1px 2px rgba(0,0,0,0.08)"
                        : "none",
                  }}
                >
                  {tab.label}
                  {tab.value !== "all" &&
                    stats[tab.value as keyof typeof stats] > 0 && (
                      <span
                        style={{
                          marginLeft: "5px",
                          background:
                            statusFilter === tab.value ? "#2563eb" : "#d1d5db",
                          color:
                            statusFilter === tab.value ? "white" : "#6b7280",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "0px 5px",
                          borderRadius: "20px",
                        }}
                      >
                        {stats[tab.value as keyof typeof stats]}
                      </span>
                    )}
                </button>
              ))}
            </div>

            {/* Right: selection info */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {selectedJobs.length > 0 && (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      background: "#eff6ff",
                      color: "#2563eb",
                      fontSize: "12px",
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: "20px",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    {selectedJobs.length} dipilih
                  </span>
                  <button
                    onClick={() =>
                      toast({
                        title: "Aksi Massal",
                        description: `${selectedJobs.length} pekerjaan dipilih`,
                      })
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 12px",
                      borderRadius: "7px",
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Users style={{ width: "13px", height: "13px" }} />
                    Tugaskan Massal
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* DataTable */}
          <div style={{ padding: "16px" }}>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontSize: "16px", fontWeight: 700 }}>
              Kelola Tim Service
            </DialogTitle>
            <DialogDescription>
              {selectedJob && (
                <span>
                  <strong>{selectedJob.title}</strong> ·{" "}
                  {selectedJob.invoice.invoice_number}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              paddingTop: "8px",
            }}
          >
            {selectedJob?.service_address && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "12px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <MapPin
                  style={{
                    width: "15px",
                    height: "15px",
                    color: "#6b7280",
                    marginTop: "1px",
                    flexShrink: 0,
                  }}
                />
                <div>
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#374151",
                      margin: "0 0 2px",
                    }}
                  >
                    Alamat Service
                  </p>
                  <p style={{ fontSize: "13px", color: "#6b7280", margin: 0 }}>
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
