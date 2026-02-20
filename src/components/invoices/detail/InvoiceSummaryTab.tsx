// InvoiceSummaryTab.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils/currency";
import type { Invoice } from "@/hooks/invoices/useInvoiceDetail";

export function InvoiceSummaryTab({ invoice }: { invoice: Invoice }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Detail Faktur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Pelanggan</p>
              <p className="font-medium">{invoice.customer?.name}</p>
              <p className="text-sm text-muted-foreground">
                {invoice.customer?.phone}
              </p>
              {invoice.customer?.email && (
                <p className="text-sm text-muted-foreground">
                  {invoice.customer.email}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Alamat</p>
              <p className="text-sm">{invoice.customer?.address || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tanggal Faktur</p>
              <p className="font-medium">
                {format(new Date(invoice.invoice_date), "dd MMMM yyyy", {
                  locale: localeId,
                })}
              </p>
            </div>
            {invoice.due_date && (
              <div>
                <p className="text-sm text-muted-foreground">Jatuh Tempo</p>
                <p className="font-medium">
                  {format(new Date(invoice.due_date), "dd MMMM yyyy", {
                    locale: localeId,
                  })}
                </p>
              </div>
            )}
            {invoice.created_by && (
              <div>
                <p className="text-sm text-muted-foreground">Dibuat Oleh</p>
                <p className="font-medium">{invoice.created_by.name}</p>
              </div>
            )}
          </div>

          {invoice.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Catatan</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            </>
          )}

          {invoice.admin_notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Catatan Admin</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.admin_notes}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ringkasan Total</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Layanan:</span>
            <span className="font-medium">
              {formatCurrency(invoice.services_total)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Produk:</span>
            <span className="font-medium">
              {formatCurrency(invoice.items_total)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-medium">
              {formatCurrency(invoice.services_total + invoice.items_total)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Diskon:</span>
            <span className="font-medium text-destructive">
              -{formatCurrency(invoice.discount)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pajak:</span>
            <span className="font-medium">{formatCurrency(invoice.tax)}</span>
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
            <span className="text-muted-foreground">Dibayar:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(invoice.amount_paid || 0)}
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Sisa:</span>
            <span
              className={
                invoice.grand_total - (invoice.amount_paid || 0) > 0
                  ? "text-destructive"
                  : "text-emerald-600"
              }
            >
              {formatCurrency(
                Math.max(0, invoice.grand_total - (invoice.amount_paid || 0)),
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
