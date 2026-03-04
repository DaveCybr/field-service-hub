// EditInvoice.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  ArrowLeft,
  ChevronRight,
  Save,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";

import { CustomerSection } from "@/components/invoices/create/CustomerSection";
import { InvoiceSettings } from "@/components/invoices/create/InvoiceSetting";
import { ServicesSection } from "@/components/invoices/create/ServiceSection";
import { ProductsSection } from "@/components/invoices/create/ProductSection";

import { useInvoiceData } from "@/hooks/invoices/useInvoiceData";

export default function EditInvoice() {
  const { id } = useParams<{ id: string }>();
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
  } = useInvoiceData();

  const [invoice, setInvoice] = useState<any>(null);
  const [customerId, setCustomerId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const addService = (s: any) =>
    setServices((prev) => [...prev, { ...s, id: prev.length.toString() }]);
  const removeService = (id: string | number) =>
    setServices((prev) => prev.filter((s) => s.id !== id.toString()));
  const addProduct = (item: any) =>
    setItems((prev) => [...prev, { ...item, id: prev.length.toString() }]);
  const removeProduct = (id: string | number) =>
    setItems((prev) => prev.filter((i) => i.id !== id.toString()));

  const calcServices = () =>
    services.reduce((sum, s) => sum + (s.service_cost || 0), 0);
  const calcItems = () =>
    items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.product_id);
      const unitPrice = product?.sell_price || item.unit_price || 0;
      return sum + (unitPrice * item.quantity - (item.discount || 0));
    }, 0);

  useEffect(() => {
    if (id) loadInvoice(id);
  }, [id]);

  const loadInvoice = async (invoiceNumber: string) => {
    try {
      // :id dari URL adalah invoice_number, bukan UUID
      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .select("*, customer:customers(id,name)")
        .eq("invoice_number", invoiceNumber)
        .single();
      if (invErr) throw invErr;

      const { data: svcData } = await supabase
        .from("invoice_services")
        .select("*")
        .eq("invoice_id", inv.id);
      const { data: itemData } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", inv.id);

      setInvoice(inv);
      setCustomerId(inv.customer_id);
      setInvoiceNotes(inv.notes || "");
      setDiscount(inv.discount?.toString() || "0");
      setTax(inv.tax?.toString() || "0");

      setServices(
        (svcData || []).map((s: any, i: number) => ({
          id: i.toString(),
          title: s.title,
          description: s.description || "",
          unit_id: s.unit_id || "",
          technician_id: s.assigned_technician_id || "",
          scheduled_date: s.scheduled_date || "",
          service_address: s.service_address || "",
          service_latitude: s.service_latitude || null,
          service_longitude: s.service_longitude || null,
          estimated_duration: s.estimated_duration_minutes || 60,
          service_cost: s.service_cost || 0,
          priority: s.priority || "normal",
        })),
      );

      setItems(
        (itemData || []).map((item: any, i: number) => ({
          id: i.toString(),
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
        })),
      );

      setLoading(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal memuat faktur",
        description: error.message,
      });
      navigate("/invoices");
    }
  };

  const discountAmount = parseFloat(discount) || 0;
  const taxAmount = parseFloat(tax) || 0;
  const subtotal = calcServices() + calcItems();
  const grandTotal = subtotal - discountAmount + taxAmount;
  const canSubmit =
    customerId && (services.length > 0 || items.length > 0) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { error: invErr } = await supabase
        .from("invoices")
        .update({
          customer_id: customerId,
          discount: discountAmount,
          tax: taxAmount,
          notes: invoiceNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);
      if (invErr) throw invErr;

      await supabase
        .from("invoice_services")
        .delete()
        .eq("invoice_id", invoice.id);
      await supabase
        .from("invoice_items")
        .delete()
        .eq("invoice_id", invoice.id);

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
        action: "update",
        entityType: "invoice",
        entityId: invoice.id,
        oldData: {
          customer_id: invoice.customer_id,
          discount: invoice.discount,
          tax: invoice.tax,
        },
        newData: {
          customer_id: customerId,
          discount: discountAmount,
          tax: taxAmount,
          grand_total: grandTotal,
        },
      });

      toast({
        title: "Faktur Diperbarui",
        description: `${invoice.invoice_number} berhasil diperbarui`,
      });
      navigate(`/invoices/${invoice.invoice_number}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal memperbarui faktur",
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || dataLoading)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
          <p className="text-sm text-slate-400 font-medium">
            Memuat data faktur...
          </p>
        </div>
      </DashboardLayout>
    );

  if (!invoice)
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-slate-600 font-semibold">Faktur tidak ditemukan</p>
          <Link
            to="/invoices"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← Kembali ke Faktur
          </Link>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .ei-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .ei-fade { animation: eiFade 0.22s ease both; }
        @keyframes eiFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .ei-card { background: white; border-radius: 14px; border: 1px solid #e2e8f0; }
        .ei-section-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #94a3b8; margin-bottom: 12px; }
      `}</style>

      <form onSubmit={handleSubmit} className="ei-root ei-fade">
        {/* ── Breadcrumb + Header ── */}
        <div className="mb-6">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
            <Link
              to="/invoices"
              className="hover:text-slate-600 font-medium transition-colors"
            >
              Faktur
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              to={`/invoices/${invoice.invoice_number}`}
              className="hover:text-slate-600 font-mono font-medium transition-colors"
            >
              {invoice.invoice_number}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-slate-600 font-semibold">Edit</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/invoices/${invoice.invoice_number}`}
              className="h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Edit Faktur
              </h1>
              <p className="text-sm font-mono text-slate-500 mt-0.5">
                {invoice.invoice_number}
              </p>
            </div>
          </div>
        </div>

        {/* ── Two Column Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
          {/* ── Left ── */}
          <div className="space-y-4">
            <CustomerSection
              customers={customers}
              selectedCustomer={customerId}
              onCustomerChange={setCustomerId}
            />
            <ServicesSection
              services={services}
              units={units}
              technicians={technicians}
              customerId={customerId}
              onAddService={addService}
              onRemoveService={removeService}
            />
            <ProductsSection
              items={items}
              products={products}
              onAddProduct={addProduct}
              onRemoveProduct={removeProduct}
            />
          </div>

          {/* ── Right Sidebar ── */}
          <div className="lg:sticky lg:top-6 space-y-4">
            {/* Price Summary */}
            <div className="ei-card p-4">
              <p className="ei-section-label">Ringkasan Harga</p>
              <div className="space-y-1 text-xs">
                {[
                  {
                    label: `Layanan (${services.length})`,
                    value: calcServices(),
                  },
                  { label: `Produk (${items.length})`, value: calcItems() },
                  { label: "Subtotal", value: subtotal },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold text-slate-700 tabular-nums">
                      {formatCurrency(value)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2.5">
                <CurrencyInput
                  label="Diskon"
                  value={parseFloat(discount) || 0}
                  onValueChange={(v) => setDiscount(String(v || 0))}
                  min={0}
                />
                <CurrencyInput
                  label="Pajak (PPN)"
                  value={parseFloat(tax) || 0}
                  onValueChange={(v) => setTax(String(v || 0))}
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
            <div className="ei-card p-4">
              <p className="ei-section-label">
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
                    <Save className="h-4 w-4" /> Simpan Perubahan
                  </>
                )}
              </button>
              <Link
                to={`/invoices/${invoice.invoice_number}`}
                className="w-full h-9 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center"
              >
                Batal
              </Link>
            </div>

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
