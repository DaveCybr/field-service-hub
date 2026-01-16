import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  DollarSign,
  FileText,
  Package,
  Wrench,
} from "lucide-react";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  status: string;
  payment_status: string;
  invoice_date: string;
  due_date?: string;
  services_total: number;
  items_total: number;
  discount: number;
  tax: number;
  grand_total: number;
  amount_paid: number;
  notes?: string;
  admin_notes?: string;
  customer?: { name: string; phone: string; email?: string };
  created_by?: { name: string };
}

interface InvoiceService {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  service_cost: number;
  assigned_technician?: { name: string };
}

interface InvoiceItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { log: auditLog } = useAuditLog();
  const { userRole, isSuperadmin, isAdmin } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [services, setServices] = useState<InvoiceService[]>([]);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const canEdit = isSuperadmin || isAdmin;
  const isCashier = userRole === "cashier";

  useEffect(() => {
    if (id) fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select(
          `
          *,
          customers (name, phone, email),
          created_by:employees!invoices_created_by_fkey (name)
        `
        )
        .eq("id", id)
        .single();

      if (invoiceError) throw invoiceError;

      setInvoice({
        ...invoiceData,
        customer: invoiceData.customers,
      });

      // Fetch services
      const { data: servicesData, error: servicesError } = await supabase
        .from("invoice_services")
        .select(
          `
          id,
          title,
          description,
          status,
          priority,
          service_cost,
          assigned_technician:employees!invoice_services_assigned_technician_id_fkey (name)
        `
        )
        .eq("invoice_id", id);

      if (servicesError) throw servicesError;
      setServices(servicesData || []);

      // Fetch items
      const { data: itemsData, error: itemsError } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", id);

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load invoice",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;

    setUpdating(true);
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
      fetchInvoice();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update status",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice || !paymentAmount) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter payment amount",
      });
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Amount must be greater than 0",
      });
      return;
    }

    setUpdating(true);
    try {
      const newAmountPaid = (invoice.amount_paid || 0) + amount;
      const newPaymentStatus =
        newAmountPaid >= invoice.grand_total
          ? "paid"
          : newAmountPaid > 0
          ? "partial"
          : "unpaid";

      const { error } = await supabase
        .from("invoices")
        .update({
          amount_paid: newAmountPaid,
          payment_status: newPaymentStatus,
          status: newPaymentStatus === "paid" ? "paid" : invoice.status,
          admin_notes: `${
            invoice.admin_notes || ""
          }\n\n--- Payment ---\nMethod: ${paymentMethod}\nAmount: Rp ${amount.toLocaleString(
            "id-ID"
          )}\nProcessed: ${new Date().toLocaleString("id-ID")}`,
        })
        .eq("id", invoice.id);

      if (error) throw error;

      await auditLog({
        action: "payment",
        entityType: "invoice",
        entityId: invoice.id,
        newData: {
          amount_paid: newAmountPaid,
          payment_method: paymentMethod,
          invoice_number: invoice.invoice_number,
        },
      });

      toast({
        title: "Payment Recorded",
        description: "Payment has been processed successfully",
      });
      setPaymentAmount("");
      setPaymentMethod("cash");
      fetchInvoice();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to record payment",
      });
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      draft: { label: "Draft", color: "bg-gray-100 text-gray-800" },
      pending: { label: "Pending", color: "bg-amber-100 text-amber-800" },
      in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-800" },
      completed: {
        label: "Completed",
        color: "bg-emerald-100 text-emerald-800",
      },
      paid: { label: "Paid", color: "bg-green-100 text-green-800" },
    };
    const { label, color } = config[status] || { label: status, color: "" };
    return <Badge className={color}>{label}</Badge>;
  };

  const getPaymentBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      unpaid: { label: "Unpaid", color: "bg-red-100 text-red-800" },
      partial: { label: "Partial", color: "bg-amber-100 text-amber-800" },
      paid: { label: "Paid", color: "bg-emerald-100 text-emerald-800" },
    };
    const { label, color } = config[status] || { label: status, color: "" };
    return <Badge className={color}>{label}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/invoices">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">
                  {invoice.invoice_number}
                </h1>
                {getStatusBadge(invoice.status)}
                {getPaymentBadge(invoice.payment_status)}
              </div>
              <p className="text-muted-foreground mt-1">
                {invoice.customer?.name} •{" "}
                {format(new Date(invoice.invoice_date), "PPP")}
              </p>
            </div>
          </div>

          {canEdit && (
            <Select
              value={invoice.status}
              onValueChange={handleStatusChange}
              disabled={updating}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Invoice Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{invoice.customer?.name}</p>
                      {invoice.customer?.email && (
                        <p className="text-sm text-muted-foreground">
                          {invoice.customer.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{invoice.customer?.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Invoice Date
                      </p>
                      <p className="font-medium">
                        {format(new Date(invoice.invoice_date), "PPP")}
                      </p>
                    </div>
                    {invoice.due_date && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Due Date
                        </p>
                        <p className="font-medium">
                          {format(new Date(invoice.due_date), "PPP")}
                        </p>
                      </div>
                    )}
                  </div>
                  {invoice.notes && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="text-sm whitespace-pre-wrap">
                          {invoice.notes}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Totals Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Total Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Services:</span>
                    <span>{formatCurrency(invoice.services_total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Products:</span>
                    <span>{formatCurrency(invoice.items_total)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>
                      {formatCurrency(
                        invoice.services_total + invoice.items_total
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span>-{formatCurrency(invoice.discount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>{formatCurrency(invoice.tax)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span className="text-primary">
                      {formatCurrency(invoice.grand_total)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>Paid:</span>
                    <span>{formatCurrency(invoice.amount_paid || 0)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Remaining:</span>
                    <span
                      className={
                        remainingAmount > 0
                          ? "text-destructive"
                          : "text-emerald-600"
                      }
                    >
                      {formatCurrency(remainingAmount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Services ({services.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No services in this invoice
                  </p>
                ) : (
                  <div className="space-y-3">
                    {services.map((service) => (
                      <div
                        key={service.id}
                        className="p-4 rounded-lg border space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{service.title}</p>
                            {service.description && (
                              <p className="text-sm text-muted-foreground">
                                {service.description}
                              </p>
                            )}
                          </div>
                          <Badge>{service.priority}</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Status: {service.status}</span>
                          <span>
                            Cost: {formatCurrency(service.service_cost)}
                          </span>
                        </div>
                        {service.assigned_technician && (
                          <p className="text-sm text-muted-foreground">
                            Technician: {service.assigned_technician.name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Products ({items.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No products in this invoice
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Product</th>
                          <th className="text-right py-2">Unit Price</th>
                          <th className="text-right py-2">Qty</th>
                          <th className="text-right py-2">Discount</th>
                          <th className="text-right py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="py-2">{item.product_name}</td>
                            <td className="text-right">
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td className="text-right">{item.quantity}</td>
                            <td className="text-right">
                              {formatCurrency(item.discount)}
                            </td>
                            <td className="text-right font-medium">
                              {formatCurrency(item.total_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment">
            <div className="space-y-6">
              {isCashier && remainingAmount > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Record Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-sm text-muted-foreground">
                        Amount Due
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(remainingAmount)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Amount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="10000"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder={formatCurrency(remainingAmount)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={setPaymentMethod}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="transfer">
                            Bank Transfer
                          </SelectItem>
                          <SelectItem value="card">
                            Credit/Debit Card
                          </SelectItem>
                          <SelectItem value="qris">QRIS</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handlePayment}
                      disabled={updating || !paymentAmount}
                      className="w-full"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Record Payment"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between p-3 rounded-lg bg-muted">
                      <span>Total Amount Due:</span>
                      <span className="font-medium">
                        {formatCurrency(invoice.grand_total)}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-muted">
                      <span>Amount Paid:</span>
                      <span className="font-medium">
                        {formatCurrency(invoice.amount_paid || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between p-3 rounded-lg bg-muted">
                      <span>Remaining:</span>
                      <span
                        className={`font-medium ${
                          remainingAmount > 0
                            ? "text-destructive"
                            : "text-emerald-600"
                        }`}
                      >
                        {formatCurrency(remainingAmount)}
                      </span>
                    </div>
                  </div>
                  {invoice.admin_notes && (
                    <div className="mt-4 p-3 rounded-lg bg-muted">
                      <p className="text-sm font-medium">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">
                        {invoice.admin_notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
