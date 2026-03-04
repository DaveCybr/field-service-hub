// ============================================
// FILE: src/pages/JobDetail.tsx
// Enterprise-grade — consistent with Jobs.tsx
// ============================================
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Wrench,
  FileText,
  Star,
  ExternalLink,
  ChevronRight,
  Camera,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils/currency";
import { ServiceTeamManager } from "@/components/technician/ServiceTeamManager";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────
interface JobDetail {
  id: string;
  invoice_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  scheduled_date: string | null;
  service_address: string | null;
  service_cost: number;
  parts_cost: number;
  total_cost: number;
  actual_checkin_at: string | null;
  actual_checkout_at: string | null;
  actual_duration_minutes: number | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  technician_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  invoice: {
    id: string;
    invoice_number: string;
    customer: { name: string; phone: string; email: string | null };
  };
  unit: {
    unit_type: string;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
  } | null;
}

interface TeamMember {
  id: string;
  technician: { id: string; name: string; email: string; phone: string | null };
  role: string;
  status: string | null;
}

// ── Config Maps ───────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  pending: {
    label: "Menunggu",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  assigned: {
    label: "Ditugaskan",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  in_progress: {
    label: "Dikerjakan",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
  completed: {
    label: "Selesai",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  cancelled: {
    label: "Dibatalkan",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
};
const PRIORITY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  low: {
    label: "Rendah",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
  normal: {
    label: "Normal",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  high: {
    label: "Tinggi",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  urgent: {
    label: "Mendesak",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};
const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  lead: { label: "Kepala", color: "text-violet-700", bg: "bg-violet-100" },
  senior: { label: "Senior", color: "text-blue-700", bg: "bg-blue-100" },
  junior: { label: "Junior", color: "text-emerald-700", bg: "bg-emerald-100" },
  helper: { label: "Helper", color: "text-slate-600", bg: "bg-slate-100" },
  specialist: {
    label: "Spesialis",
    color: "text-violet-700",
    bg: "bg-violet-100",
  },
};

// ── Reusable Pieces ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
        c.color,
        c.bg,
        c.border,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}
function PriorityBadge({ priority }: { priority: string }) {
  const c = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border",
        c.color,
        c.bg,
        c.border,
      )}
    >
      {c.label}
    </span>
  );
}
function RoleBadge({ role }: { role: string }) {
  const c = ROLE_CONFIG[role] || ROLE_CONFIG.helper;
  return (
    <span
      className={cn(
        "text-xs font-semibold px-2 py-0.5 rounded-full",
        c.color,
        c.bg,
      )}
    >
      {c.label}
    </span>
  );
}

// ── Avatar Helper ─────────────────────────────────────────────────────────────
function getAvatarColor(name: string) {
  const colors = [
    ["#dbeafe", "#1d4ed8"],
    ["#ede9fe", "#6d28d9"],
    ["#dcfce7", "#15803d"],
    ["#fef9c3", "#a16207"],
    ["#fee2e2", "#b91c1c"],
    ["#e0f2fe", "#0369a1"],
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++)
    h = (h + name.charCodeAt(i)) % colors.length;
  return colors[h];
}
function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const [bg, fg] = getAvatarColor(name);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const sizes = {
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-11 w-11 text-sm",
  };
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold flex-shrink-0",
        sizes[size],
      )}
      style={{ background: bg, color: fg }}
    >
      {initials}
    </div>
  );
}

// ── Info Row ──────────────────────────────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
          {label}
        </p>
        <div className="text-sm text-slate-700 font-medium">{value}</div>
      </div>
    </div>
  );
}

