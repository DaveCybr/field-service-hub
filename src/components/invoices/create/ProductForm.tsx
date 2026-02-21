// ProductForm.tsx (create)
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
        title: "Pilih Produk",
        description: "Silakan pilih produk terlebih dahulu",
      });
      return;
    }

    const qty = parseInt(quantity) || 1;
    if (qty < 1) {
      toast({
        variant: "destructive",
        title: "Jumlah Tidak Valid",
        description: "Jumlah minimal adalah 1",
      });
      return;
    }
    if (selectedProduct && qty > selectedProduct.stock) {
      toast({
        variant: "destructive",
        title: "Stok Tidak Cukup",
        description: `Stok tersedia hanya ${selectedProduct.stock} item`,
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
        <div className="space-y-2">
          <Label>
            Produk <span className="text-destructive">*</span>
          </Label>
          <Select
            value={selectedProductId}
            onValueChange={setSelectedProductId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih produk" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{product.name}</span>
                    <span className="ml-2 text-xs">
                      {formatCurrency(product.sell_price)} • Stok:{" "}
                      {product.stock}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Jumlah</Label>
          <Input
            type="number"
            min="1"
            max={selectedProduct?.stock || 999}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          {selectedProduct && (
            <p className="text-xs text-muted-foreground">
              Stok tersedia: {selectedProduct.stock} item
            </p>
          )}
        </div>

        {selectedProduct && (
          <div className="p-3 rounded-lg bg-background space-y-1">
            <div className="flex justify-between text-sm">
              <span>Harga Satuan:</span>
              <span className="font-medium">
                {formatCurrency(selectedProduct.sell_price)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Jumlah:</span>
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

      <div className="flex gap-2">
        <Button type="button" onClick={handleSubmit} className="flex-1">
          Tambah Produk
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
