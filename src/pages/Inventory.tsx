import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StockHistory } from "@/components/inventory/StockHistory";
import { ProductImageUpload } from "@/components/inventory/ProductImageUpload";
import { ExportProducts } from "@/components/inventory/ExportProducts";
import {
  History,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  RefreshCw,
  Package,
  AlertTriangle,
  Minus,
  TrendingDown,
  TrendingUp,
  PackageX,
  Pencil,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
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
import { CurrencyInput } from "@/components/ui/currency-input";

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  cost_price: number;
  sell_price: number;
  stock: number;
  min_stock_threshold: number;
  is_service_item: boolean;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
}

interface StockAlert {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  alert_type: string;
  current_stock: number;
  threshold: number;
  status: string;
  created_at: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
  from: number;
  to: number;
}

type SortField =
  | "sku"
  | "name"
  | "category"
  | "cost_price"
  | "sell_price"
  | "stock"
  | "created_at";
type SortOrder = "asc" | "desc";

interface SortConfig {
  field: SortField;
  order: SortOrder;
}

const CATEGORIES = [
  { value: "spare_parts", label: "Spare Parts" },
  { value: "consumables", label: "Consumables" },
  { value: "equipment", label: "Equipment" },
  { value: "accessories", label: "Accessories" },
  { value: "service_labor", label: "Service/Labor" },
];

