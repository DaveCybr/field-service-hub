// ProductList.tsx (create)
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import type { ProductItem, Product } from "@/types/invoice";

interface ProductListProps {
  items: ProductItem[];
  products: Product[];
  onRemove: (id: string) => void;
}

export function ProductList({ items, products, onRemove }: ProductListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Belum ada produk yang ditambahkan
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        return (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <div className="flex-1 space-y-1">
              <p className="font-medium">{product?.name || "Produk"}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {formatCurrency(item.unit_price)} × {item.quantity}
                </span>
                <span>•</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(item.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
