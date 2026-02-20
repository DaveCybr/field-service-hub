// Customers.tsx - Customer Management with SERVER-SIDE Pagination
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  RefreshCw,
  Users,
  Building2,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableServer } from "@/components/ui/data-table";
import {
  createCustomerColumns,
  Customer,
  CustomerColumnActions,
} from "@/components/customers/columns";
import { useServerPagination } from "@/hooks/useServerPagination";

export default function Customers() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchValue, setSearchValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    category: "retail" as "retail" | "project",
    payment_terms_days: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  // ✅ Server-side pagination with filters
  const {
    data: customers,
    loading,
    pageCount,
    totalRows,
    pagination,
    setPagination,
    refetch,
  } = useServerPagination<Customer>({
    table: "customers",
    select: "*",
    orderBy: { column: "updated_at", ascending: false },
    filters:
      categoryFilter !== "all" ? { category: categoryFilter } : undefined,
    searchColumn: "name",
    searchValue: searchValue,
    initialPageSize: 10,
  });

  // Fetch stats (separate from pagination)
  const [stats, setStats] = useState({
    total: 0,
    individual: 0,
    company: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Total customers
    const { count: totalCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });

    // Individual customers
    const { count: individualCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("category", "retail");

    // Company customers
    const { count: companyCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("category", "project");

    // Total revenue (sum of current_outstanding)
    const { data: revenueData } = await supabase
      .from("customers")
      .select("current_outstanding");

    const totalRevenue =
      revenueData?.reduce((sum, c) => sum + (c.current_outstanding || 0), 0) ||
      0;

    setStats({
      total: totalCount || 0,
      individual: individualCount || 0,
      company: companyCount || 0,
      totalRevenue,
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      category: "retail",
      payment_terms_days: 0,
    });
    setSelectedCustomer(null);
  };

  const handleCreateCustomer = async () => {
    if (!formData.name || !formData.phone) {
      toast({
        variant: "destructive",
        title: "Validasi Error",
        description: "Nama dan nomor telepon wajib diisi.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("customers").insert([
        {
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone,
          address: formData.address || null,
          category: formData.category,
          payment_terms_days: formData.payment_terms_days,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      toast({
        title: "Pelanggan Ditambahkan",
        description: `${formData.name} berhasil ditambahkan.`,
      });

      setDialogOpen(false);
      resetForm();
      refetch();
      fetchStats();
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Gagal menambahkan pelanggan.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;

    if (!formData.name || !formData.phone) {
      toast({
        variant: "destructive",
        title: "Validasi Error",
        description: "Nama dan nomor telepon wajib diisi.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone,
          address: formData.address || null,
          category: formData.category,
          payment_terms_days: formData.payment_terms_days,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedCustomer.id);

      if (error) throw error;

      toast({
        title: "Pelanggan Diperbarui",
        description: `${formData.name} berhasil diperbarui.`,
      });

      setDialogOpen(false);
      resetForm();
      refetch();
      fetchStats();
    } catch (error: any) {
      console.error("Error updating customer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Gagal memperbarui pelanggan.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", selectedCustomer.id);

      if (error) throw error;

      toast({
        title: "Pelanggan Dihapus",
        description: `${selectedCustomer.name} telah dihapus.`,
      });

      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
      refetch();
      fetchStats();
    } catch (error: any) {
      console.error("Error deleting customer:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Gagal menghapus pelanggan.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowClick = (customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  };

  const handleSelectionChange = (selectedRows: Customer[]) => {
    setSelectedCustomers(selectedRows);
  };

  // Column action handlers
  const columnActions: CustomerColumnActions = {
    onViewDetails: (customer) => {
      navigate(`/customers/${customer.id}`);
    },
    onEdit: (customer) => {
      setSelectedCustomer(customer);
      setFormData({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        category: customer.category || "retail",
        payment_terms_days: customer.payment_terms_days || 0,
      });
      setDialogOpen(true);
    },
    onViewServices: (customer) => {
      navigate(`/services?customer=${customer.id}`);
    },
    onDelete: (customer) => {
      setSelectedCustomer(customer);
      setDeleteDialogOpen(true);
    },
  };

  const columns = createCustomerColumns(columnActions);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pelanggan</h1>
            <p className="text-muted-foreground">
              Kelola database pelanggan dan riwayat servis
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Pelanggan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedCustomer ? "Edit Pelanggan" : "Pelanggan Baru"}
                </DialogTitle>
                <DialogDescription>
                  Masukkan detail pelanggan di bawah ini.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap *</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: "retail" | "project") =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="project">Proyek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telepon *</Label>
                    <Input
                      id="phone"
                      placeholder="+62 812 3456 7890"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Textarea
                    id="address"
                    placeholder="Alamat lengkap"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                {formData.category === "project" && (
                  <div className="space-y-2">
                    <Label htmlFor="payment_terms">Termin Pembayaran (Hari)</Label>
                    <Select
                      value={formData.payment_terms_days.toString()}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          payment_terms_days: parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Langsung</SelectItem>
                        <SelectItem value="7">7 Hari</SelectItem>
                        <SelectItem value="14">14 Hari</SelectItem>
                        <SelectItem value="30">30 Hari</SelectItem>
                        <SelectItem value="60">60 Hari</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Batal
                </Button>
                <Button
                  onClick={
                    selectedCustomer
                      ? handleUpdateCustomer
                      : handleCreateCustomer
                  }
                  disabled={submitting}
                >
                  {submitting
                    ? "Menyimpan..."
                    : selectedCustomer
                      ? "Perbarui Pelanggan"
                      : "Tambah Pelanggan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">
                    Total Pelanggan
                  </p>
                  <p className="text-3xl font-bold mt-1">{stats.total}</p>
                </div>
                <div className="rounded-lg p-3 bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Retail
                  </p>
                  <p className="text-3xl font-bold mt-1">{stats.individual}</p>
                </div>
                <div className="rounded-lg p-3 bg-green-100">
                  <UserPlus className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Project
                  </p>
                  <p className="text-3xl font-bold mt-1">{stats.company}</p>
                </div>
                <div className="rounded-lg p-3 bg-purple-100">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Outstanding
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {formatCurrency(stats.totalRevenue)}
                  </p>
                </div>
                <div className="rounded-lg p-3 bg-amber-100">
                  <TrendingUp className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>

                {selectedCustomers.length > 0 && (
                  <Badge variant="secondary">
                    {selectedCustomers.length} selected
                  </Badge>
                )}
              </div>

              <Button variant="outline" onClick={refetch} disabled={loading}>
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Table with Server-Side Pagination */}
        <Card>
          <CardContent className="p-6">
            <DataTableServer
              columns={columns}
              data={customers}
              pageCount={pageCount}
              totalRows={totalRows}
              pagination={pagination}
              onPaginationChange={setPagination}
              loading={loading}
              searchKey="name"
              searchPlaceholder="Search customers..."
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              onRowClick={handleRowClick}
              onSelectionChange={handleSelectionChange}
              enableMultiSelect={true}
              enableColumnVisibility={true}
              emptyMessage="No customers found"
              emptyDescription="Add your first customer to get started."
            />
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong>{selectedCustomer?.name}</strong>? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteCustomer}
                className="bg-red-600 hover:bg-red-700"
              >
                {submitting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
