import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  RefreshCw,
  Package,
  AlertTriangle,
  ArrowUpDown,
  Minus,
  TrendingDown,
  TrendingUp,
  PackageX,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

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

const CATEGORIES = [
  { value: 'spare_parts', label: 'Spare Parts' },
  { value: 'consumables', label: 'Consumables' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'service_labor', label: 'Service/Labor' },
];

const CATEGORY_PREFIXES: Record<string, string> = {
  spare_parts: 'SP',
  consumables: 'CS',
  equipment: 'EQ',
  accessories: 'AC',
  service_labor: 'SV',
};

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'spare_parts',
    unit: 'pcs',
    cost_price: '',
    sell_price: '',
    stock: '0',
    min_stock_threshold: '5',
    is_service_item: false,
  });

  const { toast } = useToast();
  const { employee } = useAuth();

  useEffect(() => {
    fetchProducts();
    fetchAlerts();
  }, [categoryFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load products.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_alerts')
        .select(`
          *,
          products (name, sku)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAlerts(data?.map(alert => ({
        ...alert,
        product_name: (alert.products as any)?.name || 'Unknown',
        product_sku: (alert.products as any)?.sku || '',
      })) || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const generateSKU = async (category: string) => {
    const prefix = CATEGORY_PREFIXES[category] || 'XX';
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    return `${prefix}-${String((count || 0) + 1).padStart(5, '0')}`;
  };

  const handleCreateProduct = async () => {
    if (!formData.name || !formData.category) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Name and category are required.',
      });
      return;
    }

    setCreating(true);
    try {
      const sku = await generateSKU(formData.category);

      const { error } = await supabase
        .from('products')
        .insert([{
          sku,
          name: formData.name,
          description: formData.description || null,
          category: formData.category as any,
          unit: formData.unit,
          cost_price: parseFloat(formData.cost_price) || 0,
          sell_price: parseFloat(formData.sell_price) || 0,
          stock: parseInt(formData.stock) || 0,
          min_stock_threshold: parseInt(formData.min_stock_threshold) || 5,
          is_service_item: formData.is_service_item,
        }]);

      if (error) throw error;

      toast({
        title: 'Product Added',
        description: `${formData.name} (${sku}) has been added successfully.`,
      });

      setDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        category: 'spare_parts',
        unit: 'pcs',
        cost_price: '',
        sell_price: '',
        stock: '0',
        min_stock_threshold: '5',
        is_service_item: false,
      });
      fetchProducts();
      fetchAlerts();
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add product.',
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
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter a valid quantity.',
      });
      return;
    }

    const adjustedQty = adjustmentType === 'add' ? qty : -qty;
    const newStock = selectedProduct.stock + adjustedQty;

    if (newStock < 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Stock cannot go below zero.',
      });
      return;
    }

    try {
      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', selectedProduct.id);

      if (updateError) throw updateError;

      // Record transaction
      const { error: txError } = await supabase
        .from('inventory_transactions')
        .insert([{
          product_id: selectedProduct.id,
          transaction_type: 'adjustment',
          quantity: adjustedQty,
          stock_before: selectedProduct.stock,
          stock_after: newStock,
          notes: adjustmentNotes || `Stock ${adjustmentType === 'add' ? 'added' : 'removed'}`,
          created_by: employee?.id,
        }]);

      if (txError) throw txError;

      toast({
        title: 'Stock Updated',
        description: `${selectedProduct.name} stock adjusted by ${adjustedQty > 0 ? '+' : ''}${adjustedQty}.`,
      });

      setAdjustDialogOpen(false);
      setSelectedProduct(null);
      setAdjustmentQty('');
      setAdjustmentNotes('');
      fetchProducts();
      fetchAlerts();
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to adjust stock.',
      });
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('stock_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_by: employee?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: 'Alert Acknowledged',
        description: 'The stock alert has been acknowledged.',
      });

      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) {
      return { label: 'Out of Stock', className: 'bg-red-100 text-red-800' };
    }
    if (product.stock <= product.min_stock_threshold) {
      return { label: 'Low Stock', className: 'bg-amber-100 text-amber-800' };
    }
    return { label: 'In Stock', className: 'bg-emerald-100 text-emerald-800' };
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = products.filter(p => p.stock <= p.min_stock_threshold && p.stock > 0).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock * p.cost_price), 0);

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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Enter the product details. SKU will be generated automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Compressor 1 PK"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Product description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
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
                      onValueChange={(value) => setFormData({ ...formData, unit: value })}
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
                    <Input
                      id="cost_price"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sell_price">Sell Price (Rp)</Label>
                    <Input
                      id="sell_price"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.sell_price}
                      onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, min_stock_threshold: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProduct} disabled={creating}>
                  {creating ? 'Adding...' : 'Add Product'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="stats-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                  <p className="text-3xl font-bold mt-1">{products.length}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(totalValue)}</p>
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
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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

            {/* Products Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-medium">No products found</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Add your first product to start managing inventory.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">Sell</TableHead>
                          <TableHead className="text-center">Stock</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => {
                          const stockStatus = getStockStatus(product);
                          return (
                            <TableRow key={product.id} className="table-row-hover">
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
                                <span className="font-medium">{product.stock}</span>
                                <span className="text-muted-foreground text-sm"> {product.unit}</span>
                              </TableCell>
                              <TableCell>
                                <Badge className={stockStatus.className}>
                                  {stockStatus.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setAdjustDialogOpen(true);
                                  }}
                                >
                                  <ArrowUpDown className="h-4 w-4 mr-1" />
                                  Adjust
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

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
                    <h3 className="mt-4 text-lg font-medium">All stock levels are healthy</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      No products are currently below their minimum stock threshold.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          alert.alert_type === 'out_of_stock'
                            ? 'border-red-200 bg-red-50'
                            : 'border-amber-200 bg-amber-50'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`rounded-full p-2 ${
                            alert.alert_type === 'out_of_stock'
                              ? 'bg-red-100'
                              : 'bg-amber-100'
                          }`}>
                            {alert.alert_type === 'out_of_stock' ? (
                              <PackageX className="h-5 w-5 text-red-600" />
                            ) : (
                              <TrendingDown className="h-5 w-5 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{alert.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {alert.product_sku} • Current: {alert.current_stock} • Min: {alert.threshold}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(alert.created_at), 'MMM d, yyyy h:mm a')}
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

        {/* Stock Adjustment Dialog */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Stock</DialogTitle>
              <DialogDescription>
                {selectedProduct && (
                  <>
                    Adjusting stock for <strong>{selectedProduct.name}</strong>.
                    Current stock: <strong>{selectedProduct.stock} {selectedProduct.unit}</strong>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Button
                  variant={adjustmentType === 'add' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setAdjustmentType('add')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Stock
                </Button>
                <Button
                  variant={adjustmentType === 'remove' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setAdjustmentType('remove')}
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
                    New stock level:{' '}
                    <strong>
                      {selectedProduct.stock + (adjustmentType === 'add' ? parseInt(adjustmentQty) || 0 : -(parseInt(adjustmentQty) || 0))}
                    </strong>{' '}
                    {selectedProduct.unit}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStockAdjustment}>
                Confirm Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
