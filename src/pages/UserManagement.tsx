import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { useToast } from '@/hooks/use-toast';
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
} from 'lucide-react';
import { format } from 'date-fns';

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

const ROLES = [
  { value: 'admin', label: 'Admin', icon: ShieldCheck, color: 'bg-blue-500/10 text-blue-500' },
  { value: 'manager', label: 'Manager', icon: Briefcase, color: 'bg-purple-500/10 text-purple-500' },
  { value: 'technician', label: 'Technician', icon: Wrench, color: 'bg-green-500/10 text-green-500' },
  { value: 'cashier', label: 'Cashier', icon: DollarSign, color: 'bg-yellow-500/10 text-yellow-500' },
];

export default function UserManagement() {
  const { isSuperadmin, userRole, loading: authLoading, session } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'technician',
  });

  useEffect(() => {
    if (isSuperadmin) {
      fetchUsers();
    }
  }, [isSuperadmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load users.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password || !formData.name || !formData.role) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'All fields are required.',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Password must be at least 6 characters.',
      });
      return;
    }

    setCreating(true);
    try {
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast({
        title: 'User Created',
        description: `${formData.name} has been created successfully.`,
      });

      setFormData({ email: '', password: '', name: '', role: 'technician' });
      setCreateDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create user.',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    setUpdating(true);
    try {
      const response = await supabase.functions.invoke('update-user-role', {
        body: {
          userId: selectedUser.user_id,
          newRole: selectedUser.role,
        },
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast({
        title: 'Role Updated',
        description: `${selectedUser.name}'s role has been updated.`,
      });

      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update role.',
      });
    } finally {
      setUpdating(false);
    }
  };

  const getRoleConfig = (role: string) => {
    return ROLES.find(r => r.value === role) || { 
      value: role, 
      label: role, 
      icon: Users, 
      color: 'bg-muted text-muted-foreground' 
    };
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Redirect if not superadmin
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
              <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
              <p className="text-muted-foreground">
                Create and manage user accounts and roles
              </p>
            </div>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with a specific role.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateUser} disabled={creating}>
                  {creating ? 'Creating...' : 'Create User'}
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
            const count = users.filter(u => u.role === role.value).length;
            return (
              <Card key={role.value}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <role.icon className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground">{role.label}s</p>
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
                  Create your first user to get started.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const roleConfig = getRoleConfig(user.role);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleConfig.color}>
                            <roleConfig.icon className="mr-1 h-3 w-3" />
                            {roleConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.status === 'available' ? 'default' : 'secondary'}
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(user.created_at), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
            <div className="py-4">
              <Label htmlFor="editRole">Role</Label>
              <Select
                value={selectedUser?.role || ''}
                onValueChange={(value) => 
                  setSelectedUser(prev => prev ? { ...prev, role: value } : null)
                }
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} disabled={updating}>
                {updating ? 'Updating...' : 'Update Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
