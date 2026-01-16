import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";
import type { Invoice } from "@/hooks/invoices/useInvoiceDetail";

interface InvoiceSummaryTabProps {
  invoice: Invoice;
}

export function InvoiceSummaryTab({ invoice }: InvoiceSummaryTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Invoice Details */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
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
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="text-sm">{invoice.customer?.address || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invoice Date</p>
              <p className="font-medium">
                {format(new Date(invoice.invoice_date), "PPP")}
              </p>
            </div>
            {invoice.due_date && (
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">
                  {format(new Date(invoice.due_date), "PPP")}
                </p>
              </div>
            )}
            {invoice.created_by && (
              <div>
                <p className="text-sm text-muted-foreground">Created By</p>
                <p className="font-medium">{invoice.created_by.name}</p>
              </div>
            )}
          </div>

          {invoice.notes && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-2">Notes</p>
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
                <p className="text-sm font-medium mb-2">Admin Notes</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.admin_notes}
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
            <span className="text-muted-foreground">Services:</span>
            <span className="font-medium">
              {formatCurrency(invoice.services_total)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Products:</span>
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
            <span className="text-muted-foreground">Discount:</span>
            <span className="font-medium text-destructive">
              -{formatCurrency(invoice.discount)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax:</span>
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
            <span className="text-muted-foreground">Paid:</span>
            <span className="font-medium text-green-600">
              {formatCurrency(invoice.amount_paid || 0)}
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Remaining:</span>
            <span
              className={
                invoice.grand_total - (invoice.amount_paid || 0) > 0
                  ? "text-destructive"
                  : "text-emerald-600"
              }
            >
              {formatCurrency(
                Math.max(0, invoice.grand_total - (invoice.amount_paid || 0))
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
