import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

// Components
import { CustomerSection } from "@/components/invoices/create/CustomerSection";
import { InvoiceSettings } from "@/components/invoices/create/InvoiceSetting";
import { ServicesSection } from "@/components/invoices/create/ServiceSection";
import { ProductsSection } from "@/components/invoices/create/ProductSection";
import { InvoiceSummary } from "@/components/invoices/create/InvoiceSummary";

// Hooks
import { useInvoiceData } from "@/hooks/invoices/useInvoiceData";
import { useInvoiceServices } from "@/hooks/invoices/useInvoiceService";
import { useInvoiceProducts } from "@/hooks/invoices/useInvoiceProduct";

export default function EditInvoice() {
  const { id } = useParams<{ id: string }>();
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
  const [invoice, setInvoice] = useState<any>(null);
  const [customerId, setCustomerId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Services state
  const [services, setServices] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  // Services management functions
  const addService = (service: any) => {
    const newService = {
      ...service,
      id: services.length.toString(), // Add ID
    };
    setServices([...services, newService]);
  };

  const removeService = (id: string | number) => {
    console.log("Removing service:", id, typeof id);
    setServices(services.filter((s) => s.id !== id.toString()));
  };

  const calculateServiceTotal = () => {
    return services.reduce(
      (sum, service) => sum + (service.service_cost || 0),
      0
    );
  };

  // Products management functions
  const addProduct = (item: any) => {
    const newItem = {
      ...item,
      id: items.length.toString(), // Add ID
    };
    setItems([...items, newItem]);
  };

  const removeProduct = (id: string | number) => {
    console.log("Removing product:", id, typeof id);
    setItems(items.filter((i) => i.id !== id.toString()));
  };

  const calculateItemsTotal = () => {
    return items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.product_id);
      const unitPrice = product?.sell_price || item.unit_price || 0;
      return sum + (unitPrice * item.quantity - (item.discount || 0));
    }, 0);
  };

  // Load existing invoice data
  useEffect(() => {
    if (id) {
      loadInvoice(id);
    }
  }, [id]);

  const loadInvoice = async (invoiceId: string) => {
    try {
      // Load invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(
          `
          *,
          customer:customers(id, name)
        `
        )
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from("invoice_services")
        .select("*")
        .eq("invoice_id", invoiceId);

      if (servicesError) throw servicesError;

      // Load products
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId);

      if (itemsError) throw itemsError;

      // Set invoice data
      setInvoice(invoiceData);
      setCustomerId(invoiceData.customer_id);
      setInvoiceNotes(invoiceData.notes || "");
      setDiscount(invoiceData.discount?.toString() || "0");
      setTax(invoiceData.tax?.toString() || "0");

      // Map services to form format
      const mappedServices = servicesData.map(
        (service: any, index: number) => ({
          id: index.toString(), // ADD ID for ServiceList
          title: service.title,
          description: service.description || "",
          unit_id: service.unit_id || "",
          technician_id: service.assigned_technician_id || "",
          scheduled_date: service.scheduled_date || "",
          service_address: service.service_address || "",
          service_latitude: service.service_latitude || null,
          service_longitude: service.service_longitude || null,
          estimated_duration: service.estimated_duration_minutes || 60,
          service_cost: service.service_cost || 0,
          priority: service.priority || "normal",
        })
      );
      setServices(mappedServices);

      // Map items to form format
      const mappedItems = itemsData.map((item: any, index: number) => ({
        id: index.toString(), // ADD ID for ProductList
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount: item.discount || 0,
      }));
      setItems(mappedItems);

      setLoading(false);
    } catch (error: any) {
      console.error("Error loading invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load invoice data",
      });
      navigate("/invoices");
    }
  };

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
      // Update invoice
      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          customer_id: customerId,
          discount: discountAmount,
          tax: taxAmount,
          notes: invoiceNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (invoiceError) throw invoiceError;

      // Delete existing services and items
      await supabase.from("invoice_services").delete().eq("invoice_id", id);
      await supabase.from("invoice_items").delete().eq("invoice_id", id);

      // Add services
      if (services.length > 0) {
        const servicesData = services.map((service) => ({
          invoice_id: id,
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
          parts_cost: 0,
          total_cost: service.service_cost || 0,
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
            invoice_id: id,
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
        action: "update",
        entityType: "invoice",
        entityId: id!,
        oldData: {
          customer_id: invoice.customer_id,
          discount: invoice.discount,
          tax: invoice.tax,
        },
        newData: {
          customer_id: customerId,
          discount: discountAmount,
          tax: taxAmount,
          services_count: services.length,
          items_count: items.length,
          grand_total: grandTotal,
        },
      });

      toast({
        title: "Invoice Updated",
        description: `Invoice ${invoice.invoice_number} updated successfully`,
      });

      navigate(`/invoices/${id}`);
    } catch (error: any) {
      console.error("Error updating invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update invoice",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || dataLoading) {
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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/invoices/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Invoice</h1>
            <p className="text-muted-foreground">{invoice.invoice_number}</p>
          </div>
        </div>

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
              <Link to={`/invoices/${id}`}>Cancel</Link>
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Invoice"
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
