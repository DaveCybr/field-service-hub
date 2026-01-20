import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils/currency";
import type { Product } from "@/types/invoice";

interface ProductFormProps {
  products: Product[];
  onSubmit: (productId: string, quantity: number) => void;
  onCancel: () => void;
}

export function ProductForm({
  products,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const { toast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmit = () => {
    if (!selectedProductId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a product",
      });
      return;
    }

    const qty = parseInt(quantity) || 1;
    if (qty < 1) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Quantity must be at least 1",
      });
      return;
    }

    if (selectedProduct && qty > selectedProduct.stock) {
      toast({
        variant: "destructive",
        title: "Insufficient Stock",
        description: `Only ${selectedProduct.stock} items available in stock`,
      });
      return;
    }

    onSubmit(selectedProductId, qty);
    setSelectedProductId("");
    setQuantity("1");
  };

  return (
    <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
      <div className="space-y-4">
        {/* Product Selection */}
        <div className="space-y-2">
          <Label>Product *</Label>
          <Select
            value={selectedProductId}
            onValueChange={setSelectedProductId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{product.name}</span>
                    <span className="ml-2 text-xs ">
                      {formatCurrency(product.sell_price)} • Stock:{" "}
                      {product.stock}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity Input */}
        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input
            type="number"
            min="1"
            max={selectedProduct?.stock || 999}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          {selectedProduct && (
            <p className="text-xs text-muted-foreground">
              Available stock: {selectedProduct.stock} items
            </p>
          )}
        </div>

        {/* Price Preview */}
        {selectedProduct && (
          <div className="p-3 rounded-lg bg-background space-y-1">
            <div className="flex justify-between text-sm">
              <span>Unit Price:</span>
              <span className="font-medium">
                {formatCurrency(selectedProduct.sell_price)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Quantity:</span>
              <span className="font-medium">{quantity}</span>
            </div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between font-medium">
              <span>Subtotal:</span>
              <span className="text-primary">
                {formatCurrency(
                  selectedProduct.sell_price * (parseInt(quantity) || 0),
                )}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button type="button" onClick={handleSubmit} className="flex-1">
          Add Product
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
