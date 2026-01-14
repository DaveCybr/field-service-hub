import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  RefreshCw,
  Wrench,
  Settings,
  Clock,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SkillsManagementDialog from '@/components/technicians/SkillsManagementDialog';
import AvailabilityManagementDialog from '@/components/technicians/AvailabilityManagementDialog';

interface Technician {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  rating: number;
  total_jobs_completed: number;
  avatar_url: string | null;
  skills: string[];
}

export default function Technicians() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [newTechEmail, setNewTechEmail] = useState('');
  const [newTechPhone, setNewTechPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  const [availabilityDialogOpen, setAvailabilityDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    setLoading(true);
    try {
      // Fetch technicians
      const { data: techData, error: techError } = await supabase
        .from('employees')
        .select('*')
        .eq('role', 'technician')
        .order('name');

      if (techError) throw techError;

      // Fetch skills for all technicians
      const techIds = techData?.map(t => t.id) || [];
      const { data: skillsData } = await supabase
        .from('technician_skills')
        .select('technician_id, skill_name')
        .in('technician_id', techIds);

      // Map skills to technicians
      const techWithSkills = techData?.map(tech => ({
        ...tech,
        rating: tech.rating || 0,
        total_jobs_completed: tech.total_jobs_completed || 0,
        skills: skillsData
          ?.filter(s => s.technician_id === tech.id)
          .map(s => s.skill_name) || [],
      })) || [];

      setTechnicians(techWithSkills);
    } catch (error) {
      console.error('Error fetching technicians:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load technicians.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTechnician = async () => {
    if (!newTechName || !newTechEmail) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Name and email are required.',
      });
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase
        .from('employees')
        .insert([{
          name: newTechName,
          email: newTechEmail,
          phone: newTechPhone || null,
          role: 'technician',
          status: 'available',
        }]);

      if (error) throw error;

      toast({
        title: 'Technician Added',
        description: `${newTechName} has been added to the team.`,
      });

      setDialogOpen(false);
      setNewTechName('');
      setNewTechEmail('');
      setNewTechPhone('');
      fetchTechnicians();
    } catch (error: any) {
      console.error('Error creating technician:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to add technician.',
      });
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      available: { label: 'Available', className: 'bg-emerald-100 text-emerald-800' },
      on_job: { label: 'On Job', className: 'bg-blue-100 text-blue-800' },
      locked: { label: 'Locked', className: 'bg-red-100 text-red-800' },
      off_duty: { label: 'Off Duty', className: 'bg-gray-100 text-gray-800' },
    };
    const config = statusConfig[status] || { label: status, className: '' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredTechnicians = technicians.filter(tech =>
    tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tech.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Technicians</h1>
            <p className="text-muted-foreground">
              Manage your field service technicians
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Technician
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Technician</DialogTitle>
                <DialogDescription>
                  Enter the details for the new technician.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={newTechName}
                    onChange={(e) => setNewTechName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    value={newTechEmail}
                    onChange={(e) => setNewTechEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+62 812 3456 7890"
                    value={newTechPhone}
                    onChange={(e) => setNewTechPhone(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTechnician} disabled={creating}>
                  {creating ? 'Adding...' : 'Add Technician'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search technicians..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={fetchTechnicians}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Technicians Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredTechnicians.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium">No technicians found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add your first technician to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Technician</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Jobs Completed</TableHead>
                      <TableHead>Skills</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTechnicians.map((tech) => (
                      <TableRow key={tech.id} className="table-row-hover">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={tech.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {getInitials(tech.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{tech.name}</p>
                              <p className="text-sm text-muted-foreground">{tech.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {tech.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {tech.phone}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              {tech.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(tech.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="font-medium">{tech.rating.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{tech.total_jobs_completed}</span>
                          <span className="text-muted-foreground"> jobs</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {tech.skills.length > 0 ? (
                              tech.skills.slice(0, 3).map((skill, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {skill}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm italic">No skills</span>
                            )}
                            {tech.skills.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{tech.skills.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTechnician(tech);
                                setAvailabilityDialogOpen(true);
                              }}
                              title="Manage Availability"
                            >
                              <Clock className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTechnician(tech);
                                setSkillsDialogOpen(true);
                              }}
                              title="Manage Skills"
                            >
                              <Settings className="h-4 w-4" />
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

        {/* Skills Management Dialog */}
        {selectedTechnician && (
          <SkillsManagementDialog
            open={skillsDialogOpen}
            onOpenChange={setSkillsDialogOpen}
            technicianId={selectedTechnician.id}
            technicianName={selectedTechnician.name}
            onSkillsUpdated={fetchTechnicians}
          />
        )}

        {/* Availability Management Dialog */}
        {selectedTechnician && (
          <AvailabilityManagementDialog
            open={availabilityDialogOpen}
            onOpenChange={setAvailabilityDialogOpen}
            technicianId={selectedTechnician.id}
            technicianName={selectedTechnician.name}
            onAvailabilityUpdated={fetchTechnicians}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
