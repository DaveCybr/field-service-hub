import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProductForm } from "./ProductForm";
import { ProductList } from "./ProductList";
import type { ProductItem, Product } from "@/types/invoice";

interface ProductsSectionProps {
  items: ProductItem[];
  products: Product[];
  onAddProduct: (productId: string, quantity: number) => void;
  onRemoveProduct: (id: string) => void;
}

export function ProductsSection({
  items,
  products,
  onAddProduct,
  onRemoveProduct,
}: ProductsSectionProps) {
  const [showForm, setShowForm] = useState(false);

  const handleAddProduct = (productId: string, quantity: number) => {
    onAddProduct(productId, quantity);
    setShowForm(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Products</CardTitle>
          <CardDescription>Add products to this invoice</CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant={showForm ? "secondary" : "default"}
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Product
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <ProductForm
            products={products}
            onSubmit={handleAddProduct}
            onCancel={() => setShowForm(false)}
          />
        )}

        <ProductList
          items={items}
          products={products}
          onRemove={onRemoveProduct}
        />
      </CardContent>
    </Card>
  );
}
