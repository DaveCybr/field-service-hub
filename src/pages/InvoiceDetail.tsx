// InvoiceDetail.tsx - Halaman Detail Faktur
import { useParams, Link } from "react-router-dom";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

import { InvoiceHeader } from "@/components/invoices/detail/InvoiceHeader";
import { InvoiceSummaryTab } from "@/components/invoices/detail/InvoiceSummaryTab";
import { ServicesTab } from "@/components/invoices/detail/ServicesTab";
import { ProductsTab } from "@/components/invoices/detail/ProductsTab";
import { PaymentTab } from "@/components/invoices/detail/PaymentTab";
import { TimelineTab } from "@/components/invoices/detail/TimelineTab";
import { DocumentsTab } from "@/components/invoices/detail/DocumentsTab";
import { InvoicePrintTemplate } from "@/components/invoices/InvoicePrintTemplate";
import { useInvoiceDetail } from "@/hooks/invoices/useInvoiceDetail";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { isSuperadmin, isAdmin } = useAuth();
  const { invoice, services, items, loading, refetch } = useInvoiceDetail(
    id || "",
  );

  const canEdit = isSuperadmin || isAdmin;

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout>
        <div className="text-center py-24">
          <h2 className="text-lg font-medium">Faktur tidak ditemukan</h2>
          <Button asChild className="mt-4">
            <Link to="/invoices">Kembali ke Daftar Faktur</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      {/* Template Cetak — hanya tampil saat print */}
      <InvoicePrintTemplate
        invoice={invoice}
        services={services}
        items={items}
        companyInfo={{
          name: "REKAMTEKNIK",
          address: "Jember, Jawa Timur",
          phone: "+62 xxx-xxxx-xxxx",
          email: "info@rekamteknik.com",
          logo: "/logo.png",
        }}
      />

      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <InvoiceHeader
            invoice={invoice}
            canEdit={canEdit}
            onRefresh={refetch}
            onPrint={handlePrint}
          />

          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="summary">Ringkasan</TabsTrigger>
              <TabsTrigger value="services">
                Layanan ({services.length})
              </TabsTrigger>
              <TabsTrigger value="products">
                Produk ({items.length})
              </TabsTrigger>
              <TabsTrigger value="payment">Pembayaran</TabsTrigger>
              <TabsTrigger value="timeline">Riwayat</TabsTrigger>
              <TabsTrigger value="documents">Dokumen</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <InvoiceSummaryTab invoice={invoice} />
            </TabsContent>

            <TabsContent value="services">
              <ServicesTab services={services} invoiceId={invoice.id} />
            </TabsContent>

            <TabsContent value="products">
              <ProductsTab items={items} />
            </TabsContent>

            <TabsContent value="payment">
              <PaymentTab invoice={invoice} onPaymentRecorded={refetch} />
            </TabsContent>

            <TabsContent value="timeline">
              <TimelineTab invoice={invoice} />
            </TabsContent>

            <TabsContent value="documents">
              <DocumentsTab invoice={invoice} />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </>
  );
}
