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
        No products added yet
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        const subtotal = item.unit_price * item.quantity - item.discount;

        return (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <div className="flex-1">
              <p className="font-medium">
                {product?.name || "Unknown Product"}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.quantity} × {formatCurrency(item.unit_price)}
                {item.discount > 0 &&
                  ` - ${formatCurrency(item.discount)}`} ={" "}
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </p>
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