const CATEGORY_PREFIXES: Record<string, string> = {
  spare_parts: "SP",
  consumables: "CS",
  equipment: "EQ",
  accessories: "AC",
  service_labor: "SV",
};

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    itemsPerPage: 20,
    from: 0,
    to: 0,
  });

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "created_at",
    order: "desc",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");
  const [adjustmentQty, setAdjustmentQty] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedProductForImage, setSelectedProductForImage] =
    useState<Product | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] =
    useState<Product | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "spare_parts",
    unit: "pcs",
    cost_price: 0,
    sell_price: 0,
    stock: "0",
    min_stock_threshold: "5",
    is_service_item: false,
  });

  const { toast } = useToast();
  const { employee } = useAuth();

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [
    categoryFilter,
    pagination.currentPage,
    pagination.itemsPerPage,
    sortConfig,
    searchQuery,
  ]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Calculate range for pagination
      const from = (pagination.currentPage - 1) * pagination.itemsPerPage;
      const to = from + pagination.itemsPerPage - 1;

      // Build query
      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("is_active", true);

      // Apply category filter
      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter as any);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`,
        );
      }

      // Apply sorting
      query = query.order(sortConfig.field, {
        ascending: sortConfig.order === "asc",
      });

      // Apply pagination
      const { data, error, count } = await query.range(from, to);

      if (error) throw error;

      setProducts(data || []);

      // Update pagination info
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pagination.itemsPerPage);

      setPagination((prev) => ({
        ...prev,
        totalPages,
        totalCount,
        from: totalCount > 0 ? from + 1 : 0,
        to: Math.min(from + pagination.itemsPerPage, totalCount),
      }));
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load products.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("stock_alerts")
        .select(
          `
          *,
          products (name, sku)
        `,
        )
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setAlerts(
        data?.map((alert) => ({
          ...alert,
          product_name: (alert.products as any)?.name || "Unknown",
          product_sku: (alert.products as any)?.sku || "",
        })) || [],
      );
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => ({
      field,
      order: prev.field === field && prev.order === "asc" ? "desc" : "asc",
    }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    }
    return sortConfig.order === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  const handleItemsPerPageChange = (value: string) => {
    setPagination((prev) => ({
      ...prev,
      itemsPerPage: parseInt(value),
      currentPage: 1,
    }));
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  // Sortable table head component
  const SortableTableHead = ({
    field,
    children,
    className = "",
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => {
    return (
      <TableHead className={className}>
        <button
          className="flex items-center hover:text-foreground transition-colors font-medium"
          onClick={() => handleSort(field)}
        >
          {children}
          {getSortIcon(field)}
        </button>
      </TableHead>
    );
  };

  // Pagination component
  const PaginationControls = () => {
    const maxPageButtons = 5;
    const pages: number[] = [];

    let startPage = Math.max(
      1,
      pagination.currentPage - Math.floor(maxPageButtons / 2),
    );
    let endPage = Math.min(
      pagination.totalPages,
      startPage + maxPageButtons - 1,
    );

    if (endPage - startPage < maxPageButtons - 1) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between gap-4 py-4 border-t">
        {/* Left: Items per page & info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4">
            <span className="text-sm text-muted-foreground">Show:</span>
            <Select
              value={pagination.itemsPerPage.toString()}
              onValueChange={handleItemsPerPageChange}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm text-muted-foreground">
            Showing {pagination.from}-{pagination.to} of {pagination.totalCount}{" "}
            products
          </span>
        </div>

        {/* Right: Page controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(1)}
            disabled={pagination.currentPage === 1 || loading}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pages.map((page) => (
            <Button
              key={page}
              variant={page === pagination.currentPage ? "default" : "outline"}
              size="icon"
              onClick={() => handlePageChange(page)}
              disabled={loading}
            >
              {page}
            </Button>
          ))}

          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={
              pagination.currentPage === pagination.totalPages || loading
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(pagination.totalPages)}
            disabled={
              pagination.currentPage === pagination.totalPages || loading
            }
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // ... [Keep ALL existing functions: generateSKU, handleCreateProduct, handleStockAdjustment, etc.]
  // I'll continue with the render section where pagination is added

  const generateSKU = async (category: string) => {
    const prefix = CATEGORY_PREFIXES[category] || "XX";
    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    return `${prefix}-${String((count || 0) + 1).padStart(5, "0")}`;
  };

  const handleCreateProduct = async () => {
    if (!formData.name || !formData.category) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name and category are required.",
      });
      return;
    }

    setCreating(true);
    try {
      const sku = await generateSKU(formData.category);

      const { error } = await supabase.from("products").insert([
        {
          sku,
          name: formData.name,
          description: formData.description || null,
          category: formData.category as any,
          unit: formData.unit,
          cost_price: formData.cost_price,
          sell_price: formData.sell_price,
          stock: parseInt(formData.stock) || 0,
          min_stock_threshold: parseInt(formData.min_stock_threshold) || 5,
          is_service_item: formData.is_service_item,
        },
      ]);

      if (error) throw error;

      toast({
        title: "Product Added",
        description: `${formData.name} (${sku}) has been added successfully.`,
      });

      setDialogOpen(false);
      resetForm();
      fetchProducts();
      fetchAlerts();
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to add product.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedProduct || !adjustmentQty) return;

    const qty = parseInt(adjustmentQty);
    if (isNaN(qty) || qty <= 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please enter a valid quantity.",
      });
      return;
    }

    const adjustedQty = adjustmentType === "add" ? qty : -qty;
    const newStock = selectedProduct.stock + adjustedQty;

    if (newStock < 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Stock cannot go below zero.",
      });
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", selectedProduct.id);

      if (updateError) throw updateError;

      const { error: txError } = await supabase
        .from("inventory_transactions")
        .insert([
          {
            product_id: selectedProduct.id,
            transaction_type: "adjustment",
            quantity: adjustedQty,
            stock_before: selectedProduct.stock,
            stock_after: newStock,
            reference_id: null,
            notes:
              adjustmentNotes ||
              `Stock ${adjustmentType === "add" ? "added" : "removed"}`,
            created_by: employee?.id,
          },
        ]);

      if (txError) throw txError;

      toast({
        title: "Stock Updated",
        description: `${selectedProduct.name} stock adjusted by ${adjustedQty > 0 ? "+" : ""}${adjustedQty}.`,
      });

      setAdjustDialogOpen(false);
      setSelectedProduct(null);
      setAdjustmentQty("");
      setAdjustmentNotes("");
      fetchProducts();
      fetchAlerts();
    } catch (error: any) {
      console.error("Error adjusting stock:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to adjust stock.",
      });
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from("stock_alerts")
        .update({
          status: "acknowledged",
          acknowledged_by: employee?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;

      toast({
        title: "Alert Acknowledged",
        description: "The stock alert has been acknowledged.",
      });

      fetchAlerts();
    } catch (error) {
      console.error("Error acknowledging alert:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) {
      return { label: "Out of Stock", className: "bg-red-100 text-red-800" };
    }
    if (product.stock <= product.min_stock_threshold) {
      return { label: "Low Stock", className: "bg-amber-100 text-amber-800" };
    }
    return { label: "In Stock", className: "bg-emerald-100 text-emerald-800" };
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find((c) => c.value === category)?.label || category;
  };

  const lowStockCount = products.filter(
    (p) => p.stock <= p.min_stock_threshold && p.stock > 0,
  ).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const totalValue = products.reduce(
    (sum, p) => sum + p.stock * p.cost_price,
    0,
  );

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "spare_parts",
      unit: "pcs",
      cost_price: 0,
      sell_price: 0,
      stock: "0",
      min_stock_threshold: "5",
      is_service_item: false,
    });
    setEditingProduct(null);
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || "",
      category: product.category,
      unit: product.unit,
      cost_price: product.cost_price,
      sell_price: product.sell_price,
      stock: product.stock.toString(),
      min_stock_threshold: product.min_stock_threshold.toString(),
      is_service_item: product.is_service_item,
    });
    setDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    if (!formData.name || !formData.category) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name and category are required.",
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({
          name: formData.name,
          description: formData.description || null,
          category: formData.category as any,
          unit: formData.unit,
          cost_price: formData.cost_price,
          sell_price: formData.sell_price,
          stock: parseInt(formData.stock) || 0,
          min_stock_threshold: parseInt(formData.min_stock_threshold) || 5,
          is_service_item: formData.is_service_item,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingProduct.id);

      if (error) throw error;

      toast({
        title: "Product Updated",
        description: `${formData.name} has been updated successfully.`,
      });

      setDialogOpen(false);
      resetForm();
      fetchProducts();
      fetchAlerts();
    } catch (error: any) {
      console.error("Error updating product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update product.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitProduct = async () => {
    if (editingProduct) {
      await handleUpdateProduct();
    } else {
      await handleCreateProduct();
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from("products")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productToDelete.id);

      if (error) throw error;

      toast({
        title: "Product Deleted",
        description: `${productToDelete.name} has been deactivated.`,
      });

      setDeleteDialogOpen(false);
      setProductToDelete(null);
      fetchProducts();
      fetchAlerts();
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete product.",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
            <p className="text-muted-foreground">
              Manage products, stock levels, and alerts
            </p>
          </div>
          <div className="flex gap-2">
            <ExportProducts products={products} />
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              {/* ... DialogContent remains the same as original ... */}
              <DialogContent className="max-w-lg">
                <DialogHeader className="px-4">
                  <DialogTitle>
                    {editingProduct ? "Edit Product" : "Add New Product"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingProduct
                      ? "Update the product details below."
                      : "Enter the product details. SKU will be generated automatically."}
                  </DialogDescription>
                </DialogHeader>
                {/* Form content - keeping same as original */}
                <div className="space-y-4 px-4 py-4 max-h-[60vh] overflow-y-auto">
                  {/* ... all form fields remain the same ... */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Compressor 1 PK"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Product description..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) =>
                          setFormData({ ...formData, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Unit</Label>
                      <Select
                        value={formData.unit}
                        onValueChange={(value) =>
                          setFormData({ ...formData, unit: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pcs">Pieces</SelectItem>
                          <SelectItem value="set">Set</SelectItem>
                          <SelectItem value="meter">Meter</SelectItem>
                          <SelectItem value="liter">Liter</SelectItem>
                          <SelectItem value="kg">Kilogram</SelectItem>
                          <SelectItem value="roll">Roll</SelectItem>
                          <SelectItem value="box">Box</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cost_price">Cost Price (Rp)</Label>
                      <CurrencyInput
                        value={formData.cost_price}
                        onValueChange={(value) =>
                          setFormData({ ...formData, cost_price: value })
                        }
                        placeholder="Rp 0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sell_price">Sell Price (Rp)</Label>
                      <CurrencyInput
                        value={formData.sell_price}
                        onValueChange={(value) =>
                          setFormData({ ...formData, sell_price: value })
                        }
                        placeholder="Rp 0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stock">Initial Stock</Label>
                      <Input
                        id="stock"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={formData.stock}
                        onChange={(e) =>
                          setFormData({ ...formData, stock: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_stock">Min. Stock Alert</Label>
                      <Input
                        id="min_stock"
                        type="number"
                        min="0"
                        placeholder="5"
                        value={formData.min_stock_threshold}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            min_stock_threshold: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitProduct} disabled={creating}>
                    {creating
                      ? editingProduct
                        ? "Updating..."
                        : "Adding..."
                      : editingProduct
                        ? "Update Product"
                        : "Add Product"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards - keeping same as original */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Products
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {pagination.totalCount}
                  </p>
                </div>
                <div className="rounded-lg p-3 bg-primary/10">
                  <Package className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Low Stock
                  </p>
                  <p className="text-3xl font-bold mt-1">{lowStockCount}</p>
                </div>
                <div className="rounded-lg p-3 bg-amber-100">
                  <TrendingDown className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Out of Stock
                  </p>
                  <p className="text-3xl font-bold mt-1">{outOfStockCount}</p>
                </div>
                <div className="rounded-lg p-3 bg-red-100">
                  <PackageX className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Value
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(totalValue)}
                  </p>
                </div>
                <div className="rounded-lg p-3 bg-emerald-100">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="alerts" className="relative">
              Stock Alerts
              {alerts.length > 0 && (
                <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                  {alerts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or SKU..."
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={categoryFilter}
                    onValueChange={handleCategoryFilterChange}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={fetchProducts}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Products Table WITH PAGINATION & SORTING */}
            <Card className="mt-4">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">
                      {searchQuery || categoryFilter !== "all"
                        ? "No products found"
                        : "No products yet"}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {searchQuery || categoryFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Add your first product to start managing inventory."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Image</TableHead>
                          <SortableTableHead field="sku">SKU</SortableTableHead>
                          <SortableTableHead field="name">
                            Product
                          </SortableTableHead>
                          <SortableTableHead field="category">
                            Category
                          </SortableTableHead>
                          <SortableTableHead
                            field="cost_price"
                            className="text-right"
                          >
                            Cost
                          </SortableTableHead>
                          <SortableTableHead
                            field="sell_price"
                            className="text-right"
                          >
                            Sell
                          </SortableTableHead>
                          <SortableTableHead
                            field="stock"
                            className="text-center"
                          >
                            Stock
                          </SortableTableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => {
                          const stockStatus = getStockStatus(product);
                          return (
                            <TableRow
                              key={product.id}
                              className="table-row-hover"
                            >
                              <TableCell>
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {product.sku}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  {product.description && (
                                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                      {product.description}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">
                                  {getCategoryLabel(product.category)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(product.cost_price)}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(product.sell_price)}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium">
                                  {product.stock}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                  {" "}
                                  {product.unit}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge className={stockStatus.className}>
                                  {stockStatus.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>
                                      Actions
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedProductForHistory(product);
                                        setHistoryDialogOpen(true);
                                      }}
                                    >
                                      <History className="h-4 w-4 mr-2" />
                                      View History
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedProductForImage(product);
                                        setImageDialogOpen(true);
                                      }}
                                    >
                                      <ImageIcon className="h-4 w-4 mr-2" />
                                      Upload Image
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleEditClick(product)}
                                    >
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit Product
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedProduct(product);
                                        setAdjustDialogOpen(true);
                                      }}
                                    >
                                      <ArrowUpDown className="h-4 w-4 mr-2" />
                                      Adjust Stock
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setProductToDelete(product);
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Product
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    {/* Pagination Controls */}
                    {!loading && products.length > 0 && <PaginationControls />}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock Alerts Tab - keeping same as original */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Active Stock Alerts
                </CardTitle>
                <CardDescription>
                  Products that need attention due to low or zero stock levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-emerald-500" />
                    <h3 className="mt-4 text-lg font-medium">
                      All stock levels are healthy
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      No products are currently below their minimum stock
                      threshold.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          alert.alert_type === "out_of_stock"
                            ? "border-red-200 bg-red-50"
                            : "border-amber-200 bg-amber-50"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`rounded-full p-2 ${
                              alert.alert_type === "out_of_stock"
                                ? "bg-red-100"
                                : "bg-amber-100"
                            }`}
                          >
                            {alert.alert_type === "out_of_stock" ? (
                              <PackageX className="h-5 w-5 text-red-600" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{alert.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {alert.product_sku} • Current:{" "}
                              {alert.current_stock} • Min: {alert.threshold}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(
                                new Date(alert.created_at),
                                "MMM d, yyyy h:mm a",
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* All Dialogs - keeping same as original */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Stock</DialogTitle>
              <DialogDescription>
                {selectedProduct && (
                  <>
                    Adjusting stock for <strong>{selectedProduct.name}</strong>.
                    Current stock:{" "}
                    <strong>
                      {selectedProduct.stock} {selectedProduct.unit}
                    </strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Button
                  variant={adjustmentType === "add" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setAdjustmentType("add")}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Stock
                </Button>
                <Button
                  variant={adjustmentType === "remove" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setAdjustmentType("remove")}
                >
                  <Minus className="mr-2 h-4 w-4" />
                  Remove Stock
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Reason for adjustment..."
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  rows={2}
                />
              </div>
              {selectedProduct && adjustmentQty && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    New stock level:{" "}
                    <strong>
                      {selectedProduct.stock +
                        (adjustmentType === "add"
                          ? parseInt(adjustmentQty) || 0
                          : -(parseInt(adjustmentQty) || 0))}
                    </strong>{" "}
                    {selectedProduct.unit}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAdjustDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleStockAdjustment}>
                Confirm Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong>{productToDelete?.name}</strong>? This will deactivate
                the product. You can reactivate it later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProductToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProduct}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete Product
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <StockHistory
          productId={selectedProductForHistory?.id || null}
          productName={selectedProductForHistory?.name || ""}
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
        />

        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Product Image</DialogTitle>
              <DialogDescription>
                Upload or change image for{" "}
                <strong>{selectedProductForImage?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            {selectedProductForImage && (
              <ProductImageUpload
                productId={selectedProductForImage.id}
                productName={selectedProductForImage.name}
                currentImageUrl={selectedProductForImage.image_url}
                onImageUpdate={(imageUrl) => {
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.id === selectedProductForImage.id
                        ? { ...p, image_url: imageUrl }
                        : p,
                    ),
                  );
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
