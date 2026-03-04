import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  QrCode,
  Shield,
  Download,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
  History,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  User,
  Calendar,
  Hash,
  Cpu,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { EditUnitModal } from "@/components/units/EditUnitModal";
import { DeleteUnitDialog } from "@/components/units/DeleteUnitDialog";
import { RecurringIssuesAlert } from "@/components/units/RecurringIssuesAlert";
import { PartsHistoryTimeline } from "@/components/units/PartsHistoryTimeline";
import { ServiceTimeline } from "@/components/units/ServiceTimeline";
import { useUnitInsights } from "@/hooks/useUnitInsights";
import { cn } from "@/lib/utils";

interface UnitDetail {
  id: string;
  qr_code: string;
  unit_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  capacity: string | null;
  warranty_expiry_date: string | null;
  created_at: string;
  customer_id: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  };
}

interface ServiceHistory {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  service_cost: number;
  parts_cost: number;
  total_cost: number;
  scheduled_date: string | null;
  actual_checkin_at: string | null;
  actual_checkout_at: string | null;
  service_address: string | null;
  technician_notes: string | null;
  invoice: { invoice_number: string; invoice_date: string };
  assigned_technician: { name: string } | null;
}

interface Customer {
  id: string;
  name: string;
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-semibold text-slate-800",
          mono && "font-mono",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function UnitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const {
    insights,
    loading: insightsLoading,
    refetch: refetchInsights,
  } = useUnitInsights(id);

  useEffect(() => {
    if (id) {
      fetchUnitDetails();
      fetchCustomers();
    }
  }, [id]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .eq("blacklisted", false)
      .order("name");
    if (data) setCustomers(data);
  };

