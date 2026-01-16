import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  RefreshCw,
  FileText,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  payment_status: string;
  customer_name: string;
  services_total: number;
  items_total: number;
  grand_total: number;
  invoice_date: string;
  services_count: number;
  items_count: number;
}

export default function Invoices() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const { toast } = useToast();
  const { userRole, isSuperadmin, isAdmin } = useAuth();

  const canCreateInvoices =
    isSuperadmin || isAdmin || userRole === "manager" || userRole === "cashier";

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, paymentStatusFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("invoices")
        .select(
          `
          id,
          invoice_number,
          status,
          payment_status,
          services_total,
          items_total,
          grand_total,
          invoice_date,
          customers (name)
        `
        )
        .order("invoice_date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (paymentStatusFilter !== "all") {
        query = query.eq("payment_status", paymentStatusFilter);
      }

      const { data: invoicesData, error } = await query;

      if (error) throw error;

      // Fetch services and items count for each invoice
      const invoicesWithCounts = await Promise.all(
        (invoicesData || []).map(async (invoice) => {
          const [servicesResult, itemsResult] = await Promise.all([
            supabase
              .from("invoice_services")
              .select("id", { count: "exact", head: true })
              .eq("invoice_id", invoice.id),
            supabase
              .from("invoice_items")
              .select("id", { count: "exact", head: true })
              .eq("invoice_id", invoice.id),
          ]);

          return {
            id: invoice.id,
            invoice_number: invoice.invoice_number,
            status: invoice.status,
            payment_status: invoice.payment_status,
            customer_name: (invoice.customers as any)?.name || "Unknown",
            services_total: invoice.services_total || 0,
            items_total: invoice.items_total || 0,
            grand_total: invoice.grand_total || 0,
            invoice_date: invoice.invoice_date,
            services_count: servicesResult.count || 0,
            items_count: itemsResult.count || 0,
          };
        })
      );

      setInvoices(invoicesWithCounts);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load invoices",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: "Draft", className: "bg-gray-100 text-gray-800" },
      pending: { label: "Pending", className: "bg-amber-100 text-amber-800" },
      in_progress: {
        label: "In Progress",
        className: "bg-blue-100 text-blue-800",
      },
      completed: {
        label: "Completed",
        className: "bg-emerald-100 text-emerald-800",
      },
      paid: { label: "Paid", className: "bg-green-100 text-green-800" },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
    };
    const config = statusConfig[status] || { label: status, className: "" };
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      unpaid: { label: "Unpaid", className: "bg-red-100 text-red-800" },
      partial: { label: "Partial", className: "bg-amber-100 text-amber-800" },
      paid: { label: "Paid", className: "bg-emerald-100 text-emerald-800" },
    };
    const config = statusConfig[status] || { label: status, className: "" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.invoice_number
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      invoice.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">
              Manage invoices for services and product sales
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canCreateInvoices && (
              <Button asChild>
                <Link to="/invoices/new">
                  <Plus className="mr-2 h-4 w-4" />
                  New Transaction
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={paymentStatusFilter}
                onValueChange={setPaymentStatusFilter}
              >
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchInvoices}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mt-4">No invoices found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery ||
                  statusFilter !== "all" ||
                  paymentStatusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first invoice to get started"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="table-row-hover">
                        <TableCell className="font-mono text-sm">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {invoice.customer_name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(
                              new Date(invoice.invoice_date),
                              "MMM d, yyyy"
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.services_count > 0 ? (
                            <Badge variant="outline">
                              {invoice.services_count} service
                              {invoice.services_count > 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {invoice.items_count > 0 ? (
                            <Badge variant="outline">
                              {invoice.items_count} item
                              {invoice.items_count > 1 ? "s" : ""}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(invoice.payment_status)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(invoice.grand_total)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link to={`/invoices/${invoice.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
