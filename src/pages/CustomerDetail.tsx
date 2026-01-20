import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  FileText,
  Building2,
  User,
  Edit,
  Trash2,
  Plus,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";
import { useToast } from "@/hooks/use-toast";
import { EditCustomerModal } from "@/components/customers/EditCustomerModal";
import { DeleteCustomerDialog } from "@/components/customers/DeleteCustomerDialog";
import { QuickRegisterUnitModal } from "@/components/units/QuickRegisterUnitModal";

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
    if (id) {
      fetchCustomerDetails();
    }
  }, [id]);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      // Fetch customer details
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Fetch customer's units
      const { data: unitsData, error: unitsError } = await supabase
        .from("units")
        .select("id, qr_code, unit_type, brand, model, warranty_expiry_date")
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      if (unitsError) throw unitsError;
      setUnits(unitsData || []);

      // Fetch customer's invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, invoice_date, status, payment_status, grand_total",
        )
        .eq("customer_id", id)
        .order("invoice_date", { ascending: false });

      if (invoicesError) throw invoicesError;
      setInvoices(invoicesData || []);
    } catch (error: any) {
      console.error("Error fetching customer details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load customer details",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditSuccess = () => {
    fetchCustomerDetails();
  };

  const handleDeleteSuccess = () => {
    toast({
      title: "Success",
      description: "Navigating back to customers list",
    });
    navigate("/customers");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800" },
      in_progress: {
        label: "In Progress",
        className: "bg-blue-100 text-blue-800",
      },
      completed: {
        label: "Completed",
        className: "bg-green-100 text-green-800",
      },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
    };
    const { label, className } = config[status] || config.draft;
    return <Badge className={className}>{label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      unpaid: { label: "Unpaid", className: "bg-red-100 text-red-800" },
      partial: { label: "Partial", className: "bg-yellow-100 text-yellow-800" },
      paid: { label: "Paid", className: "bg-green-100 text-green-800" },
    };
    const { label, className } = config[status] || config.unpaid;
    return <Badge className={className}>{label}</Badge>;
  };

  const isWarrantyActive = (date: string | null) => {
    if (!date) return false;
    return new Date(date) > new Date();
  };

  // Calculate statistics
  const totalSpent = invoices
    .filter((inv) => inv.payment_status === "paid")
    .reduce((sum, inv) => sum + inv.grand_total, 0);

  const paidInvoices = invoices.filter(
    (inv) => inv.payment_status === "paid",
  ).length;
  const unpaidInvoices = invoices.filter(
    (inv) => inv.payment_status === "unpaid",
  ).length;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">Customer not found</h3>
          <Button onClick={() => navigate("/customers")} className="mt-4">
            Back to Customers
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/customers")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div
                className={`rounded-full p-3 ${
                  customer.category === "project"
                    ? "bg-purple-100 text-purple-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                {customer.category === "project" ? (
                  <Building2 className="h-6 w-6" />
                ) : (
                  <User className="h-6 w-6" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {customer.name}
                </h1>
                <p className="text-muted-foreground">
                  {customer.category === "project"
                    ? "Project Customer"
                    : "Retail Customer"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/invoices/new?customer_id=${customer.id}`)
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
            <Button variant="outline" onClick={() => setEditModalOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customer Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{customer.phone}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{customer.email || "-"}</p>
                    </div>
                  </div>
                </div>

                {customer.address && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <div className="flex items-start gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <p className="font-medium">{customer.address}</p>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <Badge
                      variant={
                        customer.category === "project"
                          ? "default"
                          : "secondary"
                      }
                      className="mt-1"
                    >
                      {customer.category === "project" ? "Project" : "Retail"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Payment Terms
                    </p>
                    <p className="font-medium mt-1">
                      {customer.category === "project" &&
                      customer.payment_terms_days > 0
                        ? `${customer.payment_terms_days} days`
                        : "Cash"}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">
                    {customer.blacklisted ? (
                      <Badge variant="destructive">Blacklisted</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        Active
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground">
                    Customer Since
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="font-medium">
                      {format(new Date(customer.created_at), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Units List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Registered Units</span>
                  <Badge variant="secondary">{units.length} units</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {units.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No units registered yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {units.map((unit) => (
                      <button
                        key={unit.id}
                        onClick={() => navigate(`/units/${unit.id}`)}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left border"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{unit.unit_type}</p>
                            <p className="text-sm text-muted-foreground">
                              {[unit.brand, unit.model]
                                .filter(Boolean)
                                .join(" ") || "No brand/model"}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {unit.qr_code}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {unit.warranty_expiry_date && (
                            <Badge
                              variant={
                                isWarrantyActive(unit.warranty_expiry_date)
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {isWarrantyActive(unit.warranty_expiry_date)
                                ? "Warranty"
                                : "Expired"}
                            </Badge>
                          )}
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoice History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Invoice History</span>
                  <Badge variant="secondary">{invoices.length} invoices</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No invoices yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invoices.slice(0, 10).map((invoice) => {
                      console.log(invoice);
                      return (
                        <button
                          key={invoice.id}
                          onClick={() =>
                            navigate(`/invoices/${invoice.invoice_number}`)
                          }
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors text-left border"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-mono font-medium text-sm">
                                {invoice.invoice_number}
                              </p>
                              {getPaymentStatusBadge(invoice.payment_status)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {format(
                                new Date(invoice.invoice_date),
                                "MMM d, yyyy",
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-medium">
                                {formatCurrency(invoice.grand_total)}
                              </p>
                              {getStatusBadge(invoice.status)}
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      );
                    })}
                    {invoices.length > 10 && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() =>
                          navigate(`/invoices?customer=${customer.id}`)
                        }
                      >
                        View all {invoices.length} invoices
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Statistics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Units</p>
                  <p className="text-2xl font-bold mt-1">{units.length}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Invoices
                  </p>
                  <p className="text-2xl font-bold mt-1">{invoices.length}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Paid Invoices</p>
                  <p className="text-lg font-medium mt-1 text-green-600">
                    {paidInvoices}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Unpaid Invoices
                  </p>
                  <p className="text-lg font-medium mt-1 text-red-600">
                    {unpaidInvoices}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xl font-bold">
                      {formatCurrency(totalSpent)}
                    </p>
                  </div>
                </div>
                {customer.current_outstanding > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Outstanding
                      </p>
                      <p className="text-xl font-bold text-destructive mt-1">
                        {formatCurrency(customer.current_outstanding)}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() =>
                    navigate(`/invoices/new?customer_id=${customer.id}`)
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setQuickRegisterOpen(true)}
                >
                  <Package className="mr-2 h-4 w-4" />
                  Register Unit
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditCustomerModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        customer={customer}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Dialog */}
      <DeleteCustomerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        customer={customer}
        unitCount={units.length}
        invoiceCount={invoices.length}
        onSuccess={handleDeleteSuccess}
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
