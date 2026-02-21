import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { InvoiceItem } from "@/hooks/invoices/useInvoiceDetail";

interface ProductsTabProps {
  items: InvoiceItem[];
}

export function ProductsTab({ items }: ProductsTabProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Belum ada produk dalam faktur ini</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Produk ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="py-3 px-2 text-sm font-medium text-muted-foreground">
                  Produk
                </th>
                <th className="py-3 px-2 text-sm font-medium text-muted-foreground text-right">
                  Harga Satuan
                </th>
                <th className="py-3 px-2 text-sm font-medium text-muted-foreground text-center">
                  Qty
                </th>
                <th className="py-3 px-2 text-sm font-medium text-muted-foreground text-right">
                  Diskon
                </th>
                <th className="py-3 px-2 text-sm font-medium text-muted-foreground text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      {item.product_sku && (
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.product_sku}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-muted text-sm font-medium">
                      {item.quantity}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    {item.discount > 0 ? (
                      <span className="text-destructive">
                        -{formatCurrency(item.discount)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-right font-semibold">
                    {formatCurrency(item.total_price)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2">
                <td colSpan={4} className="py-3 px-2 text-right font-medium">
                  Total:
                </td>
                <td className="py-3 px-2 text-right text-lg font-bold text-primary">
                  {formatCurrency(
                    items.reduce((sum, item) => sum + item.total_price, 0),
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
