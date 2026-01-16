import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Plus, X, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { LocationPicker } from "@/components/jobs/LocationPicker";

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
}

interface Unit {
  id: string;
  qr_code: string;
  unit_type: string;
  brand: string | null;
  model: string | null;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  cost_price: number;
  sell_price: number;
  stock: number;
}

interface Technician {
  id: string;
  name: string;
  status: string;
}

interface ServiceItem {
  id: string;
  title: string;
  description?: string;
  unit_id?: string;
  technician_id?: string;
  scheduled_date?: string;
  service_address?: string;
  service_latitude?: number;
  service_longitude?: number;
  estimated_duration?: number;
  service_cost: number;
  priority: string;
}

interface ProductItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  discount: number;
}

export default function NewInvoice() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { log: auditLog } = useAuditLog();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");

  // Services
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [currentService, setCurrentService] = useState<Partial<ServiceItem>>({
    title: "",
    service_cost: 0,
    priority: "normal",
  });

  // Products
  const [items, setItems] = useState<ProductItem[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [productQuantity, setProductQuantity] = useState("1");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchUnits(customerId);
    } else {
      setUnits([]);
    }
  }, [customerId, customers]);

  const fetchData = async () => {
    try {
      const [customersData, productsData, techniciansData] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name, phone, address")
          .eq("blacklisted", false),
        supabase.from("products").select("*").eq("is_active", true),
        supabase
          .from("employees")
          .select("id, name, status")
          .eq("role", "technician"),
      ]);

      if (customersData.data) setCustomers(customersData.data);
      if (productsData.data) setProducts(productsData.data);
      if (techniciansData.data) setTechnicians(techniciansData.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load data",
      });
    }
  };

  const fetchUnits = async (custId: string) => {
    const { data } = await supabase
      .from("units")
      .select("id, qr_code, unit_type, brand, model")
      .eq("customer_id", custId);
    if (data) setUnits(data);
  };

  const handleAddService = () => {
    if (!currentService.title) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Service title is required",
      });
      return;
    }

    const newService: ServiceItem = {
      id: Date.now().toString(),
      title: currentService.title || "",
      description: currentService.description,
      unit_id: currentService.unit_id,
      technician_id: currentService.technician_id,
      scheduled_date: currentService.scheduled_date,
      service_address: currentService.service_address,
      service_latitude: currentService.service_latitude,
      service_longitude: currentService.service_longitude,
      estimated_duration: currentService.estimated_duration || 60,
      service_cost: currentService.service_cost || 0,
      priority: currentService.priority || "normal",
    };

    setServices([...services, newService]);
    setCurrentService({ title: "", service_cost: 0, priority: "normal" });
    setShowServiceForm(false);
    toast({
      title: "Service Added",
      description: `"${newService.title}" added to invoice`,
    });
  };

  const handleRemoveService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const handleAddProduct = () => {
    if (!selectedProduct) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a product",
      });
      return;
    }

    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;

    const qty = parseInt(productQuantity) || 1;
    if (qty > product.stock) {
      toast({
        variant: "destructive",
        title: "Insufficient Stock",
        description: `Only ${product.stock} available`,
      });
      return;
    }

    const newItem: ProductItem = {
      id: Date.now().toString(),
      product_id: selectedProduct,
      quantity: qty,
      unit_price: product.sell_price,
      discount: 0,
    };

    setItems([...items, newItem]);
    setSelectedProduct("");
    setProductQuantity("1");
    setShowProductForm(false);
  };

  const handleRemoveProduct = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const calculateServiceTotal = () =>
    services.reduce((sum, s) => sum + (s.service_cost || 0), 0);

  const calculateItemsTotal = () =>
    items.reduce((sum, i) => sum + i.unit_price * i.quantity - i.discount, 0);

  const subtotal = calculateServiceTotal() + calculateItemsTotal();
  const discountAmount = parseFloat(discount) || 0;
  const taxAmount = parseFloat(tax) || 0;
  const grandTotal = subtotal - discountAmount + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a customer",
      });
      return;
    }

    if (services.length === 0 && items.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invoice must have at least one service or product",
      });
      return;
    }

    setLoading(true);

    try {
      // Create invoice
      const invoiceNumber = `INV-${Date.now()}`;
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert([
          {
            customer_id: customerId,
            invoice_number: invoiceNumber,
            status: "draft",
            payment_status: "unpaid",
            discount: discountAmount,
            tax: taxAmount,
            notes: invoiceNotes,
            created_by: employee?.id,
          },
        ])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Add services
      for (const service of services) {
        await supabase.from("invoice_services").insert([
          {
            invoice_id: invoice.id,
            title: service.title,
            description: service.description,
            unit_id: service.unit_id || null,
            assigned_technician_id: service.technician_id || null,
            scheduled_date: service.scheduled_date || null,
            service_address: service.service_address || null,
            service_latitude: service.service_latitude || null,
            service_longitude: service.service_longitude || null,
            estimated_duration_minutes: service.estimated_duration || 60,
            service_cost: service.service_cost || 0,
            priority: service.priority || "normal",
            status: "pending",
          },
        ]);
      }

      // Add products
      for (const item of items) {
        const product = products.find((p) => p.id === item.product_id);
        await supabase.from("invoice_items").insert([
          {
            invoice_id: invoice.id,
            product_id: item.product_id,
            product_name: product?.name,
            product_sku: product?.sku,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount: item.discount,
            total_price: item.unit_price * item.quantity - item.discount,
          },
        ]);
      }

      // Audit log
      await auditLog({
        action: "create",
        entityType: "invoice",
        entityId: invoice.id,
        newData: {
          invoice_number: invoice.invoice_number,
          customer_id: invoice.customer_id,
          services_count: services.length,
          items_count: items.length,
          grand_total: grandTotal,
        },
      });

      toast({
        title: "Invoice Created",
        description: `Invoice ${invoice.invoice_number} created successfully`,
      });

      navigate(`/invoices/${invoice.id}`);
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create invoice",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/invoices">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Create New Invoice
            </h1>
            <p className="text-muted-foreground">
              Add services and products to create a new invoice transaction
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Customer Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Select Customer *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({c.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Settings */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Invoice Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount (Rp)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      step="10000"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax">Tax (Rp)</Label>
                    <Input
                      id="tax"
                      type="number"
                      min="0"
                      step="10000"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional invoice notes..."
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Services Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Services</CardTitle>
                <CardDescription>
                  Add repair or maintenance services
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant={showServiceForm ? "secondary" : "default"}
                onClick={() => setShowServiceForm(!showServiceForm)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Service
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showServiceForm && (
                <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Service Title *</Label>
                      <Input
                        placeholder="e.g., AC Repair"
                        value={currentService.title || ""}
                        onChange={(e) =>
                          setCurrentService({
                            ...currentService,
                            title: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        placeholder="Service details..."
                        value={currentService.description || ""}
                        onChange={(e) =>
                          setCurrentService({
                            ...currentService,
                            description: e.target.value,
                          })
                        }
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit (Optional)</Label>
                      <Select
                        value={currentService.unit_id || ""}
                        onValueChange={(id) =>
                          setCurrentService({ ...currentService, unit_id: id })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.unit_type} - {u.brand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Technician</Label>
                      <Select
                        value={currentService.technician_id || ""}
                        onValueChange={(id) =>
                          setCurrentService({
                            ...currentService,
                            technician_id: id,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select technician" />
                        </SelectTrigger>
                        <SelectContent>
                          {technicians.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Service Cost (Rp)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="10000"
                        value={currentService.service_cost || 0}
                        onChange={(e) =>
                          setCurrentService({
                            ...currentService,
                            service_cost: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select
                        value={currentService.priority || "normal"}
                        onValueChange={(p) =>
                          setCurrentService({ ...currentService, priority: p })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Scheduled Date</Label>
                      <Input
                        type="date"
                        value={currentService.scheduled_date || ""}
                        onChange={(e) =>
                          setCurrentService({
                            ...currentService,
                            scheduled_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddService}
                    className="w-full"
                  >
                    Add Service
                  </Button>
                </div>
              )}

              {services.length > 0 && (
                <div className="space-y-2">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{service.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {service.technician_id ? "Assigned" : "Unassigned"} •{" "}
                          Rp{" "}
                          {(service.service_cost || 0).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveService(service.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {services.length === 0 && !showServiceForm && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No services added yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Products Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Products</CardTitle>
                <CardDescription>Add products to this invoice</CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant={showProductForm ? "secondary" : "default"}
                onClick={() => setShowProductForm(!showProductForm)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Product
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {showProductForm && (
                <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select
                      value={selectedProduct}
                      onValueChange={setSelectedProduct}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} - Rp {p.sell_price.toLocaleString("id-ID")}{" "}
                            (Stock: {p.stock})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={productQuantity}
                      onChange={(e) => setProductQuantity(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddProduct}
                    className="w-full"
                  >
                    Add Product
                  </Button>
                </div>
              )}

              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((item) => {
                    const product = products.find(
                      (p) => p.id === item.product_id
                    );
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{product?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × Rp{" "}
                            {item.unit_price.toLocaleString("id-ID")} = Rp{" "}
                            {(
                              item.unit_price * item.quantity -
                              item.discount
                            ).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveProduct(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {items.length === 0 && !showProductForm && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No products added yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Total Summary */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Services:</span>
                <span>
                  Rp {calculateServiceTotal().toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Products:</span>
                <span>Rp {calculateItemsTotal().toLocaleString("id-ID")}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>Rp {subtotal.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Discount:</span>
                <span>-Rp {discountAmount.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>Rp {taxAmount.toLocaleString("id-ID")}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-lg">
                <span>Grand Total:</span>
                <span className="text-primary">
                  Rp {grandTotal.toLocaleString("id-ID")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/invoices">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading || !customerId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Invoice"
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