  const fetchUnitDetails = async () => {
    setLoading(true);
    try {
      const { data: unitData, error: unitError } = await supabase
        .from("units")
        .select(`*, customer:customers (id, name, phone, email)`)
        .eq("id", id)
        .single();
      if (unitError) throw unitError;
      setUnit({
        ...unitData,
        customer: Array.isArray(unitData.customer)
          ? unitData.customer[0]
          : unitData.customer,
      });

      const { data: historyData, error: historyError } = await supabase
        .from("invoice_services")
        .select(
          `id, title, description, status, priority, service_cost, parts_cost, total_cost, scheduled_date, actual_checkin_at, actual_checkout_at, service_address, technician_notes, invoice:invoices (invoice_number, invoice_date), assigned_technician:employees!invoice_services_assigned_technician_id_fkey (name)`,
        )
        .eq("unit_id", id)
        .order("created_at", { ascending: false });
      if (historyError) throw historyError;

      const serviceIds = historyData?.map((s) => s.id) || [];
      let assignmentMap: Record<string, string> = {};
      if (serviceIds.length > 0) {
        const { data: assignments } = await supabase
          .from("service_technician_assignments")
          .select(
            `service_id, technician:employees!service_technician_assignments_technician_id_fkey (name)`,
          )
          .in("service_id", serviceIds)
          .eq("role", "lead")
          .order("assigned_at", { ascending: true });

        if (!assignments?.length) {
          const { data: allAssignments } = await supabase
            .from("service_technician_assignments")
            .select(
              `service_id, technician:employees!service_technician_assignments_technician_id_fkey (name)`,
            )
            .in("service_id", serviceIds)
            .order("assigned_at", { ascending: true });
          for (const a of allAssignments || []) {
            if (!assignmentMap[a.service_id]) {
              const tech = Array.isArray(a.technician)
                ? a.technician[0]
                : a.technician;
              if (tech?.name) assignmentMap[a.service_id] = tech.name;
            }
          }
        } else {
          for (const a of assignments) {
            const tech = Array.isArray(a.technician)
              ? a.technician[0]
              : a.technician;
            if (tech?.name) assignmentMap[a.service_id] = tech.name;
          }
        }
      }

      setServiceHistory(
        historyData?.map((item) => {
          const directTech = Array.isArray(item.assigned_technician)
            ? item.assigned_technician[0]
            : item.assigned_technician;
          const techName = directTech?.name || assignmentMap[item.id] || null;
          return {
            ...item,
            invoice: Array.isArray(item.invoice)
              ? item.invoice[0]
              : item.invoice,
            assigned_technician: techName ? { name: techName } : null,
          };
        }) || [],
      );
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Gagal memuat detail unit",
      });
    } finally {
      setLoading(false);
    }
  };

  const isWarrantyActive = () =>
    unit?.warranty_expiry_date
      ? new Date(unit.warranty_expiry_date) > new Date()
      : false;

  const handleDownloadQR = () => {
    if (!unit) return;
    const svg = document.getElementById("unit-qr-code");
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

  if (loading) {
    return (
      <DashboardLayout>
        <div
          className="flex flex-col items-center justify-center min-h-[400px] gap-3"
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui" }}
        >
          <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
          <p className="text-sm text-slate-400">Memuat data unit...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!unit) {
    return (
      <DashboardLayout>
        <div
          className="flex flex-col items-center justify-center min-h-[400px] gap-4"
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui" }}
        >
          <div className="rounded-full bg-slate-100 p-4">
            <Package className="h-8 w-8 text-slate-400" />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-slate-900">Unit Tidak Ditemukan</h3>
            <p className="text-sm text-slate-500 mt-1">
              Data unit tidak tersedia atau telah dihapus.
            </p>
          </div>
          <button
            onClick={() => navigate("/units")}
            className="h-9 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            Kembali ke Daftar Unit
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const completed = serviceHistory.filter(
    (s) => s.status === "completed",
  ).length;
  const inProgress = serviceHistory.filter(
    (s) => s.status === "in_progress",
  ).length;

  return (
    <DashboardLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .udetail-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .udetail-fade { animation: fadeUp 0.2s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
      `}</style>

      <div className="udetail-root udetail-fade space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/units")}
              className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-all shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="rounded-xl p-2.5 bg-blue-100 shrink-0">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {unit.unit_type}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {[unit.brand, unit.model].filter(Boolean).join(" ") ||
                  "Tidak ada merek/model"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all"
            >
              <QrCode className="h-3.5 w-3.5" />
              {showQR ? "Sembunyikan" : "Tampilkan"} QR
            </button>
            <button
              onClick={() => setEditModalOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </button>
          </div>
        </div>

        {/* ── Issues Alert ── */}
        {!insightsLoading && insights.criticalIssuesCount > 0 && (
          <div className="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="text-sm font-semibold text-red-800">
              {insights.criticalIssuesCount} masalah kritis terdeteksi
              {insights.activeIssuesCount > insights.criticalIssuesCount &&
                ` · ${insights.activeIssuesCount - insights.criticalIssuesCount} masalah aktif lainnya`}
            </span>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {/* ── Main Column ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Info Unit */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Informasi Unit
                </span>
              </div>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                  <InfoRow label="QR Code" value={unit.qr_code} mono />
                  <InfoRow label="Tipe Unit" value={unit.unit_type} />
                  <InfoRow label="Merek" value={unit.brand || "—"} />
                  <InfoRow label="Model" value={unit.model || "—"} />
                  <InfoRow
                    label="No. Seri"
                    value={unit.serial_number || "—"}
                    mono
                  />
                  <InfoRow label="Kapasitas" value={unit.capacity || "—"} />
                </div>

                {unit.warranty_expiry_date && (
                  <>
                    <div className="h-px bg-slate-100" />
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          Status Garansi
                        </p>
                        {isWarrantyActive() ? (
                          <span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                            <ShieldCheck className="h-4 w-4" /> Garansi Aktif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
                            <ShieldOff className="h-4 w-4" /> Garansi Kadaluarsa
                          </span>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                          Berlaku Sampai
                        </p>
                        <p className="text-sm font-semibold text-slate-800">
                          {format(
                            new Date(unit.warranty_expiry_date),
                            "d MMM yyyy",
                          )}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                <div className="h-px bg-slate-100" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    Tanggal Registrasi
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-800">
                      {format(new Date(unit.created_at), "d MMMM yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {!insightsLoading && insights.recurringIssues.length > 0 && (
              <RecurringIssuesAlert
                issues={insights.recurringIssues}
                onIssueResolved={refetchInsights}
              />
            )}

            {/* Tabs */}
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 rounded-xl p-1">
                <TabsTrigger
                  value="services"
                  className="rounded-lg flex items-center gap-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <History className="h-3.5 w-3.5" /> Riwayat Service
                </TabsTrigger>
                <TabsTrigger
                  value="parts"
                  className="rounded-lg flex items-center gap-2 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Package className="h-3.5 w-3.5" /> Riwayat Sparepart
                  {insights.partsHistory.length > 0 && (
                    <span className="text-[11px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">
                      {insights.partsHistory.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="services" className="mt-4">
                <ServiceTimeline services={serviceHistory} />
              </TabsContent>
              <TabsContent value="parts" className="mt-4">
                <PartsHistoryTimeline
                  parts={insights.partsHistory}
                  totalCost={insights.totalPartsCost}
                  mostReplacedPart={insights.mostReplacedPart}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            {/* QR Code */}
            {showQR && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                    QR Code
                  </span>
                </div>
                <div className="p-5 flex flex-col items-center gap-4">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <QRCodeSVG
                      id="unit-qr-code"
                      value={unit.qr_code}
                      size={140}
                      level="H"
                      includeMargin
                    />
                  </div>
                  <button
                    onClick={handleDownloadQR}
                    className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download QR
                  </button>
                </div>
              </div>
            )}

            {/* Pelanggan */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Pelanggan
                </span>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-100 p-2.5 shrink-0">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {unit.customer.name}
                    </p>
                    {unit.customer.phone && (
                      <p className="text-xs text-slate-400">
                        {unit.customer.phone}
                      </p>
                    )}
                  </div>
                </div>
                {unit.customer.email && (
                  <p className="text-xs text-slate-500 pl-1">
                    {unit.customer.email}
                  </p>
                )}
                <button
                  onClick={() => navigate(`/customers/${unit.customer.id}`)}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all mt-1"
                >
                  Lihat Profil Pelanggan
                </button>
              </div>
            </div>

            {/* Statistik */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Statistik
                </span>
              </div>
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Total",
                      value: serviceHistory.length,
                      color: "text-slate-900",
                    },
                    {
                      label: "Selesai",
                      value: completed,
                      color: "text-emerald-600",
                    },
                    {
                      label: "Berjalan",
                      value: inProgress,
                      color: "text-blue-600",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center"
                    >
                      <p
                        className={cn(
                          "text-xl font-bold tabular-nums",
                          s.color,
                        )}
                      >
                        {s.value}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wide">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-slate-100" />

                <div className="space-y-2.5">
                  {[
                    {
                      label: "Biaya Service",
                      value: formatCurrency(
                        serviceHistory.reduce((s, h) => s + h.service_cost, 0),
                      ),
                    },
                    {
                      label: "Biaya Sparepart",
                      value: formatCurrency(insights.totalPartsCost),
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-xs text-slate-400 font-medium">
                        {s.label}
                      </span>
                      <span className="text-sm font-bold text-slate-700">
                        {s.value}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                      Total
                    </span>
                    <span className="text-sm font-bold text-slate-900">
                      {formatCurrency(
                        serviceHistory.reduce((s, h) => s + h.total_cost, 0),
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditUnitModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        unit={unit}
        customers={customers}
        onSuccess={fetchUnitDetails}
      />
      <DeleteUnitDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        unit={unit}
        serviceCount={serviceHistory.length}
        onSuccess={() => navigate("/units")}
      />
    </DashboardLayout>
  );
}
