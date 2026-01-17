import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Printer } from "lucide-react";

// Components
import { InvoiceHeader } from "@/components/invoices/detail/InvoiceHeader";
import { InvoiceSummaryTab } from "@/components/invoices/detail/InvoiceSummaryTab";
import { ServicesTab } from "@/components/invoices/detail/ServicesTab";
import { ProductsTab } from "@/components/invoices/detail/ProductsTab";
import { PaymentTab } from "@/components/invoices/detail/PaymentTab";

// Hooks
import { useInvoiceDetail } from "@/hooks/invoices/useInvoiceDetail";
import { TimelineTab } from "@/components/invoices/detail/TimelineTab";
import { DocumentsTab } from "@/components/invoices/detail/DocumentsTab";
import { InvoicePrintTemplate } from "@/components/invoices/InvoicePrintTemplate";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { log: auditLog } = useAuditLog();
  const { userRole, isSuperadmin, isAdmin, employee } = useAuth();

  const { invoice, services, items, loading, updating, refetch } =
    useInvoiceDetail(id || "");

  const canEdit = isSuperadmin || isAdmin;
  const isCashier = userRole === "cashier";
  const canRecordPayment = isCashier || canEdit;

  const handlePrint = () => {
    window.print();
  };

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
          <h2 className="text-lg font-medium">Invoice not found</h2>
          <Button asChild className="mt-4">
            <Link to="/invoices">Back to Invoices</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const remainingAmount = Math.max(
    0,
    invoice.grand_total - (invoice.amount_paid || 0)
  );

  return (
    <>
      {/* Print Template - only visible when printing */}
      <InvoicePrintTemplate
        invoice={invoice}
        services={services}
        items={items}
        companyInfo={{
          name: "Your Company Name",
          address: "123 Business St, City, Country",
          phone: "+62 123-4567-890",
          email: "info@yourcompany.com",
          logo: "/logo.png", // Optional
        }}
      />

      {/* Main Content */}
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <InvoiceHeader
            invoice={invoice}
            canEdit={canEdit}
            onStatusChange={async (newStatus) => {
              try {
                const { error } = await supabase
                  .from("invoices")
                  .update({ status: newStatus })
                  .eq("id", invoice.id);

                if (error) throw error;

                await auditLog({
                  action: "status_change",
                  entityType: "invoice",
                  entityId: invoice.id,
                  oldData: { status: invoice.status },
                  newData: { status: newStatus },
                });

                toast({
                  title: "Status Updated",
                  description: `Invoice status changed to ${newStatus}`,
                });

                refetch();
              } catch (error: any) {
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: error.message || "Failed to update status",
                });
              }
            }}
            onPrint={handlePrint}
          />

          {/* Tabs */}
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="services">
                Services ({services.length})
              </TabsTrigger>
              <TabsTrigger value="products">
                Products ({items.length})
              </TabsTrigger>
              <TabsTrigger value="payment">Payment</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            {/* Summary Tab */}
            <TabsContent value="summary">
              <InvoiceSummaryTab invoice={invoice} />
            </TabsContent>

            {/* Services Tab */}
            <TabsContent value="services">
              <ServicesTab services={services} />
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products">
              <ProductsTab items={items} />
            </TabsContent>

            {/* Payment Tab */}
            <TabsContent value="payment">
              <PaymentTab invoice={invoice} onPaymentRecorded={refetch} />
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline">
              <TimelineTab invoice={invoice} />
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents">
              <DocumentsTab invoice={invoice} />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </>
  );
}
