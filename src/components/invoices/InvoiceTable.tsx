import { useState } from "react";
import { useNavigateWithParams } from "@/hooks/useNavigateWithParams";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontal,
  Eye,
  Printer,
  Mail,
  ArrowUpDown,
  Wrench,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";
import { getStatusBadge, getPaymentBadge } from "@/lib/utils/badges";

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer?: {
    name: string;
  };
  invoice_date: string;
  grand_total: number;
  status: string;
  payment_status: string;
  services_count?: number;
  items_count?: number;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  loading: boolean;
  onRefresh: () => void;
}

type SortField = "invoice_date" | "grand_total" | "invoice_number";
type SortOrder = "asc" | "desc";

export function InvoiceTable({
  invoices,
  loading,
  onRefresh,
}: InvoiceTableProps) {
  const { navigate } = useNavigateWithParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("invoice_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === "invoice_date") {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === invoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(invoices.map((inv) => inv.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleView = (id: string) => {
    navigate(`/invoices/${id}`);
  };

  const handlePrint = (id: string) => {
    // TODO: Implement print
    console.log("Print invoice:", id);
  };

  const handleEmail = (id: string) => {
    // TODO: Implement email
    console.log("Email invoice:", id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">
            Loading invoices...
          </p>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <MoreHorizontal className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No invoices found</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Try adjusting your filters or create a new invoice
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions (if selected) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <Button size="sm" variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print Selected
          </Button>
          <Button size="sm" variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Email Selected
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === invoices.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort("invoice_number")}
                >
                  Invoice #
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort("invoice_date")}
                >
                  Date
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-mr-3 h-8"
                  onClick={() => handleSort("grand_total")}
                >
                  Amount
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInvoices.map((invoice) => (
              <TableRow
                key={invoice.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleView(invoice.id)}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.includes(invoice.id)}
                    onCheckedChange={() => toggleSelect(invoice.id)}
                  />
                </TableCell>
                <TableCell className="font-mono text-sm font-medium">
                  {invoice.invoice_number}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{invoice.customer?.name}</div>
                </TableCell>
                <TableCell>
                  {format(new Date(invoice.invoice_date), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    {invoice.services_count! > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Wrench className="h-3 w-3" />
                        {invoice.services_count}
                      </Badge>
                    )}
                    {invoice.items_count! > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Package className="h-3 w-3" />
                        {invoice.items_count}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(invoice.grand_total)}
                </TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell>{getPaymentBadge(invoice.payment_status)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleView(invoice.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrint(invoice.id)}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEmail(invoice.id)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