// ── Cost Row ─────────────────────────────────────────────────────────────────
function CostRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0",
        bold && "pt-3 border-t-2 border-slate-200",
      )}
    >
      <span
        className={cn(
          "text-sm",
          bold ? "font-bold text-slate-900" : "text-slate-500",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-semibold tabular-nums",
          bold ? "text-base text-slate-900" : "text-sm text-slate-700",
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchJobDetail();
      fetchTeamMembers();
    }
  }, [id]);

  const fetchJobDetail = async () => {
    try {
      const { data, error } = await supabase
        .from("invoice_services")
        .select(
          `*, invoice:invoices!inner(id,invoice_number,customer:customers(name,phone,email)), unit:units(unit_type,brand,model,serial_number)`,
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      setJob(data);
    } catch {
      toast({ variant: "destructive", title: "Gagal memuat detail pekerjaan" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("service_technician_assignments")
      .select(
        `id, role, status, technician:employees!service_technician_assignments_technician_id_fkey(id,name,email,phone)`,
      )
      .eq("service_id", id)
      .order("created_at", { ascending: true });
    setTeamMembers(data || []);
  };

  // ── Loading / Error States ────────────────────────────────────────────────
  if (loading)
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-400 font-medium">
              Memuat detail pekerjaan...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );

  if (!job)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-semibold">
            Pekerjaan tidak ditemukan
          </p>
          <button
            onClick={() => navigate("/jobs")}
            className="text-sm text-blue-600 font-semibold hover:underline"
          >
            ← Kembali ke Pekerjaan
          </button>
        </div>
      </DashboardLayout>
    );

  const lead = teamMembers.find((m) => m.role === "lead");
  const members = teamMembers.filter((m) => m.role !== "lead");

  return (
    <DashboardLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .jd-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .jd-fade { animation: jdFadeUp 0.25s ease both; }
        @keyframes jdFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .jd-card { background: white; border-radius: 14px; border: 1px solid #e2e8f0; }
        .jd-tab { border-radius: 8px; padding: 7px 14px; font-size: 13px; font-weight: 600; transition: all 0.15s; cursor: pointer; border: none; }
        .jd-tab.active { background: #0f172a; color: white; }
        .jd-tab:not(.active) { background: none; color: #64748b; }
        .jd-tab:not(.active):hover { background: #f1f5f9; color: #0f172a; }
        .member-row { transition: background 0.12s; border-radius: 10px; }
        .member-row:hover { background: #f8fafc; }
        .photo-thumb { aspect-ratio:1; border-radius: 10px; overflow: hidden; cursor: pointer; transition: opacity 0.15s, transform 0.15s; }
        .photo-thumb:hover { opacity: 0.85; transform: scale(1.02); }
        .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .lightbox img { max-width: 100%; max-height: 90vh; border-radius: 12px; object-fit: contain; }
      `}</style>

      <div className="jd-root jd-fade space-y-5">
        {/* ── Breadcrumb + Header ── */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
            <button
              onClick={() => navigate("/jobs")}
              className="hover:text-slate-600 transition-colors font-medium"
            >
              Pekerjaan
            </button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-slate-600 font-semibold truncate max-w-[240px]">
              {job.title}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate("/jobs")}
                className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors flex-shrink-0 mt-0.5"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                  {job.title}
                </h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                    {job.invoice.invoice_number}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-400">
                    {format(new Date(job.created_at), "dd MMM yyyy", {
                      locale: localeId,
                    })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={job.status} />
              <PriorityBadge priority={job.priority} />
            </div>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ── Left Column (2/3) ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Tabs */}
            <div className="jd-card overflow-hidden">
              <Tabs defaultValue="detail">
                <div className="flex items-center gap-1 px-4 pt-4 pb-0 border-b border-slate-100">
                  <TabsList className="h-auto bg-transparent p-0 gap-1">
                    {[
                      { value: "detail", label: "Detail" },
                      { value: "progres", label: "Progres" },
                      {
                        value: "foto",
                        label: `Foto${(job.before_photos?.length || 0) + (job.after_photos?.length || 0) > 0 ? ` · ${(job.before_photos?.length || 0) + (job.after_photos?.length || 0)}` : ""}`,
                      },
                      { value: "catatan", label: "Catatan" },
                    ].map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="jd-tab rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none pb-3 rounded-t-lg"
                        style={{
                          borderRadius: "8px 8px 0 0",
                          marginBottom: "-1px",
                        }}
                      >
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                {/* ── Detail Tab ── */}
                <TabsContent value="detail" className="p-5 space-y-0 mt-0">
                  {job.description && (
                    <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                        Deskripsi
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {job.description}
                      </p>
                    </div>
                  )}
                  {job.scheduled_date && (
                    <InfoRow
                      icon={Calendar}
                      label="Jadwal"
                      value={format(
                        new Date(job.scheduled_date),
                        "EEEE, dd MMMM yyyy · HH:mm",
                        { locale: localeId },
                      )}
                    />
                  )}
                  {job.service_address && (
                    <InfoRow
                      icon={MapPin}
                      label="Alamat Service"
                      value={job.service_address}
                    />
                  )}
                  {job.unit && (
                    <InfoRow
                      icon={Package}
                      label="Unit"
                      value={
                        <>
                          <span className="font-semibold">
                            {job.unit.brand} {job.unit.unit_type}
                          </span>
                          {job.unit.model && (
                            <span className="text-slate-500">
                              {" "}
                              · {job.unit.model}
                            </span>
                          )}
                          {job.unit.serial_number && (
                            <span className="text-slate-400 font-mono text-xs ml-1">
                              SN: {job.unit.serial_number}
                            </span>
                          )}
                        </>
                      }
                    />
                  )}
                  <InfoRow
                    icon={Calendar}
                    label="Dibuat"
                    value={format(
                      new Date(job.created_at),
                      "dd MMMM yyyy, HH:mm",
                      { locale: localeId },
                    )}
                  />
                </TabsContent>

                {/* ── Progres Tab ── */}
                <TabsContent value="progres" className="p-5 mt-0">
                  {!job.actual_checkin_at ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <Clock className="h-7 w-7 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400 font-medium">
                        Pekerjaan belum dimulai
                      </p>
                    </div>
                  ) : (
                    <div className="relative pl-8 space-y-0">
                      {/* Timeline line */}
                      <div className="absolute left-3 top-4 bottom-4 w-px bg-slate-200" />

                      {[
                        {
                          icon: CheckCircle2,
                          label: "Check-in",
                          time: job.actual_checkin_at,
                          color: "bg-emerald-500",
                        },
                        ...(job.actual_checkout_at
                          ? [
                              {
                                icon: CheckCircle2,
                                label: "Check-out",
                                time: job.actual_checkout_at,
                                color: "bg-emerald-500",
                              },
                            ]
                          : []),
                      ].map((step, i) => (
                        <div
                          key={i}
                          className="relative flex items-start gap-3 pb-6"
                        >
                          <div
                            className={cn(
                              "absolute -left-5 h-6 w-6 rounded-full flex items-center justify-center",
                              step.color,
                            )}
                          >
                            <step.icon className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div className="pt-0.5">
                            <p className="text-sm font-semibold text-slate-800">
                              {step.label}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {format(
                                new Date(step.time),
                                "dd MMM yyyy · HH:mm",
                                { locale: localeId },
                              )}
                            </p>
                          </div>
                        </div>
                      ))}

                      {job.actual_duration_minutes && (
                        <div className="mt-2 flex items-center gap-2 bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                          <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                              Total Durasi
                            </p>
                            <p className="text-sm font-bold text-slate-800">
                              {job.actual_duration_minutes} menit
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ── Foto Tab ── */}
                <TabsContent value="foto" className="p-5 mt-0 space-y-6">
                  {[
                    { label: "Sebelum", photos: job.before_photos },
                    { label: "Sesudah", photos: job.after_photos },
                  ].map(({ label, photos }) => (
                    <div key={label}>
                      <div className="flex items-center gap-2 mb-3">
                        <Camera className="h-4 w-4 text-slate-400" />
                        <p className="text-sm font-bold text-slate-700">
                          {label}
                        </p>
                        {photos && photos.length > 0 && (
                          <span className="ml-auto text-xs font-semibold text-slate-400">
                            {photos.length} foto
                          </span>
                        )}
                      </div>
                      {photos && photos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-3">
                          {photos.map((url, idx) => (
                            <div
                              key={idx}
                              className="photo-thumb"
                              onClick={() => setLightboxPhoto(url)}
                            >
                              <img
                                src={url}
                                alt={`${label} ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-24 rounded-xl border-2 border-dashed border-slate-200">
                          <p className="text-sm text-slate-400">
                            Belum ada foto
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </TabsContent>

                {/* ── Catatan Tab ── */}
                <TabsContent value="catatan" className="p-5 mt-0 space-y-4">
                  {!job.technician_notes && !job.admin_notes ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                        <FileText className="h-7 w-7 text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400 font-medium">
                        Belum ada catatan
                      </p>
                    </div>
                  ) : (
                    <>
                      {job.technician_notes && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">
                            Catatan Teknisi
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {job.technician_notes}
                          </p>
                        </div>
                      )}
                      {job.admin_notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-wide mb-2">
                            Catatan Admin
                          </p>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            {job.admin_notes}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Biaya */}
            <div className="jd-card p-5">
              <p className="text-sm font-bold text-slate-900 mb-4">
                Rincian Biaya
              </p>
              <CostRow label="Biaya Service" value={job.service_cost} />
              <CostRow label="Biaya Suku Cadang" value={job.parts_cost} />
              <CostRow label="Total" value={job.total_cost} bold />
            </div>
          </div>

          {/* ── Right Sidebar (1/3) ── */}
          <div className="space-y-4">
            {/* Pelanggan */}
            <div className="jd-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-bold text-slate-900">Pelanggan</p>
              </div>
              <div className="flex items-start gap-3">
                <Avatar name={job.invoice.customer.name} size="lg" />
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {job.invoice.customer.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {job.invoice.customer.phone}
                  </p>
                  {job.invoice.customer.email && (
                    <p className="text-xs text-slate-500">
                      {job.invoice.customer.email}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tim Service */}
            <div className="jd-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-slate-400" />
                  <p className="text-sm font-bold text-slate-900">
                    Tim Service
                  </p>
                </div>
                <button
                  onClick={() => setTeamDialogOpen(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  {teamMembers.length > 0 ? "Kelola" : "+ Tugaskan"}
                </button>
              </div>

              {teamMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">
                    Belum ada tim
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lead && (
                    <div className="member-row flex items-center justify-between p-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={lead.technician.name} size="sm" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {lead.technician.name}
                          </p>
                          {lead.technician.phone && (
                            <p className="text-[10px] text-slate-400">
                              {lead.technician.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <RoleBadge role="lead" />
                    </div>
                  )}
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="member-row flex items-center justify-between p-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar name={m.technician.name} size="sm" />
                        <div>
                          <p className="text-xs font-bold text-slate-800">
                            {m.technician.name}
                          </p>
                          {m.technician.phone && (
                            <p className="text-[10px] text-slate-400">
                              {m.technician.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      <RoleBadge role={m.role} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Aksi */}
            <div className="jd-card p-5">
              <p className="text-sm font-bold text-slate-900 mb-3">
                Aksi Cepat
              </p>
              <button
                onClick={() =>
                  navigate(`/invoices/${job.invoice.invoice_number}`)
                }
                className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-sm font-semibold text-slate-700"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Lihat Faktur
                </span>
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </button>
            </div>
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
            <DialogTitle className="text-base font-bold">
              Kelola Tim Service
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Tugaskan dan kelola teknisi untuk pekerjaan ini
            </DialogDescription>
          </DialogHeader>
          {job.service_address && (
            <div className="flex items-start gap-3 bg-slate-50 rounded-xl p-3.5 border border-slate-200 mt-2">
              <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-600 mb-0.5">
                  Alamat Service
                </p>
                <p className="text-sm text-slate-500">{job.service_address}</p>
              </div>
            </div>
          )}
          <ServiceTeamManager
            serviceId={job.id}
            invoiceId={job.invoice.id}
            onTeamUpdated={() => {
              fetchTeamMembers();
              fetchJobDetail();
              setTeamDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ── Lightbox ── */}
      {lightboxPhoto && (
        <div className="lightbox" onClick={() => setLightboxPhoto(null)}>
          <img
            src={lightboxPhoto}
            alt="Preview"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
