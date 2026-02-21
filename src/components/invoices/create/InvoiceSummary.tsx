// InvoiceSummary.tsx (create)
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils/currency";

interface InvoiceSummaryProps {
  servicesTotal: number;
  itemsTotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
}

export function InvoiceSummary({
  servicesTotal,
  itemsTotal,
  discount,
  tax,
  grandTotal,
}: InvoiceSummaryProps) {
  const subtotal = servicesTotal + itemsTotal;

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span>Layanan:</span>
          <span>{formatCurrency(servicesTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Produk:</span>
          <span>{formatCurrency(itemsTotal)}</span>
        </div>
        <Separator />
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-destructive">
          <span>Diskon:</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Pajak (PPN):</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-semibold text-lg">
          <span>Total:</span>
          <span className="text-primary">{formatCurrency(grandTotal)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
