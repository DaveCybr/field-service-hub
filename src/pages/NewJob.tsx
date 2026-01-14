import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';
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
}

export default function NewJob() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
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

  const fetchTechnicians = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name, status')
      .eq('role', 'technician')
      .order('name');
    if (data) setTechnicians(data);
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
                <CardDescription>Assign technician and schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="technician">Assign Technician</Label>
                  <Select value={technicianId} onValueChange={setTechnicianId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select technician (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                          <span className={`ml-2 text-xs ${
                            tech.status === 'available' ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            ({tech.status})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
      </div>
    </DashboardLayout>
  );
}
