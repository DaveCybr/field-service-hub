import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Mail, Printer, Pencil, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { getStatusBadge, getPaymentBadge } from "@/lib/utils/badges";
import { useNavigateWithParams } from "@/hooks/useNavigateWithParams";
import type { Invoice } from "@/hooks/invoices/useInvoiceDetail";
import { SendInvoiceEmail } from "../SendInvoiceEmail";
import { DeleteInvoiceDialog } from "../DeleteInvoiceDialog";

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
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we have query params to preserve
  const hasParams = location.search.length > 0;

  // Dialogs state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
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

        <div className="flex gap-2 flex-wrap">
          {/* Print Button */}
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>

          {/* Send Email Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmailDialogOpen(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Email
          </Button>

          {/* Edit Button - Only for admins */}
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}

          {/* Delete Button - Only for admins */}
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}

          {/* Status Dropdown - Only for admins */}
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

      {/* Email Dialog */}
      <SendInvoiceEmail
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        invoiceNumber={invoice.invoice_number}
        customerEmail={invoice.customer?.email}
        invoiceUrl={window.location.href}
      />

      {/* Delete Dialog */}
      <DeleteInvoiceDialog
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
