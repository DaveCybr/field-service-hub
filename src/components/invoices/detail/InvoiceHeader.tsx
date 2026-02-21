// InvoiceHeader.tsx (detail page)
// Header faktur: navigasi, badge status, tombol aksi
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Printer, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { getStatusBadge, getPaymentBadge } from "@/lib/utils/badges";
import { useNavigateWithParams } from "@/hooks/useNavigateWithParams";
import type { Invoice } from "@/hooks/invoices/useInvoiceDetail";
import { SendInvoiceEmail } from "../SendInvoiceEmail";
import { DeleteInvoiceDialog } from "../DeleteInvoiceDialog";
import { InvoiceStatusActions } from "../InvoiceStatusActions";

interface InvoiceHeaderProps {
  invoice: Invoice;
  canEdit: boolean;
  onPrint: () => void;
  onRefresh: () => void;
}

export function InvoiceHeader({
  invoice,
  canEdit,
  onRefresh,
  onPrint,
}: InvoiceHeaderProps) {
  const { goBack } = useNavigateWithParams();
  const navigate = useNavigate();
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
            title="Kembali ke daftar faktur"
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
              {format(new Date(invoice.invoice_date), "dd MMMM yyyy", {
                locale: localeId,
              })}
            </p>
          </div>
        </div>

        {/* Tombol Aksi — Dikelompokkan: Sekunder | Primer */}
        <div className="flex gap-2 flex-wrap items-center">
          {/* Aksi Sekunder */}
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer className="h-4 w-4 mr-2" />
            Cetak
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmailDialogOpen(true)}
          >
            <Mail className="h-4 w-4 mr-2" />
            Kirim Email
          </Button>

          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/invoices/${invoice.invoice_number}/edit`)
              }
            >
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}

          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus
            </Button>
          )}

          {/* Aksi Primer (Status/Pembayaran) */}
          <InvoiceStatusActions invoice={invoice} onStatusChanged={onRefresh} />
        </div>
      </div>

      <SendInvoiceEmail
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        invoiceNumber={invoice.invoice_number}
        customerEmail={invoice.customer?.email}
        invoiceUrl={window.location.href}
      />

      <DeleteInvoiceDialog
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}
