import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ProductItem, Product } from "@/types/invoice";

export function useInvoiceProducts(products: Product[]) {
  const { toast } = useToast();
  const [items, setItems] = useState<ProductItem[]>([]);

  const addProduct = useCallback(
    (productId: string, quantity: number) => {
      const product = products.find((p) => p.id === productId);

      if (!product) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Product not found",
        });
        return;
      }

      if (quantity < 1) {
        toast({
          variant: "destructive",
          title: "Invalid Quantity",
          description: "Quantity must be at least 1",
        });
        return;
      }

      if (quantity > product.stock) {
        toast({
          variant: "destructive",
          title: "Insufficient Stock",
          description: `Only ${product.stock} items available`,
        });
        return;
      }

      // Check if product already exists
      const existingItem = items.find((item) => item.product_id === productId);
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        if (newQuantity > product.stock) {
          toast({
            variant: "destructive",
            title: "Insufficient Stock",
            description: `Cannot add more. Only ${product.stock} items available`,
          });
          return;
        }

        setItems((prev) =>
          prev.map((item) =>
            item.product_id === productId
              ? { ...item, quantity: newQuantity }
              : item
          )
        );

        toast({
          title: "Product Updated",
          description: `Quantity updated to ${newQuantity}`,
        });
        return;
      }

      const newItem: ProductItem = {
        id: Date.now().toString(),
        product_id: productId,
        quantity,
        unit_price: product.sell_price,
        discount: 0,
      };

      setItems((prev) => [...prev, newItem]);

      toast({
        title: "Product Added",
        description: `${product.name} added to invoice`,
      });
    },
    [products, items, toast]
  );

  const removeProduct = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateProductQuantity = useCallback(
    (id: string, quantity: number) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const product = products.find((p) => p.id === item.product_id);
      if (!product) return;

      if (quantity < 1) {
        toast({
          variant: "destructive",
          title: "Invalid Quantity",
          description: "Quantity must be at least 1",
        });
        return;
      }

      if (quantity > product.stock) {
        toast({
          variant: "destructive",
          title: "Insufficient Stock",
          description: `Only ${product.stock} items available`,
        });
        return;
      }

      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity } : item))
      );
    },
    [items, products, toast]
  );

  const updateProductDiscount = useCallback((id: string, discount: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, discount } : item))
    );
  }, []);

  const calculateTotal = useCallback(() => {
    return items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity - item.discount,
      0
    );
  }, [items]);

  const clearProducts = useCallback(() => {
    setItems([]);
  }, []);

  return {
    items,
    addProduct,
    removeProduct,
    updateProductQuantity,
    updateProductDiscount,
    calculateTotal,
    clearProducts,
  };
}
