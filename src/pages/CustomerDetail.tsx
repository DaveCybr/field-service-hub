import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  FileText,
  Building2,
  User,
  Edit,
  Trash2,
  Plus,
  ExternalLink,
  ShieldCheck,
  ShieldOff,
  Clock,
  CreditCard,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils/currency";
import { useToast } from "@/hooks/use-toast";
import { EditCustomerModal } from "@/components/customers/EditCustomerModal";
import { DeleteCustomerDialog } from "@/components/customers/DeleteCustomerDialog";
import { QuickRegisterUnitModal } from "@/components/units/QuickRegisterUnitModal";
import { cn } from "@/lib/utils";

interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  category: "retail" | "project";
  payment_terms_days: number;
  current_outstanding: number;
  blacklisted: boolean;
  created_at: string;
}

interface Unit {
  id: string;
  qr_code: string;
  unit_type: string;
  brand: string | null;
  model: string | null;
  warranty_expiry_date: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  status: string;
  payment_status: string;
  grand_total: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draf", color: "bg-gray-100 text-gray-600 border-gray-200" },
  pending: {
    label: "Menunggu",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  in_progress: {
    label: "Diproses",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Selesai",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  cancelled: {
    label: "Dibatalkan",
    color: "bg-red-50 text-red-700 border-red-200",
  },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  unpaid: {
    label: "Belum Dibayar",
    color: "bg-red-50 text-red-700 border-red-200",
  },
  partial: {
    label: "Sebagian",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  paid: {
    label: "Lunas",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
};

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <div className="text-sm font-medium text-slate-800">{children}</div>
    </div>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {title}
        </span>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false);

  useEffect(() => {
    if (id) fetchCustomerDetails();
  }, [id]);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();
      if (customerError) throw customerError;
      setCustomer(customerData);

      const { data: unitsData } = await supabase
        .from("units")
        .select("id, qr_code, unit_type, brand, model, warranty_expiry_date")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });
      setUnits(unitsData || []);

      const { data: invoicesData } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, invoice_date, status, payment_status, grand_total",
        )
        .eq("customer_id", id)
        .order("invoice_date", { ascending: false });
      setInvoices(invoicesData || []);
    } catch {
      toast({
        variant: "destructive",
        title: "Gagal Memuat Data",
        description: "Tidak dapat memuat detail pelanggan.",
      });
    } finally {
      setLoading(false);
    }
  };

  const isWarrantyActive = (date: string | null) =>
    date ? new Date(date) > new Date() : false;
  const totalSpent = invoices
    .filter((i) => i.payment_status === "paid")
    .reduce((s, i) => s + i.grand_total, 0);
  const paidCount = invoices.filter((i) => i.payment_status === "paid").length;
  const unpaidCount = invoices.filter(
    (i) => i.payment_status === "unpaid",
  ).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
          <p
            className="text-sm text-slate-400"
            style={{ fontFamily: "'Plus Jakarta Sans', system-ui" }}
          >
            Memuat data pelanggan...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div
          className="flex flex-col items-center justify-center min-h-[400px] gap-4"
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui" }}
        >
          <div className="rounded-full bg-slate-100 p-4">
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
          <div className="text-center">
            <h3 className="font-bold text-slate-900">
              Pelanggan Tidak Ditemukan
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Data yang Anda cari tidak tersedia atau telah dihapus.
            </p>
          </div>
          <button
            onClick={() => navigate("/customers")}
            className="h-9 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
          >
            Kembali ke Daftar Pelanggan
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const isProject = customer.category === "project";

  return (
    <DashboardLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .cdetail-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .cdetail-fade { animation: fadeUp 0.2s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .row-btn { transition: background 0.12s; }
        .row-btn:hover { background: #f8fafc; }
      `}</style>

      <div className="cdetail-root cdetail-fade space-y-5">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/customers")}
              className="h-9 w-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-all shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div
              className={cn(
                "rounded-xl p-2.5 shrink-0",
                isProject ? "bg-violet-100" : "bg-blue-100",
              )}
            >
              {isProject ? (
                <Building2 className="h-5 w-5 text-violet-600" />
              ) : (
                <User className="h-5 w-5 text-blue-600" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {customer.name}
                </h1>
                {customer.blacklisted ? (
                  <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                    Diblokir
                  </span>
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {isProject ? "Pelanggan Proyek" : "Pelanggan Retail"} · Sejak{" "}
                {format(new Date(customer.created_at), "MMMM yyyy", {
                  locale: localeId,
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                navigate(`/invoices/new?customer_id=${customer.id}`)
              }
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Buat Invoice
            </button>
            <button
              onClick={() => setEditModalOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-all"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </button>
          </div>
        </div>

        {/* ── Blacklist Alert ── */}
        {customer.blacklisted && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-800">
                Pelanggan Diblokir
              </p>
              <p className="text-sm text-red-600 mt-0.5">
                Pelanggan ini telah masuk daftar blokir. Harap tinjau sebelum
                melakukan transaksi.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          {/* ── Main Column ── */}
          <div className="lg:col-span-2 space-y-5">
            {/* Info Kontak */}
            <SectionCard title="Informasi Kontak">
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <InfoRow label="Nomor Telepon">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {customer.phone}
                    </div>
                  </InfoRow>
                  <InfoRow label="Alamat Email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {customer.email || (
                        <span className="text-slate-400">—</span>
                      )}
                    </div>
                  </InfoRow>
                </div>

                {customer.address && (
                  <>
                    <div className="h-px bg-slate-100" />
                    <InfoRow label="Alamat Lengkap">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        {customer.address}
                      </div>
                    </InfoRow>
                  </>
                )}

                <div className="h-px bg-slate-100" />

                <div className="grid grid-cols-3 gap-5">
                  <InfoRow label="Kategori">
                    <span
                      className={cn(
                        "inline-flex text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full",
                        isProject
                          ? "bg-violet-100 text-violet-700"
                          : "bg-blue-100 text-blue-700",
                      )}
                    >
                      {isProject ? "Proyek" : "Retail"}
                    </span>
                  </InfoRow>
                  <InfoRow label="Termin Bayar">
                    <div className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                      {isProject && customer.payment_terms_days > 0
                        ? `NET ${customer.payment_terms_days} Hari`
                        : "Tunai"}
                    </div>
                  </InfoRow>
                  <InfoRow label="Terdaftar Sejak">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {format(new Date(customer.created_at), "d MMM yyyy", {
                        locale: localeId,
                      })}
                    </div>
                  </InfoRow>
                </div>
              </div>
            </SectionCard>

            {/* Unit Terdaftar */}
            <SectionCard
              title={`Unit Terdaftar`}
              action={
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {units.length} unit
                  </span>
                  <button
                    onClick={() => setQuickRegisterOpen(true)}
                    className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all"
                  >
                    <Plus className="h-3 w-3" />
                    Daftarkan Unit
                  </button>
                </div>
              }
            >
              {units.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="rounded-full bg-slate-100 p-3 mb-3">
                    <Package className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Belum Ada Unit Terdaftar
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Daftarkan unit pertama untuk pelanggan ini.
                  </p>
                  <button
                    onClick={() => setQuickRegisterOpen(true)}
                    className="mt-4 flex items-center gap-1.5 h-8 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Daftarkan Unit Baru
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {units.map((unit) => (
                    <button
                      key={unit.id}
                      onClick={() => navigate(`/units/${unit.id}`)}
                      className="row-btn w-full flex items-center justify-between px-5 py-3.5 text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-slate-100 p-2 group-hover:bg-slate-200 transition-colors">
                          <Package className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {unit.unit_type}
                          </p>
                          <p className="text-xs text-slate-400">
                            {[unit.brand, unit.model]
                              .filter(Boolean)
                              .join(" ") || "Merek/Model tidak tersedia"}
                          </p>
                          <p className="text-xs font-mono text-slate-400 mt-0.5">
                            {unit.qr_code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {unit.warranty_expiry_date &&
                          (isWarrantyActive(unit.warranty_expiry_date) ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              <ShieldCheck className="h-3 w-3" /> Garansi Aktif
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              <ShieldOff className="h-3 w-3" /> Expired
                            </span>
                          ))}
                        <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Riwayat Invoice */}
            <SectionCard
              title="Riwayat Invoice"
              action={
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {invoices.length} invoice
                  </span>
                  <button
                    onClick={() =>
                      navigate(`/invoices/new?customer_id=${customer.id}`)
                    }
                    className="flex items-center gap-1.5 h-7 px-3 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all"
                  >
                    <Plus className="h-3 w-3" />
                    Buat Invoice
                  </button>
                </div>
              }
            >
              {invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <div className="rounded-full bg-slate-100 p-3 mb-3">
                    <FileText className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Belum Ada Invoice
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Buat invoice pertama untuk pelanggan ini.
                  </p>
                  <button
                    onClick={() =>
                      navigate(`/invoices/new?customer_id=${customer.id}`)
                    }
                    className="mt-4 flex items-center gap-1.5 h-8 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Buat Invoice Baru
                  </button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {invoices.slice(0, 10).map((invoice) => {
                      const sCfg =
                        STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
                      const pCfg =
                        PAYMENT_CONFIG[invoice.payment_status] ||
                        PAYMENT_CONFIG.unpaid;
                      return (
                        <button
                          key={invoice.id}
                          onClick={() =>
                            navigate(`/invoices/${invoice.invoice_number}`)
                          }
                          className="row-btn w-full flex items-center justify-between px-5 py-3.5 text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-slate-100 p-2 group-hover:bg-slate-200 transition-colors">
                              <FileText className="h-4 w-4 text-slate-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-mono font-semibold text-slate-800">
                                  {invoice.invoice_number}
                                </p>
                                <span
                                  className={cn(
                                    "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                                    pCfg.color,
                                  )}
                                >
                                  {pCfg.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <p className="text-xs text-slate-400">
                                  {format(
                                    new Date(invoice.invoice_date),
                                    "d MMMM yyyy",
                                    { locale: localeId },
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-sm font-bold text-slate-900">
                                {formatCurrency(invoice.grand_total)}
                              </p>
                              <span
                                className={cn(
                                  "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                                  sCfg.color,
                                )}
                              >
                                {sCfg.label}
                              </span>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {invoices.length > 10 && (
                    <div className="px-5 py-3 border-t border-slate-100">
                      <button
                        onClick={() =>
                          navigate(`/invoices?customer=${customer.id}`)
                        }
                        className="w-full h-8 rounded-lg text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                      >
                        Lihat semua {invoices.length} invoice
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </SectionCard>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-5">
            {/* Ringkasan */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Ringkasan
                </span>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                    <p className="text-2xl font-bold text-slate-900 tabular-nums">
                      {units.length}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">Total Unit</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
                    <p className="text-2xl font-bold text-slate-900 tabular-nums">
                      {invoices.length}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Total Invoice
                    </p>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm text-slate-500">
                        Invoice Lunas
                      </span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 tabular-nums">
                      {paidCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-slate-500">
                        Belum Dibayar
                      </span>
                    </div>
                    <span className="text-sm font-bold text-red-600 tabular-nums">
                      {unpaidCount}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                      Total Transaksi
                    </p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-slate-400" />
                      <p className="text-lg font-bold text-slate-900">
                        {formatCurrency(totalSpent)}
                      </p>
                    </div>
                  </div>

                  {customer.current_outstanding > 0 && (
                    <div className="rounded-xl bg-red-50 border border-red-100 p-3.5">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-red-500 mb-1">
                        Piutang Berjalan
                      </p>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(customer.current_outstanding)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Aksi Cepat */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Aksi Cepat
                </span>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() =>
                    navigate(`/invoices/new?customer_id=${customer.id}`)
                  }
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all"
                >
                  <FileText className="h-4 w-4" />
                  Buat Invoice Baru
                </button>
                <button
                  onClick={() => setQuickRegisterOpen(true)}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  <Package className="h-4 w-4" />
                  Daftarkan Unit Baru
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-all"
                >
                  <Edit className="h-4 w-4" />
                  Edit Data Pelanggan
                </button>
                <button
                  onClick={() => setDeleteDialogOpen(true)}
                  className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-red-500 text-sm font-semibold hover:bg-red-50 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus Pelanggan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditCustomerModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        customer={customer}
        onSuccess={fetchCustomerDetails}
      />
      <DeleteCustomerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        customer={customer}
        unitsCount={units.length}
        invoicesCount={invoices.length}
        onSuccess={() => {
          toast({
            title: "Berhasil",
            description: "Mengarahkan ke daftar pelanggan...",
          });
          navigate("/customers");
        }}
      />
      <QuickRegisterUnitModal
        open={quickRegisterOpen}
        onOpenChange={setQuickRegisterOpen}
        customerId={customer.id}
        customerName={customer.name}
        onUnitRegistered={fetchCustomerDetails}
      />
    </DashboardLayout>
  );
}
