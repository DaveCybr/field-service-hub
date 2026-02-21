// NewInvoice.tsx - Layout 2 kolom: kiri konten utama, kanan sticky sidebar
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatCurrency } from "@/lib/utils/currency";

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
        const servicesData = services.map((s) => ({
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
        }));
        const { error: svcErr } = await supabase
          .from("invoice_services")
          .insert(servicesData);
        if (svcErr) throw svcErr;
      }

      if (items.length > 0) {
        const itemsData = items.map((item) => {
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
        });
        const { error: itemErr } = await supabase
          .from("invoice_items")
          .insert(itemsData);
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

  if (dataLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <form onSubmit={handleSubmit}>
        {/* Page header — ringkas */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            asChild
            className="-ml-2"
          >
            <Link to="/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Buat Faktur Baru</h1>
            <p className="text-sm text-muted-foreground">
              Tambahkan layanan dan produk ke faktur
            </p>
          </div>
        </div>

        {/* Layout 2 kolom */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* === KOLOM KIRI: Konten utama === */}
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

          {/* === KOLOM KANAN: Sticky sidebar === */}
          <div className="lg:sticky lg:top-6 space-y-4">
            {/* Ringkasan harga */}
            <Card>
              <CardContent className="pt-4 space-y-2.5">
                <p className="text-sm font-medium mb-3">Ringkasan</p>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Layanan ({services.length})
                  </span>
                  <span>{formatCurrency(calcServices())}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Produk ({items.length})
                  </span>
                  <span>{formatCurrency(calcItems())}</span>
                </div>

                <Separator />

                {/* Diskon */}
                <CurrencyInput
                  label="Diskon"
                  value={discount}
                  onValueChange={(v) => setDiscount(v || 0)}
                  min={0}
                />

                {/* Pajak */}
                <CurrencyInput
                  label="Pajak (PPN)"
                  value={tax}
                  onValueChange={(v) => setTax(v || 0)}
                  min={0}
                />

                <Separator />

                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-primary text-lg">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Catatan */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <Label className="text-sm">
                  Catatan{" "}
                  <span className="text-muted-foreground font-normal">
                    (Opsional)
                  </span>
                </Label>
                <Textarea
                  placeholder="Catatan untuk pelanggan..."
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
              </CardContent>
            </Card>

            {/* Tombol aksi */}
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={!canSubmit} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Buat Faktur"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                asChild
              >
                <Link to="/invoices">Batal</Link>
              </Button>
            </div>

            {/* Hint validasi */}
            {!canSubmit && !submitting && (
              <p className="text-xs text-muted-foreground text-center">
                {!customerId
                  ? "Pilih pelanggan terlebih dahulu"
                  : "Tambahkan minimal 1 layanan atau produk"}
              </p>
            )}
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}
