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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, Wrench, Package, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils/currency";
import { getStatusBadge, getPaymentBadge } from "@/lib/utils/badges";
import { BulkExport } from "./BulkExport";

export interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer?: { name: string };
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

    return sortOrder === "asc"
      ? aValue > bValue
        ? 1
        : -1
      : aValue < bValue
        ? 1
        : -1;
  });

  const toggleSelectAll = () => {
    setSelectedIds(
      selectedIds.length === invoices.length
        ? []
        : invoices.map((inv) => inv.id),
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  // ✅ FIX: Selalu navigasi pakai invoice_number (bukan id UUID)
  const handleView = (invoiceNumber: string) => {
    navigate(`/invoices/${invoiceNumber}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">Memuat faktur...</p>
        </div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">Belum ada faktur</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Coba ubah filter pencarian atau buat faktur baru
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aksi Massal */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedIds.length} dipilih
          </span>
          <BulkExport selectedIds={selectedIds} allInvoices={sortedInvoices} />
        </div>
      )}

      {/* Tabel */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedIds.length === invoices.length &&
                    invoices.length > 0
                  }
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
                  No. Faktur
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort("invoice_date")}
                >
                  Tanggal
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead className="text-center">Item</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-mr-3 h-8"
                  onClick={() => handleSort("grand_total")}
                >
                  Total
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pembayaran</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedInvoices.map((invoice) => (
              <TableRow
                key={invoice.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleView(invoice.invoice_number)}
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
                  {format(new Date(invoice.invoice_date), "dd MMM yyyy", {
                    locale: localeId,
                  })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2">
                    {(invoice.services_count ?? 0) > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Wrench className="h-3 w-3" />
                        {invoice.services_count}
                      </Badge>
                    )}
                    {(invoice.items_count ?? 0) > 0 && (
                      <Badge variant="secondary" className="gap-1">
                        <Package className="h-3 w-3" />
                        {invoice.items_count}
                      </Badge>
                    )}
                    {!invoice.services_count && !invoice.items_count && (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(invoice.grand_total)}
                </TableCell>
                <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                <TableCell>{getPaymentBadge(invoice.payment_status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
