import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Phone,
  MapPin,
  RefreshCw,
  Building2,
  User,
  Edit,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EditCustomerModal } from "@/components/customers/EditCustomerModal";
import { DeleteCustomerDialog } from "@/components/customers/DeleteCustomerDialog";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  category: string;
  payment_terms_days: number;
  current_outstanding: number;
  blacklisted: boolean;
  created_at: string;
}

export default function Customers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // CRUD states
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(
    null,
  );

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    category: "retail",
    payment_terms_days: "0",
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchCustomers();
  }, [categoryFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let query = supabase.from("customers").select("*").order("name");

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter as "retail" | "project");
      }

      const { data, error } = await query;

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("messages.loadFailed"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!formData.name || !formData.phone) {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("validation.namePhoneRequired"),
      });
      return;
    }

    setCreating(true);
    try {
      const customerCategory = formData.category as "retail" | "project";
      const { error } = await supabase.from("customers").insert([
        {
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          address: formData.address || null,
          category: customerCategory,
          payment_terms_days: parseInt(formData.payment_terms_days) || 0,
        },
      ]);

      if (error) throw error;

      toast({
        title: t("customers.customerAdded"),
        description: t("customers.customerAddedDesc", { name: formData.name }),
      });

      setDialogOpen(false);
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        category: "retail",
        payment_terms_days: "0",
      });
      fetchCustomers();
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: error.message || t("messages.saveFailed"),
      });
    } finally {
      setCreating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery),
  );

  const handleRowClick = (customerId: string) => {
    navigate(`/customers/${customerId}`);
  };

  const handleEditSuccess = () => {
    setEditingCustomer(null);
    fetchCustomers();
  };

  const handleDeleteSuccess = () => {
    setDeletingCustomer(null);
    fetchCustomers();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("customers.title")}
            </h1>
            <p className="text-muted-foreground">{t("customers.subtitle")}</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("customers.addCustomer")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("customers.newCustomer")}</DialogTitle>
                <DialogDescription>
                  {t("customers.enterDetails")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("common.name")} *</Label>
                  <Input
                    id="name"
                    placeholder={t("customers.customerName")}
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("common.phone")} *</Label>
                  <Input
                    id="phone"
                    placeholder="+62 812 3456 7890"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("common.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">{t("common.address")}</Label>
                  <Textarea
                    id="address"
                    placeholder={t("common.address")}
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">{t("customers.category")}</Label>
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
                        <SelectItem value="retail">
                          {t("customers.retail")}
                        </SelectItem>
                        <SelectItem value="project">
                          {t("customers.project")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.category === "project" && (
                    <div className="space-y-2">
                      <Label htmlFor="terms">
                        {t("customers.paymentTermsDays")}
                      </Label>
                      <Select
                        value={formData.payment_terms_days}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            payment_terms_days: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 {t("time.days")}</SelectItem>
                          <SelectItem value="14">
                            14 {t("time.days")}
                          </SelectItem>
                          <SelectItem value="30">
                            30 {t("time.days")}
                          </SelectItem>
                          <SelectItem value="60">
                            60 {t("time.days")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button onClick={handleCreateCustomer} disabled={creating}>
                  {creating ? t("common.adding") : t("customers.addCustomer")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("customers.searchCustomers")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder={t("customers.category")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="retail">
                    {t("customers.retail")}
                  </SelectItem>
                  <SelectItem value="project">
                    {t("customers.project")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchCustomers}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium">
                  {t("customers.noCustomersFound")}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("customers.addFirstCustomer")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("customers.customerName")}</TableHead>
                      <TableHead>{t("common.contact")}</TableHead>
                      <TableHead>{t("customers.category")}</TableHead>
                      <TableHead>{t("customers.paymentTerms")}</TableHead>
                      <TableHead className="text-right">
                        {t("customers.outstanding")}
                      </TableHead>
                      <TableHead>{t("common.status")}</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow
                        key={customer.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(customer.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`rounded-full p-2 ${
                                customer.category === "project"
                                  ? "bg-purple-100 text-purple-600"
                                  : "bg-blue-100 text-blue-600"
                              }`}
                            >
                              {customer.category === "project" ? (
                                <Building2 className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              {customer.email && (
                                <p className="text-sm text-muted-foreground">
                                  {customer.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {customer.phone}
                            </div>
                            {customer.address && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate max-w-[200px]">
                                  {customer.address}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              customer.category === "project"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {t(`customers.${customer.category}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {customer.category === "project" &&
                          customer.payment_terms_days > 0
                            ? `${customer.payment_terms_days} ${t("time.days")}`
                            : t("common.immediate")}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              customer.current_outstanding > 0
                                ? "text-destructive font-medium"
                                : ""
                            }
                          >
                            {formatCurrency(customer.current_outstanding)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {customer.blacklisted ? (
                            <Badge variant="destructive">
                              {t("customers.blacklisted")}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200"
                            >
                              {t("common.active")}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/customers/${customer.id}`);
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCustomer(customer);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingCustomer(customer);
                              }}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <EditCustomerModal
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        customer={editingCustomer}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Dialog */}
      <DeleteCustomerDialog
        open={!!deletingCustomer}
        onOpenChange={(open) => !open && setDeletingCustomer(null)}
        customer={deletingCustomer}
        onSuccess={handleDeleteSuccess}
      />
    </DashboardLayout>
  );
}
