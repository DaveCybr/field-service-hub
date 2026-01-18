import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  sell_price: number;
}

interface PartUsed {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  product: {
    name: string;
    sku: string;
  };
}

interface PartsUsedProps {
  serviceId: string;
  disabled?: boolean;
  onPartsChange?: () => void;
}

export function PartsUsed({
  serviceId,
  disabled = false,
  onPartsChange,
}: PartsUsedProps) {
  const { employee } = useAuth();
  const { toast } = useToast();

  const [parts, setParts] = useState<PartUsed[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Add part dialog
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [adding, setAdding] = useState(false);

  // Delete part dialog
  const [deletingPartId, setDeletingPartId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    loadParts();
    loadProducts();
  }, [serviceId]);

  const loadParts = async () => {
    try {
      const { data, error } = await supabase
        .from("service_parts_used")
        .select(
          `
          *,
          product:products(name, sku)
        `
        )
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setParts(data || []);
    } catch (error: any) {
      console.error("Error loading parts:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load parts",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, stock, sell_price")
        .eq("is_active", true)
        .gt("stock", 0)
        .order("name", { ascending: true });

      if (error) throw error;

      setProducts(data || []);
    } catch (error: any) {
      console.error("Error loading products:", error);
    }
  };

  const handleAddPart = async () => {
    if (!selectedProductId || !quantity || parseInt(quantity) <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a product and enter valid quantity",
      });
      return;
    }

    try {
      setAdding(true);

      const selectedProduct = products.find((p) => p.id === selectedProductId);
      if (!selectedProduct) {
        throw new Error("Product not found");
      }

      const qty = parseInt(quantity);

      // Check stock
      if (qty > selectedProduct.stock) {
        toast({
          variant: "destructive",
          title: "Insufficient Stock",
          description: `Only ${selectedProduct.stock} units available`,
        });
        return;
      }

      // Add part
      const { error } = await supabase.from("service_parts_used").insert({
        service_id: serviceId,
        product_id: selectedProductId,
        quantity: qty,
        unit_cost: selectedProduct.sell_price,
        added_by: employee?.id,
      });

      if (error) throw error;

      // Reset form
      setSelectedProductId("");
      setQuantity("1");
      setShowAddDialog(false);

      // Reload data
      await loadParts();
      await loadProducts();

      toast({
        title: "Part Added",
        description: `${qty}x ${selectedProduct.name} added`,
      });

      onPartsChange?.();
    } catch (error: any) {
      console.error("Error adding part:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add part",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePart = async () => {
    if (!deletingPartId) return;

    try {
      const { error } = await supabase
        .from("service_parts_used")
        .delete()
        .eq("id", deletingPartId);

      if (error) throw error;

      // Reload data
      await loadParts();
      await loadProducts();

      setShowDeleteDialog(false);
      setDeletingPartId(null);

      toast({
        title: "Part Removed",
        description: "Part removed from service",
      });

      onPartsChange?.();
    } catch (error: any) {
      console.error("Error deleting part:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove part",
      });
    }
  };

  const totalPartsCost = parts.reduce((sum, part) => sum + part.total_cost, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Part Button */}
      {!disabled && (
        <Button onClick={() => setShowAddDialog(true)} variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Part
        </Button>
      )}

      {/* Parts List */}
      {parts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No parts used yet</p>
          {!disabled && <p className="text-xs">Add parts as you use them</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {parts.map((part) => (
            <div
              key={part.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{part.product.name}</p>
                  <span className="text-xs text-muted-foreground">
                    ({part.product.sku})
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>Qty: {part.quantity}</span>
                  <span>@{formatCurrency(part.unit_cost)}</span>
                  <span className="font-medium text-foreground">
                    = {formatCurrency(part.total_cost)}
                  </span>
                </div>
              </div>

              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setDeletingPartId(part.id);
                    setShowDeleteDialog(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}

          {/* Total */}
          <div className="flex justify-between items-center p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
            <span className="font-semibold">Total Parts Cost</span>
            <span className="text-lg font-bold">
              {formatCurrency(totalPartsCost)}
            </span>
          </div>
        </div>
      )}

      {/* Add Part Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Part</DialogTitle>
            <DialogDescription>
              Select a product and quantity to add to this service
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Select
                value={selectedProductId}
                onValueChange={setSelectedProductId}
                disabled={adding}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No products available
                    </div>
                  ) : (
                    products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku}) - Stock: {product.stock}{" "}
                        - {formatCurrency(product.sell_price)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={adding}
              />
              {selectedProductId && (
                <p className="text-xs text-muted-foreground">
                  Available stock:{" "}
                  {products.find((p) => p.id === selectedProductId)?.stock}{" "}
                  units
                </p>
              )}
            </div>

            {selectedProductId && quantity && parseInt(quantity) > 0 && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium mb-2">Summary:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product:</span>
                    <span>
                      {products.find((p) => p.id === selectedProductId)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Quantity:</span>
                    <span>{quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unit Price:</span>
                    <span>
                      {formatCurrency(
                        products.find((p) => p.id === selectedProductId)
                          ?.sell_price || 0
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Total:</span>
                    <span>
                      {formatCurrency(
                        (products.find((p) => p.id === selectedProductId)
                          ?.sell_price || 0) * parseInt(quantity)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setSelectedProductId("");
                setQuantity("1");
              }}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPart}
              disabled={adding || !selectedProductId}
            >
              {adding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Part"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Part</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this part? The stock will be
              restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletingPartId(null);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePart}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
