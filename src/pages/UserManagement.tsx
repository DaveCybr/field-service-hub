import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format } from "date-fns";

interface UserWithRole {
  phone: string;
  id: string;
  user_id: string;
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
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    value: "manager",
    label: "Manager",
    icon: Briefcase,
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    value: "technician",
    label: "Technician",
    icon: Wrench,
    color: "bg-green-500/10 text-green-500",
  },
  {
    value: "cashier",
    label: "Cashier",
    icon: DollarSign,
    color: "bg-yellow-500/10 text-yellow-500",
  },
];

export default function UserManagement() {
  const { isSuperadmin, userRole, loading: authLoading, session } = useAuth();
  const { log: auditLog } = useAuditLog();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Check if selected user is the current logged-in user
  const isEditingSelf = selectedUser?.user_id === session?.user?.id;

  // Check if trying to delete the last superadmin
  const isSelfDeletion = selectedUser?.user_id === session?.user?.id;
  const superadminCount = users.filter((u) => u.role === "superadmin").length;
  const isLastSuperadmin =
    selectedUser?.role === "superadmin" && superadminCount === 1;

  useEffect(() => {
    if (isSuperadmin) {
      fetchUsers();
    }
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
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load users.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate secure random password
  const generatePassword = () => {
    const length = 12;
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*";
    const all = lowercase + uppercase + numbers + symbols;

    let password = "";
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = password.length; i < length; i++) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    password = password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");

    setFormData({ ...formData, password });
    setShowPassword(true);
    toast({
      title: "Password Generated",
      description:
        "A secure password has been generated. Please copy it before saving.",
    });
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(formData.password);
      setPasswordCopied(true);
      toast({
        title: "Copied!",
        description: "Password copied to clipboard",
      });
      setTimeout(() => setPasswordCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the password manually",
        variant: "destructive",
      });
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "", color: "" };
    if (password.length < 8)
      return { strength: 1, label: "Too short", color: "text-red-500" };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2)
      return { strength: 2, label: "Weak", color: "text-orange-500" };
    if (strength <= 4)
      return { strength: 3, label: "Good", color: "text-yellow-500" };
    return { strength: 4, label: "Strong", color: "text-green-500" };
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
        title: "Validation Error",
        description: "All fields are required.",
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Password must be at least 8 characters.",
      });
      return;
    }

    setCreating(true);
    try {
      const response = await supabase.functions.invoke("create-user", {
        body: {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
        },
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
        title: "User Created Successfully",
        description: `${formData.name} can now log in to the system.`,
      });

      toast({
        title: "🔑 Login Credentials",
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
      console.error("Error creating user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create user.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    // Prevent self role edit
    if (isEditingSelf) {
      toast({
        variant: "destructive",
        title: "Action Not Allowed",
        description: "You cannot change your own role for security reasons.",
      });
      return;
    }

    const originalUser = users.find((u) => u.id === selectedUser.id);
    const oldRole = originalUser?.role;

    setUpdating(true);
    try {
      const response = await supabase.functions.invoke("update-user-role", {
        body: {
          userId: selectedUser.user_id,
          newRole: selectedUser.role,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      await auditLog({
        action: "update",
        entityType: "user",
        entityId: selectedUser.user_id,
        oldData: { name: selectedUser.name, role: oldRole },
        newData: { name: selectedUser.name, role: selectedUser.role },
      });

      toast({
        title: "Role Updated",
        description: `${selectedUser.name}'s role has been updated to ${selectedUser.role}.`,
      });

      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update role.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!selectedUser) return;

    if (!editFormData.name || !editFormData.email) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Name and email are required.",
      });
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
        oldData: {
          name: selectedUser.name,
          email: selectedUser.email,
        },
        newData: {
          name: editFormData.name,
          email: editFormData.email,
          phone: editFormData.phone,
        },
      });

      toast({
        title: "Profile Updated",
        description: `${editFormData.name}'s profile has been updated successfully.`,
      });

      setEditProfileDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    // Prevent self deletion
    if (isSelfDeletion) {
      toast({
        variant: "destructive",
        title: "Action Not Allowed",
        description: "You cannot delete your own account.",
      });
      return;
    }

    // Prevent deleting last superadmin
    if (isLastSuperadmin) {
      toast({
        variant: "destructive",
        title: "Action Not Allowed",
        description:
          "Cannot delete the last superadmin account. System must have at least one superadmin.",
      });
      return;
    }

    setDeleting(true);
    try {
      // First, delete from employees table
      const { error: employeeError } = await supabase
        .from("employees")
        .delete()
        .eq("id", selectedUser.id);

      if (employeeError) throw employeeError;

      // Then delete the auth user (this will cascade delete user_roles)
      const { error: authError } = await supabase.auth.admin.deleteUser(
        selectedUser.user_id
      );

      if (authError) throw authError;

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
        title: "User Deleted",
        description: `${selectedUser.name} has been removed from the system.`,
      });

      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message ||
          "Failed to delete user. This operation requires admin privileges.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getRoleConfig = (role: string) => {
    return (
      ROLES.find((r) => r.value === role) || {
        value: role,
        label: role,
        icon: Users,
        color: "bg-muted text-muted-foreground",
      }
    );
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const passwordStrength = getPasswordStrength(formData.password);

  if (!authLoading && !isSuperadmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                User Management
              </h1>
              <p className="text-muted-foreground">
                Create and manage user accounts and roles
              </p>
            </div>
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
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Create a new employee account with system access. The employee
                  will be able to log in immediately.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
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
                  <Label htmlFor="email">Email *</Label>
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
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <role.icon className="h-4 w-4" />
                            {role.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generatePassword}
                      className="h-auto p-0 text-xs text-primary hover:text-primary/80"
                    >
                      <Key className="mr-1 h-3 w-3" />
                      Generate Strong Password
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 characters"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="pr-20"
                    />
                    <div className="absolute right-1 top-1 flex gap-1">
                      {formData.password && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={copyPassword}
                          className="h-8 w-8 p-0"
                        >
                          {passwordCopied ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="h-8 w-8 p-0"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {formData.password && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Password Strength:
                        </span>
                        <span
                          className={`font-medium ${passwordStrength.color}`}
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            passwordStrength.strength === 1
                              ? "bg-red-500 w-1/4"
                              : passwordStrength.strength === 2
                              ? "bg-orange-500 w-2/4"
                              : passwordStrength.strength === 3
                              ? "bg-yellow-500 w-3/4"
                              : "bg-green-500 w-full"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {formData.password && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
                    <div className="flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                          Important: Save this password!
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Copy and securely share these credentials with the
                          employee. You won't be able to see the password again.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateUser}
                  disabled={
                    creating ||
                    !formData.password ||
                    formData.password.length < 8
                  }
                >
                  {creating ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {ROLES.map((role) => {
            const count = users.filter((u) => u.role === role.value).length;
            return (
              <Card key={role.value}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <role.icon className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground">
                        {role.label}s
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search & Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>All Users</CardTitle>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-[300px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={fetchUsers}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No users found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term."
                    : "Create your first user to get started."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => {
                      const roleConfig = getRoleConfig(user.role);
                      const isSelf = user.user_id === session?.user?.id;

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.name}
                            {isSelf && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                You
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={roleConfig.color}
                            >
                              <roleConfig.icon className="mr-1 h-3 w-3" />
                              {roleConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.status === "available"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(user.created_at), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setEditDialogOpen(true);
                                  }}
                                  disabled={isSelf}
                                >
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Change Role
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
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete User
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
          </CardContent>
        </Card>

        {/* Edit Role Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Role</DialogTitle>
              <DialogDescription>
                Change the role for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {isEditingSelf && (
                <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You cannot change your own role for security reasons. Please
                    ask another superadmin to change your role if needed.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="editRole">Role</Label>
                <Select
                  value={selectedUser?.role || ""}
                  onValueChange={(value) =>
                    setSelectedUser((prev) =>
                      prev ? { ...prev, role: value } : null
                    )
                  }
                  disabled={isEditingSelf}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <role.icon className="h-4 w-4" />
                          {role.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={updating || isEditingSelf}
              >
                {updating ? "Updating..." : "Update Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Profile Dialog */}
        <Dialog
          open={editProfileDialogOpen}
          onOpenChange={setEditProfileDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User Profile</DialogTitle>
              <DialogDescription>
                Update profile information for {selectedUser?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Full Name *</Label>
                <Input
                  id="editName"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhone">Phone</Label>
                <Input
                  id="editPhone"
                  type="tel"
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditProfileDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateProfile} disabled={updating}>
                {updating ? "Updating..." : "Update Profile"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {selectedUser?.name}'s account?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {isSelfDeletion && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You cannot delete your own account for security reasons.
                  </AlertDescription>
                </Alert>
              )}

              {isLastSuperadmin && !isSelfDeletion && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Cannot delete the last superadmin account. The system must
                    have at least one superadmin.
                  </AlertDescription>
                </Alert>
              )}

              {!isSelfDeletion && !isLastSuperadmin && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This action cannot be undone. This will permanently delete
                    the user account and remove all associated data.
                  </AlertDescription>
                </Alert>
              )}

              {selectedUser && !isSelfDeletion && !isLastSuperadmin && (
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <p className="text-sm font-medium">Account Details:</p>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Name: {selectedUser.name}</p>
                    <p>Email: {selectedUser.email}</p>
                    <p>Role: {selectedUser.role}</p>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
                disabled={deleting || isSelfDeletion || isLastSuperadmin}
              >
                {deleting ? "Deleting..." : "Delete User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
