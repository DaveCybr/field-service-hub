import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTechnicianAvailability } from '@/hooks/useTechnicianAvailability';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Wand2, Star, CheckCircle, User, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

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

interface Technician {
  id: string;
  name: string;
  status: string;
  isAvailable?: boolean;
  availabilityReason?: string;
  workingHours?: string;
}

interface TechnicianRecommendation {
  id: string;
  name: string;
  status: string;
  score: number;
  skillsMatch: number;
  availabilityScore: number;
  workloadScore: number;
  skills: string[];
}

export default function NewJob() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { toast } = useToast();
  const { getAvailableTechniciansForDate, loading: availabilityLoading } = useTechnicianAvailability();
  const [loading, setLoading] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<TechnicianRecommendation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  const [customerId, setCustomerId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [scheduledDate, setScheduledDate] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('60');
  const [serviceAddress, setServiceAddress] = useState('');
  const [serviceCost, setServiceCost] = useState('');
  const [requiredSkills, setRequiredSkills] = useState('');

  useEffect(() => {
    fetchCustomers();
    fetchTechnicians();
  }, []);

  useEffect(() => {
    if (customerId) {
      fetchUnits(customerId);
      // Auto-fill service address from customer
      const customer = customers.find(c => c.id === customerId);
      if (customer?.address) {
        setServiceAddress(customer.address);
      }
    } else {
      setUnits([]);
      setUnitId('');
    }
  }, [customerId, customers]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, address')
      .eq('blacklisted', false)
      .order('name');
    if (data) setCustomers(data);
  };

  const fetchUnits = async (custId: string) => {
    const { data } = await supabase
      .from('units')
      .select('id, qr_code, unit_type, brand, model')
      .eq('customer_id', custId)
      .order('unit_type');
    if (data) setUnits(data);
  };

  const fetchTechnicians = async (forDate?: Date) => {
    if (forDate) {
      const availableTechs = await getAvailableTechniciansForDate(forDate);
      setTechnicians(availableTechs);
    } else {
      const { data } = await supabase
        .from('employees')
        .select('id, name, status')
        .eq('role', 'technician')
        .order('name');
      if (data) setTechnicians(data.map(t => ({ ...t, isAvailable: true })));
    }
  };

  // Update technicians when scheduled date changes
  useEffect(() => {
    if (scheduledDate) {
      fetchTechnicians(new Date(scheduledDate));
    } else {
      fetchTechnicians();
    }
  }, [scheduledDate]);

  const handleAutoAssign = async () => {
    setAutoAssigning(true);
    try {
      const skills = requiredSkills.split(',').map(s => s.trim()).filter(Boolean);
      
      const { data, error } = await supabase.functions.invoke('auto-assign-technician', {
        body: {
          requiredSkills: skills,
          priority,
        },
      });

      if (error) throw error;

      if (data.success && data.recommendations?.length > 0) {
        setRecommendations(data.recommendations);
        setShowRecommendations(true);
      } else {
        toast({
          variant: 'destructive',
          title: 'No technicians available',
          description: 'No eligible technicians found for this job.',
        });
      }
    } catch (error: any) {
      console.error('Auto-assign error:', error);
      toast({
        variant: 'destructive',
        title: 'Auto-assign failed',
        description: error.message || 'Failed to get recommendations.',
      });
    } finally {
      setAutoAssigning(false);
    }
  };

  const selectRecommendedTechnician = (techId: string) => {
    setTechnicianId(techId);
    setShowRecommendations(false);
    toast({
      title: 'Technician Selected',
      description: 'The recommended technician has been assigned.',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId || !title) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a customer and enter a job title.',
      });
      return;
    }

    setLoading(true);

    try {
      const jobData: any = {
        customer_id: customerId,
        unit_id: unitId || null,
        assigned_technician_id: technicianId || null,
        title,
        description,
        priority,
        scheduled_date: scheduledDate || null,
        estimated_duration_minutes: parseInt(estimatedDuration) || 60,
        service_address: serviceAddress,
        service_cost: parseFloat(serviceCost) || 0,
        status: technicianId ? 'pending_approval' : 'pending_assignment',
        created_by: employee?.id,
      };

      const { data, error } = await supabase
        .from('service_jobs')
        .insert([jobData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Job Created',
        description: `Service job ${data.job_number} has been created successfully.`,
      });

      navigate('/jobs');
    } catch (error: any) {
      console.error('Error creating job:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create job. Please try again.',
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
            <Link to="/jobs">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create New Service Job</h1>
            <p className="text-muted-foreground">
              Fill in the details to create a new service job
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Customer & Unit */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
                <CardDescription>Select the customer and their unit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} - {customer.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit (Optional)</Label>
                  <Select value={unitId} onValueChange={setUnitId} disabled={!customerId}>
                    <SelectTrigger>
                      <SelectValue placeholder={customerId ? "Select a unit" : "Select customer first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.unit_type} - {unit.brand} {unit.model} ({unit.qr_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Service Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter service location address"
                    value={serviceAddress}
                    onChange={(e) => setServiceAddress(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card>
              <CardHeader>
                <CardTitle>Job Details</CardTitle>
                <CardDescription>Describe the service required</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., AC Not Cooling"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the issue in detail..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
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
                    <Label htmlFor="duration">Est. Duration (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="15"
                      step="15"
                      value={estimatedDuration}
                      onChange={(e) => setEstimatedDuration(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Assignment</CardTitle>
                <CardDescription>Assign technician manually or use AI auto-assign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Required Skills for Auto-Assign */}
                <div className="space-y-2">
                  <Label htmlFor="skills">Required Skills (for auto-assign)</Label>
                  <Input
                    id="skills"
                    placeholder="e.g., AC Repair, Refrigeration, Electrical"
                    value={requiredSkills}
                    onChange={(e) => setRequiredSkills(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of skills needed for this job
                  </p>
                </div>

                {/* Auto-Assign Button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleAutoAssign}
                  disabled={autoAssigning}
                >
                  {autoAssigning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Finding best technician...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Auto-Assign Best Technician
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or select manually</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="technician">Assign Technician</Label>
                    {scheduledDate && availabilityLoading && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Checking availability...
                      </span>
                    )}
                  </div>
                  <Select value={technicianId} onValueChange={setTechnicianId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem 
                          key={tech.id} 
                          value={tech.id}
                          disabled={tech.isAvailable === false}
                        >
                          <div className="flex items-center gap-2">
                            <span>{tech.name}</span>
                            {scheduledDate && tech.isAvailable === false ? (
                              <Badge variant="outline" className="text-xs border-destructive text-destructive">
                                Unavailable
                              </Badge>
                            ) : scheduledDate && tech.workingHours ? (
                              <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-700">
                                <Clock className="h-3 w-3 mr-1" />
                                {tech.workingHours}
                              </Badge>
                            ) : (
                              <span className={`text-xs ${
                                tech.status === 'available' ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                ({tech.status})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {scheduledDate && technicians.some(t => t.isAvailable === false) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Some technicians are unavailable on the selected date
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled">Scheduled Date</Label>
                  <Input
                    id="scheduled"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing</CardTitle>
                <CardDescription>Set the estimated service cost</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Service Cost (Rp)</Label>
                  <Input
                    id="cost"
                    type="number"
                    min="0"
                    step="10000"
                    placeholder="0"
                    value={serviceCost}
                    onChange={(e) => setServiceCost(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link to="/jobs">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Job'
              )}
            </Button>
          </div>
        </form>

        {/* Auto-Assign Recommendations Dialog */}
        <Dialog open={showRecommendations} onOpenChange={setShowRecommendations}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Recommended Technicians
              </DialogTitle>
              <DialogDescription>
                Based on skills, availability, and workload analysis
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {recommendations.map((tech, index) => (
                <div
                  key={tech.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer hover:border-primary ${
                    index === 0 ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => selectRecommendedTechnician(tech.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center h-10 w-10 rounded-full ${
                        index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        {index === 0 ? <Star className="h-5 w-5" /> : <User className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{tech.name}</p>
                          {index === 0 && (
                            <Badge className="bg-primary/20 text-primary text-xs">Best Match</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={
                            tech.status === 'available' ? 'border-emerald-500 text-emerald-700' : 'border-amber-500 text-amber-700'
                          }>
                            {tech.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Score: {tech.score.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant={index === 0 ? 'default' : 'outline'}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Select
                    </Button>
                  </div>
                  
                  {/* Score Breakdown */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted text-center">
                      <p className="text-muted-foreground">Skills</p>
                      <p className="font-medium">{tech.skillsMatch.toFixed(1)}</p>
                    </div>
                    <div className="p-2 rounded bg-muted text-center">
                      <p className="text-muted-foreground">Availability</p>
                      <p className="font-medium">{tech.availabilityScore.toFixed(1)}</p>
                    </div>
                    <div className="p-2 rounded bg-muted text-center">
                      <p className="text-muted-foreground">Workload</p>
                      <p className="font-medium">{tech.workloadScore.toFixed(1)}</p>
                    </div>
                  </div>
                  
                  {/* Skills */}
                  {tech.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {tech.skills.slice(0, 5).map(skill => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {tech.skills.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{tech.skills.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
