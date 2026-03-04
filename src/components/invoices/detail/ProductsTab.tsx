// ============================================
// FILE: src/components/invoices/detail/ProductsTab.tsx
// FIX: Tampilkan invoice_items DAN service_parts_usage dari teknisi
// ============================================
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Wrench } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { InvoiceItem } from "@/hooks/invoices/useInvoiceDetail";

interface ProductsTabProps {
  items: InvoiceItem[];
}

export function ProductsTab({ items }: ProductsTabProps) {
  const invoiceItems = items.filter((i) => i.source === "invoice_item");
  const partsItems = items.filter((i) => i.source === "parts_usage");

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Belum ada produk atau sparepart dalam faktur ini</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalInvoiceItems = invoiceItems.reduce((s, i) => s + i.total_price, 0);
  const totalPartsItems = partsItems.reduce((s, i) => s + i.total_price, 0);
  const grandTotal = totalInvoiceItems + totalPartsItems;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* ── Produk Invoice (ditambah saat buat invoice) ── */}
      {invoiceItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Produk Invoice
              <Badge variant="secondary">{invoiceItems.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ItemTable items={invoiceItems} />
          </CardContent>
        </Card>
      )}

      {/* ── Sparepart dari Teknisi (service_parts_usage) ── */}
      {partsItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-blue-600" />
              Sparepart dari Teknisi
              <Badge variant="secondary">{partsItems.length}</Badge>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#6b7280",
                  background: "#f3f4f6",
                  padding: "2px 8px",
                  borderRadius: "20px",
                }}
              >
                Ditambahkan saat pengerjaan
              </span>
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
                    <th className="py-3 px-2 text-sm font-medium text-muted-foreground">
                      Layanan
                    </th>
                    <th className="py-3 px-2 text-sm font-medium text-muted-foreground">
                      Teknisi
                    </th>
                    <th className="py-3 px-2 text-sm font-medium text-muted-foreground text-right">
                      Harga Satuan
                    </th>
                    <th className="py-3 px-2 text-sm font-medium text-muted-foreground text-center">
                      Qty
                    </th>
                    <th className="py-3 px-2 text-sm font-medium text-muted-foreground text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {partsItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-3 px-2">
                        <p className="font-medium text-sm">
                          {item.product_name}
                        </p>
                        {item.product_sku && (
                          <p className="text-xs text-muted-foreground">
                            SKU: {item.product_sku}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm text-muted-foreground">
                          {item.service_title || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-2">
                        <p className="text-sm text-muted-foreground">
                          {item.technician_name || "-"}
                        </p>
                      </td>
                      <td className="py-3 px-2 text-right text-sm">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-muted text-sm font-medium">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-semibold text-sm">
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td
                      colSpan={5}
                      className="py-3 px-2 text-right text-sm font-medium text-muted-foreground"
                    >
                      Subtotal Sparepart:
                    </td>
                    <td className="py-3 px-2 text-right font-bold">
                      {formatCurrency(totalPartsItems)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Grand Total ── */}
      {invoiceItems.length > 0 && partsItems.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  color: "#6b7280",
                }}
              >
                <span>Subtotal Produk Invoice</span>
                <span>{formatCurrency(totalInvoiceItems)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "13px",
                  color: "#6b7280",
                }}
              >
                <span>Subtotal Sparepart Teknisi</span>
                <span>{formatCurrency(totalPartsItems)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#111827",
                  paddingTop: "8px",
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <span>Total Produk & Sparepart</span>
                <span style={{ color: "#2563eb" }}>
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Reusable item table for invoice_items ──────────────────────────────────────
function ItemTable({ items }: { items: InvoiceItem[] }) {
  return (
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
            <tr
              key={item.id}
              className="border-b last:border-0 hover:bg-muted/30"
            >
              <td className="py-3 px-2">
                <p className="font-medium text-sm">{item.product_name}</p>
                {item.product_sku && (
                  <p className="text-xs text-muted-foreground">
                    SKU: {item.product_sku}
                  </p>
                )}
              </td>
              <td className="py-3 px-2 text-right text-sm">
                {formatCurrency(item.unit_price)}
              </td>
              <td className="py-3 px-2 text-center">
                <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded-full bg-muted text-sm font-medium">
                  {item.quantity}
                </span>
              </td>
              <td className="py-3 px-2 text-right text-sm">
                {item.discount > 0 ? (
                  <span className="text-destructive">
                    -{formatCurrency(item.discount)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="py-3 px-2 text-right font-semibold text-sm">
                {formatCurrency(item.total_price)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2">
            <td
              colSpan={4}
              className="py-3 px-2 text-right font-medium text-sm"
            >
              Total:
            </td>
            <td className="py-3 px-2 text-right text-base font-bold text-primary">
              {formatCurrency(items.reduce((s, i) => s + i.total_price, 0))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
