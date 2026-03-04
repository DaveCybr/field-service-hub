import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Users,
  Shield,
  ShieldCheck,
  Briefcase,
  Wrench,
  DollarSign,
  RefreshCw,
  Search,
  Edit,
  Eye,
  EyeOff,
  Key,
  Copy,
  Check,
  AlertTriangle,
  Info,
  Trash2,
  MoreVertical,
  Lock,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserWithRole {
  phone: string;
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

const ROLES = [
  {
    value: "admin",
    label: "Admin",
    icon: ShieldCheck,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dotColor: "bg-blue-500",
  },
  {
    value: "manager",
    label: "Manajer",
    icon: Briefcase,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    dotColor: "bg-violet-500",
  },
  {
    value: "technician",
    label: "Teknisi",
    icon: Wrench,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
  },
  {
    value: "cashier",
    label: "Kasir",
    icon: DollarSign,
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-500",
  },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  available: {
    label: "Aktif",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  on_job: {
    label: "Bertugas",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  locked: { label: "Terkunci", color: "bg-red-50 text-red-700 border-red-200" },
  off_duty: {
    label: "Tidak Bertugas",
    color: "bg-slate-50 text-slate-600 border-slate-200",
  },
};

const AVATAR_COLORS = [
  "from-blue-500 to-cyan-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-rose-500 to-pink-600",
];

function getAvatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ManajemenUser() {
  const { isSuperadmin, loading: authLoading, session } = useAuth();
  const { log: auditLog } = useAuditLog();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("semua");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const { toast } = useToast();

  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "technician",
  });

  const isEditingSelf = selectedUser?.user_id === session?.user?.id;
  const isSelfDeletion = selectedUser?.user_id === session?.user?.id;
  const superadminCount = users.filter((u) => u.role === "superadmin").length;
  const isLastSuperadmin =
    selectedUser?.role === "superadmin" && superadminCount === 1;

  const stats = {
    total: users.length,
    byRole: ROLES.map((r) => ({
      ...r,
      count: users.filter((u) => u.role === r.value).length,
    })),
  };

  useEffect(() => {
    if (isSuperadmin) fetchUsers();
  }, [isSuperadmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch {
      toast({ variant: "destructive", title: "Gagal memuat data pengguna" });
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = {
      lower: "abcdefghijklmnopqrstuvwxyz",
      upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
      num: "0123456789",
      sym: "!@#$%^&*",
    };
    const all = Object.values(chars).join("");
    let pwd = Object.values(chars)
      .map((c) => c[Math.floor(Math.random() * c.length)])
      .join("");
    for (let i = pwd.length; i < 12; i++)
      pwd += all[Math.floor(Math.random() * all.length)];
    pwd = pwd
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
    setFormData({ ...formData, password: pwd });
    setShowPassword(true);
    toast({
      title: "Password dibuat",
      description: "Salin password sebelum menyimpan.",
    });
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      setPasswordCopied(true);
      toast({
        title: "Tersalin!",
        description: "Password disalin ke clipboard.",
      });
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "Gagal menyalin",
        description: "Salin password secara manual.",
      });
    }
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, label: "", color: "" };
    if (pwd.length < 8)
      return { strength: 1, label: "Terlalu pendek", color: "text-red-500" };
    let s = 0;
    if (pwd.length >= 8) s++;
    if (pwd.length >= 12) s++;
    if (/[a-z]/.test(pwd)) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^a-zA-Z0-9]/.test(pwd)) s++;
    if (s <= 2)
      return { strength: 2, label: "Lemah", color: "text-orange-500" };
    if (s <= 4)
      return { strength: 3, label: "Cukup", color: "text-yellow-500" };
    return { strength: 4, label: "Kuat", color: "text-emerald-600" };
  };

  const handleCreateUser = async () => {
    if (
      !formData.email ||
      !formData.password ||
      !formData.name ||
      !formData.role
    ) {
      toast({
        variant: "destructive",
        title: "Kolom wajib diisi",
        description: "Semua field harus diisi.",
      });
      return;
    }
    if (formData.password.length < 8) {
      toast({
        variant: "destructive",
        title: "Password terlalu pendek",
        description: "Minimal 8 karakter.",
      });
      return;
    }
    setCreating(true);
    try {
      // Ambil session aktif untuk menyertakan JWT ke Edge Function
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        throw new Error("Sesi tidak ditemukan, silakan login ulang.");
      }

      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          phone: formData.phone,
        },
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      await auditLog({
        action: "create",
        entityType: "user",
        entityId: response.data?.user?.id,
        newData: {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        },
      });

      toast({
        title: "Pengguna berhasil dibuat",
        description: `${formData.name} sudah bisa masuk ke sistem.`,
      });
      toast({
        title: "🔑 Kredensial Login",
        description: `Email: ${formData.email}\nPassword: ${formData.password}`,
        duration: 15000,
      });

      setFormData({
        email: "",
        password: "",
        name: "",
        phone: "",
        role: "technician",
      });
      setCreateDialogOpen(false);
      setShowPassword(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal membuat pengguna",
        description: error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || isEditingSelf) return;
    setUpdating(true);
    try {
      const originalRole = users.find((u) => u.id === selectedUser.id)?.role;

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!currentSession?.access_token)
        throw new Error("Sesi tidak ditemukan, silakan login ulang.");

      const response = await supabase.functions.invoke("update-user-role", {
        body: { userId: selectedUser.user_id, newRole: selectedUser.role },
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      await auditLog({
        action: "update",
        entityType: "user",
        entityId: selectedUser.user_id,
        oldData: { role: originalRole },
        newData: { role: selectedUser.role },
      });
      toast({
        title: "Role diperbarui",
        description: `Role ${selectedUser.name} diubah menjadi ${selectedUser.role}.`,
      });
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal memperbarui role",
        description: error.message,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedUser || !editFormData.name || !editFormData.email) {
      toast({ variant: "destructive", title: "Nama dan email wajib diisi" });
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({
          name: editFormData.name,
          email: editFormData.email,
          phone: editFormData.phone || null,
        })
        .eq("id", selectedUser.id);
      if (error) throw error;
      await auditLog({
        action: "update",
        entityType: "user",
        entityId: selectedUser.user_id,
        oldData: { name: selectedUser.name, email: selectedUser.email },
        newData: editFormData,
      });
      toast({
        title: "Profil diperbarui",
        description: `Profil ${editFormData.name} berhasil diperbarui.`,
      });
      setEditProfileDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal memperbarui profil",
        description: error.message,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || isSelfDeletion || isLastSuperadmin) return;
    setDeleting(true);
    try {
      // Kasus 1: Teknisi tanpa akun login (user_id null) — hapus langsung dari tabel employees
      if (!selectedUser.user_id) {
        const { error } = await supabase
          .from("employees")
          .delete()
          .eq("id", selectedUser.id);
        if (error) throw error;
        await auditLog({
          action: "delete",
          entityType: "user",
          entityId: selectedUser.id,
          oldData: {
            name: selectedUser.name,
            email: selectedUser.email,
            role: selectedUser.role,
          },
        });
        toast({
          title: "Data dihapus",
          description: `${selectedUser.name} telah dihapus dari sistem.`,
        });
        setDeleteDialogOpen(false);
        setSelectedUser(null);
        fetchUsers();
        return;
      }

      // Kasus 2: User dengan akun login — harus lewat Edge Function (butuh service role)
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (!currentSession?.access_token)
        throw new Error("Sesi tidak ditemukan, silakan login ulang.");

      const response = await supabase.functions.invoke("delete-user", {
        body: { userId: selectedUser.user_id, employeeId: selectedUser.id },
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      await auditLog({
        action: "delete",
        entityType: "user",
        entityId: selectedUser.user_id,
        oldData: {
          name: selectedUser.name,
          email: selectedUser.email,
          role: selectedUser.role,
        },
      });
      toast({
        title: "Pengguna dihapus",
        description: `${selectedUser.name} telah dihapus dari sistem.`,
      });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Gagal menghapus pengguna",
        description: error.message,
      });
    } finally {
      setDeleting(false);
    }
  };

  const getRoleConfig = (role: string) =>
    ROLES.find((r) => r.value === role) || {
      value: role,
      label: role,
      icon: Users,
      color: "bg-slate-50 text-slate-600 border-slate-200",
      dotColor: "bg-slate-400",
    };

  const filteredUsers = users.filter((u) => {
    const cocokCari =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase());
    const cocokRole = filterRole === "semua" || u.role === filterRole;
    return cocokCari && cocokRole;
  });

  const pwdStrength = getPasswordStrength(formData.password);

  if (!authLoading && !isSuperadmin)
    return <Navigate to="/dashboard" replace />;

  return (
    <DashboardLayout>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .um-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .stat-card { transition: box-shadow 0.18s, transform 0.18s; }
        .stat-card:hover { box-shadow: 0 8px 32px -4px rgba(15,23,42,0.10); transform: translateY(-1px); }
        .um-row { transition: background 0.12s; }
        .um-row:hover { background: #f8fafc; }
        .um-row:hover .row-action { opacity: 1; }
        .row-action { opacity: 0; transition: opacity 0.15s; }
        .filter-pill { transition: all 0.15s; border-radius: 99px; }
        .filter-pill.active { background: #0f172a; color: #fff; border-color: #0f172a; }
        .filter-pill:not(.active):hover { background: #f1f5f9; }
        .shimmer { background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.4s infinite; }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        .pwd-bar { transition: width 0.4s cubic-bezier(.4,0,.2,1); border-radius: 99px; height: 100%; }
      `}</style>

      <div className="um-root space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Administrasi Sistem
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Manajemen Pengguna
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Buat dan kelola akun login beserta hak akses seluruh karyawan
            </p>
          </div>

          <Dialog
            open={createDialogOpen}
            onOpenChange={(open) => {
              setCreateDialogOpen(open);
              if (!open) {
                setFormData({
                  email: "",
                  password: "",
                  name: "",
                  phone: "",
                  role: "technician",
                });
                setShowPassword(false);
                setPasswordCopied(false);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-9 gap-2 bg-slate-900 hover:bg-slate-800 shadow-sm"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Buat Akun Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  Buat Akun Pengguna Baru
                </DialogTitle>
                <DialogDescription className="text-slate-500">
                  Akun baru dapat langsung digunakan untuk login. Pastikan
                  menyimpan password sebelum menutup dialog ini.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-sm font-medium">
                      Nama Lengkap <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      placeholder="Budi Santoso"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="h-9 border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="budi@perusahaan.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="h-9 border-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">No. Telepon</Label>
                    <Input
                      type="tel"
                      placeholder="+62 812 3456 7890"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="h-9 border-slate-200"
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-sm font-medium">
                      Role / Hak Akses <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.role}
                      onValueChange={(v) =>
                        setFormData({ ...formData, role: v })
                      }
                    >
                      <SelectTrigger className="h-9 border-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            <div className="flex items-center gap-2">
                              <r.icon className="h-3.5 w-3.5" />
                              {r.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                    >
                      <Key className="h-3 w-3" />
                      Buat Otomatis
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 8 karakter"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="pr-20 h-9 border-slate-200 font-mono text-sm"
                    />
                    <div className="absolute right-1 top-1 flex gap-0.5">
                      {formData.password && (
                        <button
                          type="button"
                          onClick={copyPassword}
                          className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        >
                          {passwordCopied ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="h-7 w-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        {showPassword ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  {formData.password && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">
                          Kekuatan password:
                        </span>
                        <span className={`font-semibold ${pwdStrength.color}`}>
                          {pwdStrength.label}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn("pwd-bar", {
                            "bg-red-500": pwdStrength.strength === 1,
                            "bg-orange-500": pwdStrength.strength === 2,
                            "bg-yellow-500": pwdStrength.strength === 3,
                            "bg-emerald-500": pwdStrength.strength === 4,
                          })}
                          style={{
                            width: `${(pwdStrength.strength / 4) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {formData.password && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">
                        Simpan password sekarang!
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Salin dan bagikan kredensial ke karyawan. Password tidak
                        bisa dilihat lagi setelah dialog ditutup.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={creating}
                >
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateUser}
                  disabled={
                    creating ||
                    !formData.password ||
                    formData.password.length < 8
                  }
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  {creating ? "Membuat..." : "Buat Akun"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* ── KPI Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="stat-card bg-white rounded-xl border border-slate-200 p-5 col-span-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
              Total Pengguna
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">
              {stats.total}
            </p>
            <p className="text-xs text-slate-400 mt-1">akun aktif</p>
          </div>
          {stats.byRole.map((r) => (
            <div
              key={r.value}
              className="stat-card bg-white rounded-xl border border-slate-200 p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-2 w-2 rounded-full ${r.dotColor}`} />
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                  {r.label}
                </p>
              </div>
              <p className="text-3xl font-bold text-slate-900 tabular-nums">
                {r.count}
              </p>
            </div>
          ))}
        </div>

        {/* ── Tabel ── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { value: "semua", label: "Semua" },
                ...ROLES.map((r) => ({ value: r.value, label: r.label })),
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilterRole(f.value)}
                  className={cn(
                    "filter-pill text-xs font-semibold px-3 py-1.5 border transition-all",
                    filterRole === f.value
                      ? "active"
                      : "border-slate-200 text-slate-600",
                  )}
                >
                  {f.label}
                  {f.value !== "semua" && (
                    <span
                      className={cn(
                        "ml-1.5 text-[10px] font-bold",
                        filterRole === f.value
                          ? "text-white/70"
                          : "text-slate-400",
                      )}
                    >
                      {users.filter((u) => u.role === f.value).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Cari pengguna..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-8 w-52 text-sm border-slate-200 bg-slate-50 focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-slate-900"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={fetchUsers}
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5 text-slate-500",
                    loading && "animate-spin",
                  )}
                />
              </Button>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="shimmer h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="shimmer h-3 w-40 rounded" />
                    <div className="shimmer h-2.5 w-56 rounded" />
                  </div>
                  <div className="shimmer h-6 w-20 rounded-full" />
                  <div className="shimmer h-6 w-14 rounded-full" />
                  <div className="shimmer h-3 w-20 rounded" />
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Tidak ada pengguna ditemukan
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery
                  ? "Coba kata kunci lain"
                  : "Buat akun pertama untuk memulai"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/60 hover:bg-slate-50/60">
                    {[
                      "Pengguna",
                      "Email",
                      "Telepon",
                      "Role",
                      "Status",
                      "Dibuat",
                      "",
                    ].map((h) => (
                      <TableHead
                        key={h}
                        className="text-[11px] font-bold uppercase tracking-wide text-slate-400 py-3 first:pl-5"
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const roleConfig = getRoleConfig(user.role);
                    const statusConfig = STATUS_LABELS[user.status] || {
                      label: user.status,
                      color: "bg-slate-50 text-slate-600 border-slate-200",
                    };
                    const isSelf = user.user_id === session?.user?.id;

                    return (
                      <TableRow
                        key={user.id}
                        className="um-row border-slate-100"
                      >
                        {/* Pengguna */}
                        <TableCell className="pl-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarFallback
                                className={`bg-gradient-to-br ${getAvatarColor(user.name)} text-white text-xs font-bold`}
                              >
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-800">
                                  {user.name}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full">
                                    Anda
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell className="py-3.5">
                          <a
                            href={`mailto:${user.email}`}
                            className="text-sm text-slate-600 hover:text-slate-900 hover:underline"
                          >
                            {user.email}
                          </a>
                        </TableCell>

                        {/* Telepon */}
                        <TableCell className="py-3.5 text-sm text-slate-500">
                          {user.phone || "—"}
                        </TableCell>

                        {/* Role */}
                        <TableCell className="py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${roleConfig.color}`}
                          >
                            <roleConfig.icon className="h-3 w-3" />
                            {roleConfig.label}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3.5">
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${statusConfig.color}`}
                          >
                            {statusConfig.label}
                          </span>
                        </TableCell>

                        {/* Dibuat */}
                        <TableCell className="py-3.5 text-xs text-slate-400">
                          {format(new Date(user.created_at), "dd MMM yyyy", {
                            locale: localeId,
                          })}
                        </TableCell>

                        {/* Aksi */}
                        <TableCell className="py-3.5 pr-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="row-action h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 text-sm"
                            >
                              <DropdownMenuLabel className="text-xs text-slate-400 font-normal">
                                Aksi
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditFormData({
                                    name: user.name,
                                    email: user.email,
                                    phone: user.phone || "",
                                  });
                                  setEditProfileDialogOpen(true);
                                }}
                              >
                                <Edit className="mr-2 h-3.5 w-3.5" />
                                Edit Profil
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setEditDialogOpen(true);
                                }}
                                disabled={isSelf}
                              >
                                <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                                Ubah Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setDeleteDialogOpen(true);
                                }}
                                disabled={
                                  isSelf ||
                                  (user.role === "superadmin" &&
                                    superadminCount === 1)
                                }
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Hapus Pengguna
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer */}
          {!loading && filteredUsers.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-400">
                Menampilkan{" "}
                <span className="font-semibold text-slate-600">
                  {filteredUsers.length}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-slate-600">
                  {users.length}
                </span>{" "}
                pengguna
              </p>
            </div>
          )}
        </div>

        {/* ── Dialog: Ubah Role ── */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ubah Role Pengguna</DialogTitle>
              <DialogDescription>
                Ubah hak akses untuk {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {isEditingSelf && (
                <Alert variant="destructive">
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    Anda tidak dapat mengubah role sendiri demi keamanan sistem.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Role Baru</Label>
                <Select
                  value={selectedUser?.role || ""}
                  onValueChange={(v) =>
                    setSelectedUser((p) => (p ? { ...p, role: v } : null))
                  }
                  disabled={isEditingSelf}
                >
                  <SelectTrigger className="h-9 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        <div className="flex items-center gap-2">
                          <r.icon className="h-3.5 w-3.5" />
                          {r.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateRole}
                disabled={updating || isEditingSelf}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {updating ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Edit Profil ── */}
        <Dialog
          open={editProfileDialogOpen}
          onOpenChange={setEditProfileDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profil</DialogTitle>
              <DialogDescription>
                Perbarui informasi profil {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {[
                {
                  id: "editName",
                  label: "Nama Lengkap",
                  type: "text",
                  key: "name",
                  required: true,
                },
                {
                  id: "editEmail",
                  label: "Email",
                  type: "email",
                  key: "email",
                  required: true,
                },
                {
                  id: "editPhone",
                  label: "No. Telepon",
                  type: "tel",
                  key: "phone",
                  required: false,
                },
              ].map((f) => (
                <div key={f.id} className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    {f.label}{" "}
                    {f.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id={f.id}
                    type={f.type}
                    value={editFormData[f.key as keyof typeof editFormData]}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        [f.key]: e.target.value,
                      })
                    }
                    className="h-9 border-slate-200"
                  />
                </div>
              ))}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditProfileDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleUpdateProfile}
                disabled={updating}
                className="bg-slate-900 hover:bg-slate-800"
              >
                {updating ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Hapus ── */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus Akun Pengguna</DialogTitle>
              <DialogDescription>
                Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {isSelfDeletion && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Anda tidak dapat menghapus akun Anda sendiri.
                  </AlertDescription>
                </Alert>
              )}
              {isLastSuperadmin && !isSelfDeletion && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Tidak dapat menghapus satu-satunya Super Admin. Sistem
                    membutuhkan minimal satu Super Admin.
                  </AlertDescription>
                </Alert>
              )}
              {!isSelfDeletion && !isLastSuperadmin && selectedUser && (
                <>
                  {/* Badge khusus untuk teknisi tanpa akun login */}
                  {!selectedUser.user_id && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex gap-2.5">
                      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-blue-800">
                          Data tanpa akun login
                        </p>
                        <p className="text-xs text-blue-600 mt-0.5">
                          Teknisi ini tidak memiliki akun login. Hanya data
                          karyawan yang akan dihapus.
                        </p>
                      </div>
                    </div>
                  )}
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Data <strong>{selectedUser.name}</strong> akan dihapus
                      permanen dan tidak dapat dikembalikan.
                    </AlertDescription>
                  </Alert>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Detail
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="text-slate-400 w-16 inline-block">
                        Nama:
                      </span>{" "}
                      {selectedUser.name}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="text-slate-400 w-16 inline-block">
                        Email:
                      </span>{" "}
                      {selectedUser.email}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="text-slate-400 w-16 inline-block">
                        Role:
                      </span>{" "}
                      {getRoleConfig(selectedUser.role).label}
                    </p>
                    <p className="text-sm text-slate-700">
                      <span className="text-slate-400 w-16 inline-block">
                        Akun:
                      </span>
                      {selectedUser.user_id ? (
                        <span className="text-emerald-600 font-medium">
                          Memiliki akun login
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          Tidak memiliki akun login
                        </span>
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteUser}
                disabled={deleting || isSelfDeletion || isLastSuperadmin}
              >
                {deleting ? "Menghapus..." : "Ya, Hapus Akun"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
