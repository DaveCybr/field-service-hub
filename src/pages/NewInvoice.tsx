// NewInvoice.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ArrowLeft,
  ChevronRight,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

import { CustomerSection } from "@/components/invoices/create/CustomerSection";
import { ServicesSection } from "@/components/invoices/create/ServiceSection";
import { ProductsSection } from "@/components/invoices/create/ProductSection";

import { useInvoiceData } from "@/hooks/invoices/useInvoiceData";
import { useInvoiceServices } from "@/hooks/invoices/useInvoiceService";
import { useInvoiceProducts } from "@/hooks/invoices/useInvoiceProduct";

export default function NewInvoice() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { log: auditLog } = useAuditLog();
  const { toast } = useToast();

  const {
    customers,
    units,
    products,
    technicians,
    loading: dataLoading,
    refetch,
  } = useInvoiceData();
  const [customerId, setCustomerId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const selectedCustomerAddress = selectedCustomer?.address || "";
  const selectedCustomerLat = selectedCustomer?.latitude ?? null;
  const selectedCustomerLng = selectedCustomer?.longitude ?? null;

  const {
    services,
    addService,
    removeService,
    calculateTotal: calcServices,
  } = useInvoiceServices();
  const {
    items,
    addProduct,
    removeProduct,
    calculateTotal: calcItems,
  } = useInvoiceProducts(products);

  const handleAddService = (service: Parameters<typeof addService>[0]) => {
    addService({
      ...service,
      service_address:
        service.service_address || selectedCustomerAddress || undefined,
      service_latitude:
        service.service_latitude ?? selectedCustomerLat ?? undefined,
      service_longitude:
        service.service_longitude ?? selectedCustomerLng ?? undefined,
    });
  };

  const subtotal = calcServices() + calcItems();
  const grandTotal = subtotal - discount + tax;
  const canSubmit =
    customerId && (services.length > 0 || items.length > 0) && !submitting;

  // Checklist steps
  const steps = [
    { label: "Pilih pelanggan", done: !!customerId },
    {
      label: "Tambah layanan / produk",
      done: services.length > 0 || items.length > 0,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      toast({
        variant: "destructive",
        title: "Data Tidak Lengkap",
        description:
          "Pilih pelanggan dan tambahkan minimal satu layanan atau produk",
      });
      return;
    }
    setSubmitting(true);
    try {
      const invoiceNumber = `INV-${Date.now()}`;
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert([
          {
            customer_id: customerId,
            invoice_number: invoiceNumber,
            status: "draft",
            payment_status: "unpaid",
            discount,
            tax,
            notes: invoiceNotes,
            created_by: employee?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();
      if (invoiceError) throw invoiceError;

      if (services.length > 0) {
        const { error: svcErr } = await supabase
          .from("invoice_services")
          .insert(
            services.map((s) => ({
              invoice_id: invoice.id,
              title: s.title,
              description: s.description || null,
              unit_id: s.unit_id || null,
              assigned_technician_id: s.technician_id || null,
              scheduled_date: s.scheduled_date || null,
              service_address: s.service_address || null,
              service_latitude: s.service_latitude || null,
              service_longitude: s.service_longitude || null,
              estimated_duration_minutes: s.estimated_duration || 60,
              service_cost: s.service_cost || 0,
              parts_cost: 0,
              total_cost: s.service_cost || 0,
              priority: s.priority || "normal",
              status: "pending",
            })),
          );
        if (svcErr) throw svcErr;
      }

      if (items.length > 0) {
        const { error: itemErr } = await supabase.from("invoice_items").insert(
          items.map((item) => {
            const product = products.find((p) => p.id === item.product_id);
            return {
              invoice_id: invoice.id,
              product_id: item.product_id,
              product_name: product?.name,
              product_sku: product?.sku,
              quantity: item.quantity,
              unit_price: item.unit_price,
              discount: item.discount,
              total_price: item.unit_price * item.quantity - item.discount,
            };
          }),
        );
        if (itemErr) throw itemErr;
      }

      await auditLog({
        action: "create",
        entityType: "invoice",
        entityId: invoice.id,
        newData: {
          invoice_number: invoice.invoice_number,
          grand_total: grandTotal,
        },
      });

      toast({
        title: "Faktur Berhasil Dibuat!",
        description: `${invoiceNumber} telah disimpan`,
        duration: 4000,
      });
      navigate(`/invoices/${invoice.invoice_number}`, {
        state: { openServicesTab: services.length > 0 },
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Membuat Faktur",
        description: error.message || "Terjadi kesalahan",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (dataLoading)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
          <p className="text-sm text-slate-400 font-medium">Memuat data...</p>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .ni-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .ni-fade { animation: niFade 0.22s ease both; }
        @keyframes niFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .ni-card { background: white; border-radius: 14px; border: 1px solid #e2e8f0; }
        .ni-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 12px; }
        .summary-row { display:flex; align-items:center; justify-content:space-between; padding: 6px 0; }
        .summary-row:not(:last-child) { border-bottom: 1px solid #f1f5f9; }
      `}</style>

      <form onSubmit={handleSubmit} className="ni-root ni-fade">
        {/* ── Breadcrumb + Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
            <Link
              to="/invoices"
              className="hover:text-slate-600 transition-colors font-medium"
            >
              Faktur
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-slate-600 font-semibold">
              Buat Faktur Baru
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/invoices"
              className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Buat Faktur Baru
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Tambahkan layanan dan produk ke faktur
              </p>
            </div>
          </div>
        </div>

        {/* ── Two Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
          {/* ── Left: Main Content ── */}
          <div className="space-y-4">
            <CustomerSection
              customers={customers}
              selectedCustomer={customerId}
              onCustomerChange={setCustomerId}
              onRefreshCustomers={refetch}
            />
            <ServicesSection
              services={services}
              units={units}
              technicians={technicians}
              customerId={customerId}
              customerAddress={selectedCustomerAddress}
              customerLat={selectedCustomerLat}
              customerLng={selectedCustomerLng}
              onAddService={handleAddService}
              onRemoveService={removeService}
              onRefreshUnits={refetch}
            />
            <ProductsSection
              items={items}
              products={products}
              onAddProduct={addProduct}
              onRemoveProduct={removeProduct}
            />
          </div>

          {/* ── Right: Sticky Sidebar ── */}
          <div className="lg:sticky lg:top-6 space-y-4">
            {/* Progress Checklist */}
            <div className="ni-card p-4">
              <p className="ni-section-label">Progress</p>
              <div className="space-y-2.5">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    {step.done ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        step.done ? "text-slate-700" : "text-slate-400",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Summary */}
            <div className="ni-card p-4">
              <p className="ni-section-label">Ringkasan Harga</p>

              <div className="summary-row">
                <span className="text-xs text-slate-500">
                  Layanan ({services.length})
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {formatCurrency(calcServices())}
                </span>
              </div>
              <div className="summary-row">
                <span className="text-xs text-slate-500">
                  Produk ({items.length})
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  {formatCurrency(calcItems())}
                </span>
              </div>
              <div className="summary-row">
                <span className="text-xs text-slate-500">Subtotal</span>
                <span className="text-xs font-semibold text-slate-700">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <div className="mt-3 space-y-2.5">
                <CurrencyInput
                  label="Diskon"
                  value={discount}
                  onValueChange={(v) => setDiscount(v || 0)}
                  min={0}
                />
                <CurrencyInput
                  label="Pajak (PPN)"
                  value={tax}
                  onValueChange={(v) => setTax(v || 0)}
                  min={0}
                />
              </div>

              <div className="mt-3 pt-3 border-t-2 border-slate-200 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Total</span>
                <span className="text-lg font-bold text-slate-900 tabular-nums">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Notes */}
            <div className="ni-card p-4">
              <p className="ni-section-label">
                Catatan{" "}
                <span className="text-slate-400 font-normal normal-case">
                  (Opsional)
                </span>
              </p>
              <Textarea
                placeholder="Catatan untuk pelanggan..."
                value={invoiceNotes}
                onChange={(e) => setInvoiceNotes(e.target.value)}
                rows={3}
                className="resize-none text-sm rounded-xl border-slate-200"
              />
            </div>

            {/* Submit */}
            <div className="space-y-2.5">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full h-11 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" /> Buat Faktur
                  </>
                )}
              </button>
              <Link
                to="/invoices"
                className="w-full h-9 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center"
              >
                Batal
              </Link>
            </div>

            {/* Validation hint */}
            {!canSubmit && !submitting && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  {!customerId
                    ? "Pilih pelanggan terlebih dahulu"
                    : "Tambahkan minimal 1 layanan atau produk"}
                </p>
              </div>
            )}
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
