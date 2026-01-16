import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Printer } from "lucide-react";
import { useLocation } from "react-router-dom";
import { format } from "date-fns";
import { getStatusBadge, getPaymentBadge } from "@/lib/utils/badges";
import { useNavigateWithParams } from "@/hooks/useNavigateWithParams";
import type { Invoice } from "@/hooks/invoices/useInvoiceDetail";

interface InvoiceHeaderProps {
  invoice: Invoice;
  canEdit: boolean;
  onStatusChange: (newStatus: string) => void;
  onPrint: () => void;
}

export function InvoiceHeader({
  invoice,
  canEdit,
  onStatusChange,
  onPrint,
}: InvoiceHeaderProps) {
  const { goBack } = useNavigateWithParams();
  const location = useLocation();

  // Check if we have query params to preserve
  const hasParams = location.search.length > 0;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          title={hasParams ? "Back to filtered list" : "Back to invoices"}
        >
          <ArrowLeft className="h-5 w-5" />
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

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onPrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>

        {canEdit && (
          <Select value={invoice.status} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
