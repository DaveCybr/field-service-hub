import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

// Components
import { InvoiceHeader } from "@/components/invoices/create/InvoiceHeader";
import { CustomerSection } from "@/components/invoices/create/CustomerSection";
import { InvoiceSettings } from "@/components/invoices/create/InvoiceSetting";
import { ServicesSection } from "@/components/invoices/create/ServiceSection";
import { ProductsSection } from "@/components/invoices/create/ProductSection";
import { InvoiceSummary } from "@/components/invoices/create/InvoiceSummary";

// Hooks
import { useInvoiceData } from "@/hooks/invoices/useInvoiceData";
import { useInvoiceServices } from "@/hooks/invoices/useInvoiceService";
import { useInvoiceProducts } from "@/hooks/invoices/useInvoiceProduct";

// Types
import type { Customer, Unit, Product, Technician } from "@/types/invoice";

export default function NewInvoice() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { log: auditLog } = useAuditLog();
  const { toast } = useToast();

  // Data loading
  const {
    customers,
    units,
    products,
    technicians,
    loading: dataLoading,
  } = useInvoiceData();

  // Invoice state
  const [customerId, setCustomerId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  // Services management
  const {
    services,
    addService,
    removeService,
    calculateTotal: calculateServiceTotal,
  } = useInvoiceServices();

  // Products management
  const {
    items,
    addProduct,
    removeProduct,
    calculateTotal: calculateItemsTotal,
  } = useInvoiceProducts(products);

  // Calculations
  const subtotal = calculateServiceTotal() + calculateItemsTotal();
  const discountAmount = parseFloat(discount) || 0;
  const taxAmount = parseFloat(tax) || 0;
  const grandTotal = subtotal - discountAmount + taxAmount;

  // Form validation
  const canSubmit =
    customerId && (services.length > 0 || items.length > 0) && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill all required fields",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert([
          {
            customer_id: customerId,
            invoice_number: invoiceNumber,
            status: "draft",
            payment_status: "unpaid",
            discount: discountAmount,
            tax: taxAmount,
            notes: invoiceNotes,
            created_by: employee?.id,
          },
        ])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Add services
      if (services.length > 0) {
        const servicesData = services.map((service) => ({
          invoice_id: invoice.id,
          title: service.title,
          description: service.description || null,
          unit_id: service.unit_id || null,
          assigned_technician_id: service.technician_id || null,
          scheduled_date: service.scheduled_date || null,
          service_address: service.service_address || null,
          service_latitude: service.service_latitude || null,
          service_longitude: service.service_longitude || null,
          estimated_duration_minutes: service.estimated_duration || 60,
          service_cost: service.service_cost || 0,
          parts_cost: 0, // Default to 0, can be updated later
          total_cost: service.service_cost || 0, // Total = service_cost + parts_cost
          priority: service.priority || "normal",
          status: "pending",
        }));

        const { error: servicesError } = await supabase
          .from("invoice_services")
          .insert(servicesData);

        if (servicesError) throw servicesError;
      }

      // Add products
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

        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(itemsData);

        if (itemsError) throw itemsError;
      }

      // Audit log
      await auditLog({
        action: "create",
        entityType: "invoice",
        entityId: invoice.id,
        newData: {
          invoice_number: invoice.invoice_number,
          customer_id: invoice.customer_id,
          services_count: services.length,
          items_count: items.length,
          grand_total: grandTotal,
        },
      });

      toast({
        title: "Invoice Created",
        description: `Invoice ${invoice.invoice_number} created successfully`,
      });

      navigate(`/invoices/${invoice.invoice_number}`);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create invoice",
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
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <InvoiceHeader />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Customer Selection */}
            <CustomerSection
              customers={customers}
              selectedCustomer={customerId}
              onCustomerChange={setCustomerId}
            />

            {/* Invoice Settings */}
            <InvoiceSettings
              discount={discount}
              tax={tax}
              notes={invoiceNotes}
              onDiscountChange={setDiscount}
              onTaxChange={setTax}
              onNotesChange={setInvoiceNotes}
            />
          </div>

          {/* Services Section */}
          <ServicesSection
            services={services}
            units={units}
            technicians={technicians}
            customerId={customerId}
            onAddService={addService}
            onRemoveService={removeService}
          />

          {/* Products Section */}
          <ProductsSection
            items={items}
            products={products}
            onAddProduct={addProduct}
            onRemoveProduct={removeProduct}
          />

          {/* Total Summary */}
          <InvoiceSummary
            servicesTotal={calculateServiceTotal()}
            itemsTotal={calculateItemsTotal()}
            discount={discountAmount}
            tax={taxAmount}
            grandTotal={grandTotal}
          />

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/invoices">Cancel</Link>
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Invoice"
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
