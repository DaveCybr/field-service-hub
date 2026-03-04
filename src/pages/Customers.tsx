// Customers.tsx - Manajemen Pelanggan Enterprise Level
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Download,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DataTableServer } from "@/components/ui/data-table";
import {
  createCustomerColumns,
  Customer,
  CustomerColumnActions,
} from "@/components/customers/columns";
import { useServerPagination } from "@/hooks/useServerPagination";
import { cn } from "@/lib/utils";

const CATEGORY_TABS = [
  { value: "all", label: "Semua" },
  { value: "retail", label: "Retail" },
  { value: "project", label: "Proyek" },
];

const STAT_CARDS = [
  {
    key: "total",
    label: "Total Pelanggan",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
    filterValue: "all",
  },
  {
    key: "individual",
    label: "Pelanggan Retail",
    icon: UserPlus,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
    filterValue: "retail",
  },
  {
    key: "company",
    label: "Pelanggan Proyek",
    icon: Building2,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
    filterValue: "project",
  },
  {
    key: "totalRevenue",
    label: "Total Piutang",
    icon: TrendingUp,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
    filterValue: null,
    isCurrency: true,
  },
];

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

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    category: "retail" as "retail" | "project",
    payment_terms_days: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const {
    data: customers,
    loading,
    pageCount,
    totalRows,
    pagination,
    setPagination,
    sorting,
    setSorting,
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
    const { count: totalCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });

    const { count: individualCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("category", "retail");

    const { count: companyCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("category", "project");

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

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Nama wajib diisi";
    if (!formData.phone.trim()) errors.phone = "Nomor telepon wajib diisi";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Format email tidak valid";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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
    setFormErrors({});
    setSelectedCustomer(null);
  };

  const handleCreateCustomer = async () => {
    if (!validateForm()) return;
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
        title: "Pelanggan Berhasil Ditambahkan",
        description: `${formData.name} telah berhasil ditambahkan ke sistem.`,
      });
      setDialogOpen(false);
      resetForm();
      refetch();
      fetchStats();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menambahkan Pelanggan",
        description: error.message || "Terjadi kesalahan. Silakan coba lagi.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer || !validateForm()) return;
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
        title: "Data Pelanggan Diperbarui",
        description: `Data ${formData.name} telah berhasil diperbarui.`,
      });
      setDialogOpen(false);
      resetForm();
      refetch();
      fetchStats();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Memperbarui Data",
        description: error.message || "Terjadi kesalahan. Silakan coba lagi.",
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
        description: `${selectedCustomer.name} telah berhasil dihapus dari sistem.`,
      });
      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
      refetch();
      fetchStats();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal Menghapus Pelanggan",
        description: error.message || "Terjadi kesalahan. Silakan coba lagi.",
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

  const columnActions: CustomerColumnActions = {
    onViewDetails: (customer) => navigate(`/customers/${customer.id}`),
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
    onViewServices: (customer) => navigate(`/services?customer=${customer.id}`),
    onDelete: (customer) => {
      setSelectedCustomer(customer);
      setDeleteDialogOpen(true);
    },
  };

  const columns = createCustomerColumns(columnActions);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const statsData = stats as Record<string, number>;

  return (
    <DashboardLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .customers-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .stat-card { transition: box-shadow 0.18s, transform 0.18s; cursor: pointer; }
        .stat-card:hover { box-shadow: 0 8px 32px -4px rgba(15,23,42,0.10); transform: translateY(-1px); }
        .tab-pill { border-radius: 99px; transition: all 0.15s; white-space: nowrap; }
        .tab-pill.active { background: #0f172a; color: #fff; border-color: #0f172a; }
        .tab-pill:not(.active):hover { background: #f1f5f9; }
        .bulk-bar { animation: slideDown 0.2s ease; }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        .customers-fade { animation: fadeUp 0.2s ease; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
      `}</style>

      <div className="customers-root customers-fade space-y-5">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                CRM
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Manajemen Pelanggan
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Kelola data pelanggan, riwayat transaksi, dan unit terdaftar
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
              Refresh
            </button>
            <button className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all">
              <Download className="h-3.5 w-3.5" />
              Ekspor
            </button>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <button
                  onClick={resetForm}
                  className="flex items-center gap-2 h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Pelanggan
                </button>
              </DialogTrigger>

              <DialogContent
                className="max-w-xl"
                style={{
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                }}
              >
                <DialogHeader className="pb-4 border-b">
                  <DialogTitle className="text-base font-bold text-slate-900">
                    {selectedCustomer
                      ? "Edit Data Pelanggan"
                      : "Tambah Pelanggan Baru"}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-500 mt-1">
                    {selectedCustomer
                      ? "Perbarui informasi data pelanggan di bawah ini."
                      : "Lengkapi informasi pelanggan untuk menambahkan ke sistem."}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="name"
                        className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      >
                        Nama Lengkap <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        placeholder="cth: PT Maju Bersama"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (formErrors.name)
                            setFormErrors({ ...formErrors, name: "" });
                        }}
                        className={cn(
                          "h-9 text-sm",
                          formErrors.name
                            ? "border-red-400 focus-visible:ring-red-300"
                            : "",
                        )}
                      />
                      {formErrors.name && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {formErrors.name}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="category"
                        className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      >
                        Kategori
                      </Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value: "retail" | "project") =>
                          setFormData({ ...formData, category: value })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail">
                            Retail (Perorangan)
                          </SelectItem>
                          <SelectItem value="project">
                            Proyek (Perusahaan)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="email"
                        className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      >
                        Alamat Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contoh@email.com"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (formErrors.email)
                            setFormErrors({ ...formErrors, email: "" });
                        }}
                        className={cn(
                          "h-9 text-sm",
                          formErrors.email
                            ? "border-red-400 focus-visible:ring-red-300"
                            : "",
                        )}
                      />
                      {formErrors.email && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {formErrors.email}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="phone"
                        className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
                      >
                        Nomor Telepon <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phone"
                        placeholder="cth: 08123456789"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (formErrors.phone)
                            setFormErrors({ ...formErrors, phone: "" });
                        }}
                        className={cn(
                          "h-9 text-sm",
                          formErrors.phone
                            ? "border-red-400 focus-visible:ring-red-300"
                            : "",
                        )}
                      />
                      {formErrors.phone && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {formErrors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="address"
                      className="text-xs font-semibold text-slate-600 uppercase tracking-wide"
                    >
                      Alamat Lengkap
                    </Label>
                    <Textarea
                      id="address"
                      placeholder="Jl. Contoh No. 123, Kota, Provinsi"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>

                  {formData.category === "project" && (
                    <div className="space-y-1.5 p-4 bg-violet-50 rounded-lg border border-violet-100">
                      <Label
                        htmlFor="payment_terms"
                        className="text-xs font-semibold text-violet-800 uppercase tracking-wide"
                      >
                        Termin Pembayaran
                      </Label>
                      <p className="text-xs text-violet-600 mb-2">
                        Pengaturan jatuh tempo pembayaran untuk pelanggan proyek
                      </p>
                      <Select
                        value={formData.payment_terms_days.toString()}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            payment_terms_days: parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger className="bg-white h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">Tunai (Langsung)</SelectItem>
                          <SelectItem value="7">NET 7 (7 Hari)</SelectItem>
                          <SelectItem value="14">NET 14 (14 Hari)</SelectItem>
                          <SelectItem value="30">NET 30 (30 Hari)</SelectItem>
                          <SelectItem value="60">NET 60 (60 Hari)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <DialogFooter className="pt-4 border-t gap-2">
                  <button
                    onClick={() => {
                      setDialogOpen(false);
                      resetForm();
                    }}
                    disabled={submitting}
                    className="h-9 px-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-all disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={
                      selectedCustomer
                        ? handleUpdateCustomer
                        : handleCreateCustomer
                    }
                    disabled={submitting}
                    className="h-9 px-5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-all disabled:opacity-50 min-w-[130px]"
                  >
                    {submitting
                      ? "Menyimpan..."
                      : selectedCustomer
                        ? "Simpan Perubahan"
                        : "Tambah Pelanggan"}
                  </button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map(
            ({
              key,
              label,
              icon: Icon,
              color,
              bg,
              border,
              filterValue,
              isCurrency,
            }) => {
              const isActive =
                filterValue !== null && categoryFilter === filterValue;
              const value = isCurrency
                ? formatCurrency(statsData[key] ?? 0)
                : (statsData[key] ?? 0).toLocaleString("id-ID");

              return (
                <div
                  key={key}
                  className={cn(
                    "stat-card bg-white rounded-xl border p-5",
                    border,
                    isActive && "ring-2 ring-slate-900 ring-offset-1",
                    filterValue === null && "cursor-default",
                  )}
                  onClick={() => {
                    if (filterValue !== null) {
                      setCategoryFilter((f) =>
                        f === filterValue ? "all" : filterValue,
                      );
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-wide",
                          isActive ? "text-slate-700" : "text-slate-400",
                        )}
                      >
                        {label}
                      </p>
                      <p
                        className={cn(
                          "font-bold text-slate-900 mt-2 leading-none tabular-nums",
                          isCurrency ? "text-xl" : "text-3xl",
                        )}
                      >
                        {value}
                      </p>
                      <p className="text-xs text-slate-400 mt-1.5">
                        {isCurrency ? "outstanding" : "pelanggan"}
                      </p>
                    </div>
                    <div className={cn("rounded-lg p-2.5", bg)}>
                      <Icon className={cn("h-5 w-5", color)} />
                    </div>
                  </div>
                </div>
              );
            },
          )}
        </div>

        {/* ── Bulk Action Bar ── */}
        {selectedCustomers.length > 0 && (
          <div className="bulk-bar flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl">
            <span className="text-sm font-semibold">
              {selectedCustomers.length} pelanggan dipilih
            </span>
            <div className="h-4 w-px bg-white/20" />
            <button
              onClick={() =>
                toast({
                  title: "Ekspor Pilihan",
                  description: `${selectedCustomers.length} pelanggan akan diekspor`,
                })
              }
              className="flex items-center gap-2 text-sm font-semibold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Ekspor Pilihan
            </button>
            <button
              onClick={() => setSelectedCustomers([])}
              className="ml-auto text-xs text-white/60 hover:text-white transition-colors"
            >
              Batalkan pilihan
            </button>
          </div>
        )}

        {/* ── Table Card ── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Tab Filter Pills */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 overflow-x-auto">
            {CATEGORY_TABS.map((tab) => {
              const count =
                tab.value === "retail"
                  ? stats.individual
                  : tab.value === "project"
                    ? stats.company
                    : null;
              const isActive = categoryFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setCategoryFilter(tab.value)}
                  className={cn(
                    "tab-pill text-xs font-semibold px-3 py-1.5 border shrink-0",
                    isActive
                      ? "active border-slate-900"
                      : "border-slate-200 text-slate-600",
                  )}
                >
                  {tab.label}
                  {count !== null && count > 0 && (
                    <span
                      className={cn(
                        "ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {totalRows > 0 && (
              <span className="ml-auto text-xs text-slate-400 font-medium shrink-0">
                {totalRows.toLocaleString("id-ID")} data
              </span>
            )}
          </div>

          {/* DataTable */}
          <div className="p-4">
            <DataTableServer
              columns={columns}
              data={customers}
              pageCount={pageCount}
              totalRows={totalRows}
              pagination={pagination}
              onPaginationChange={setPagination}
              loading={loading}
              searchKey="name"
              searchPlaceholder="Cari nama pelanggan..."
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              sorting={sorting}
              onSortingChange={setSorting}
              onRowClick={handleRowClick}
              onSelectionChange={handleSelectionChange}
              enableMultiSelect={true}
              enableColumnVisibility={true}
              emptyMessage="Belum ada data pelanggan"
              emptyDescription="Mulai tambahkan pelanggan pertama Anda."
            />
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation ── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent
          className="max-w-md"
          style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-slate-900">
              Hapus Data Pelanggan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500">
              Anda akan menghapus{" "}
              <strong className="text-slate-900">
                {selectedCustomer?.name}
              </strong>{" "}
              dari sistem. Tindakan ini tidak dapat dibatalkan dan semua data
              terkait akan ikut terhapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={submitting}
              className="h-9 text-sm font-semibold"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCustomer}
              disabled={submitting}
              className="h-9 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
            >
              {submitting ? "Menghapus..." : "Ya, Hapus Pelanggan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
