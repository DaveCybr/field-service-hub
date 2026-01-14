import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import JobPhotoGallery from '@/components/jobs/JobPhotoGallery';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Wrench,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Image,
  Package,
  ClipboardList,
  Navigation,
  Timer,
  FileText,
  Play,
  Pause,
  Camera,
  Plus,
  X,
} from 'lucide-react';

type JobStatus = 'pending_assignment' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'completed_paid' | 'cancelled';
type PaymentStatus = 'pending' | 'paid' | 'partial' | 'overdue';

interface JobDetails {
  id: string;
  job_number: string;
  title: string;
  description: string | null;
  status: JobStatus;
  priority: string;
  scheduled_date: string | null;
  service_address: string | null;
  service_latitude: number | null;
  service_longitude: number | null;
  estimated_duration_minutes: number | null;
  actual_duration_minutes: number | null;
  actual_checkin_at: string | null;
  actual_checkout_at: string | null;
  checkin_gps_valid: boolean | null;
  checkout_gps_valid: boolean | null;
  gps_violation_detected: boolean | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  technician_notes: string | null;
  admin_notes: string | null;
  service_cost: number | null;
  parts_cost: number | null;
  total_cost: number | null;
  payment_status: PaymentStatus | null;
  flagged: boolean | null;
  created_at: string;
  updated_at: string;
  customer: {
    id: string;
    name: string;
    phone: string;
    address: string | null;
    email: string | null;
  };
  technician: {
    id: string;
    name: string;
    phone: string | null;
    email: string;
  } | null;
  unit: {
    id: string;
    qr_code: string;
    unit_type: string;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
  } | null;
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'created' | 'assigned' | 'approved' | 'checkin' | 'checkout' | 'completed' | 'paid' | 'cancelled' | 'note';
  title: string;
  description?: string;
  icon: React.ReactNode;
  color: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  sell_price: number;
  stock: number;
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  
  // Parts dialog state
  const [partsDialogOpen, setPartsDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');
  const [usedParts, setUsedParts] = useState<{ product: Product; quantity: number }[]>([]);
  
  // Notes dialog state
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    if (id) {
      fetchJob();
      fetchProducts();
    }
  }, [id]);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_jobs')
        .select(`
          *,
          customers (id, name, phone, address, email),
          employees!service_jobs_assigned_technician_id_fkey (id, name, phone, email),
          units (id, qr_code, unit_type, brand, model, serial_number)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setJob({
        ...data,
        customer: data.customers as JobDetails['customer'],
        technician: data.employees as JobDetails['technician'],
        unit: data.units as JobDetails['unit'],
      });
      setAdminNotes(data.admin_notes || '');
    } catch (error) {
      console.error('Error fetching job:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load job details.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, sku, sell_price, stock')
      .eq('is_active', true)
      .gt('stock', 0)
      .order('name');
    if (data) setProducts(data);
  };

  const updateJobStatus = async (newStatus: JobStatus) => {
    if (!job) return;
    setUpdating(true);
    try {
      const updates: any = { status: newStatus };
      
      if (newStatus === 'in_progress' && !job.actual_checkin_at) {
        updates.actual_checkin_at = new Date().toISOString();
      }
      if (newStatus === 'completed' && !job.actual_checkout_at) {
        updates.actual_checkout_at = new Date().toISOString();
        if (job.actual_checkin_at) {
          const checkin = new Date(job.actual_checkin_at);
          const checkout = new Date();
          updates.actual_duration_minutes = Math.round((checkout.getTime() - checkin.getTime()) / 60000);
        }
      }

      const { error } = await supabase
        .from('service_jobs')
        .update(updates)
        .eq('id', job.id);

      if (error) throw error;

      toast({
        title: 'Status Updated',
        description: `Job status changed to ${newStatus.replace(/_/g, ' ')}.`,
      });
      fetchJob();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update job status.',
      });
    } finally {
      setUpdating(false);
    }
  };

  const saveAdminNotes = async () => {
    if (!job) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('service_jobs')
        .update({ admin_notes: adminNotes })
        .eq('id', job.id);

      if (error) throw error;

      toast({
        title: 'Notes Saved',
        description: 'Admin notes have been updated.',
      });
      setNotesDialogOpen(false);
      fetchJob();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save notes.',
      });
    } finally {
      setUpdating(false);
    }
  };

  const addPart = () => {
    const product = products.find(p => p.id === selectedProduct);
    if (product && partQuantity) {
      setUsedParts(prev => [...prev, { product, quantity: parseInt(partQuantity) }]);
      setSelectedProduct('');
      setPartQuantity('1');
    }
  };

  const removePart = (index: number) => {
    setUsedParts(prev => prev.filter((_, i) => i !== index));
  };

  const calculatePartsTotal = () => {
    return usedParts.reduce((sum, item) => sum + (item.product.sell_price * item.quantity), 0);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending_assignment: { label: 'Pending Assignment', className: 'badge-status-pending' },
      pending_approval: { label: 'Needs Approval', className: 'badge-status-pending' },
      approved: { label: 'Approved', className: 'badge-status-approved' },
      in_progress: { label: 'In Progress', className: 'badge-status-progress' },
      completed: { label: 'Completed', className: 'badge-status-completed' },
      completed_paid: { label: 'Paid', className: 'badge-status-completed' },
      cancelled: { label: 'Cancelled', className: 'badge-status-cancelled' },
    };
    const config = statusConfig[status] || { label: status, className: '' };
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      low: { label: 'Low', className: 'badge-priority-low' },
      normal: { label: 'Normal', className: 'badge-priority-normal' },
      high: { label: 'High', className: 'badge-priority-high' },
      urgent: { label: 'Urgent', className: 'badge-priority-urgent' },
    };
    const config = priorityConfig[priority] || { label: priority, className: '' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPaymentBadge = (status: PaymentStatus | null) => {
    if (!status) return null;
    const config: Record<PaymentStatus, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
      paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800' },
      partial: { label: 'Partial', className: 'bg-blue-100 text-blue-800' },
      overdue: { label: 'Overdue', className: 'bg-red-100 text-red-800' },
    };
    const { label, className } = config[status];
    return <Badge className={className}>{label}</Badge>;
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const buildTimeline = (): TimelineEvent[] => {
    if (!job) return [];
    
    const events: TimelineEvent[] = [];
    
    // Job created
    events.push({
      id: 'created',
      timestamp: job.created_at,
      type: 'created',
      title: 'Job Created',
      description: `Service request "${job.title}" was created`,
      icon: <ClipboardList className="h-4 w-4" />,
      color: 'bg-blue-500',
    });

    // Technician assigned
    if (job.technician) {
      events.push({
        id: 'assigned',
        timestamp: job.created_at, // Would need separate timestamp in real scenario
        type: 'assigned',
        title: 'Technician Assigned',
        description: `${job.technician.name} was assigned to this job`,
        icon: <User className="h-4 w-4" />,
        color: 'bg-purple-500',
      });
    }

    // Approved
    if (['approved', 'in_progress', 'completed', 'completed_paid'].includes(job.status)) {
      events.push({
        id: 'approved',
        timestamp: job.updated_at,
        type: 'approved',
        title: 'Job Approved',
        description: 'Job was approved for execution',
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'bg-sky-500',
      });
    }

    // Check-in
    if (job.actual_checkin_at) {
      events.push({
        id: 'checkin',
        timestamp: job.actual_checkin_at,
        type: 'checkin',
        title: 'Technician Checked In',
        description: job.checkin_gps_valid 
          ? 'GPS location verified at service address' 
          : 'GPS location could not be verified',
        icon: <Navigation className="h-4 w-4" />,
        color: job.checkin_gps_valid ? 'bg-emerald-500' : 'bg-amber-500',
      });
    }

    // Check-out / Completed
    if (job.actual_checkout_at) {
      events.push({
        id: 'checkout',
        timestamp: job.actual_checkout_at,
        type: 'checkout',
        title: 'Job Completed',
        description: `Duration: ${job.actual_duration_minutes} minutes`,
        icon: <CheckCircle className="h-4 w-4" />,
        color: 'bg-emerald-500',
      });
    }

    // Payment
    if (job.status === 'completed_paid') {
      events.push({
        id: 'paid',
        timestamp: job.updated_at,
        type: 'paid',
        title: 'Payment Received',
        description: formatCurrency(job.total_cost),
        icon: <DollarSign className="h-4 w-4" />,
        color: 'bg-emerald-600',
      });
    }

    // Cancelled
    if (job.status === 'cancelled') {
      events.push({
        id: 'cancelled',
        timestamp: job.updated_at,
        type: 'cancelled',
        title: 'Job Cancelled',
        icon: <XCircle className="h-4 w-4" />,
        color: 'bg-gray-500',
      });
    }

    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };


  const getNextActions = (): { label: string; status: JobStatus; variant: 'default' | 'outline' | 'destructive' }[] => {
    if (!job) return [];
    
    switch (job.status) {
      case 'pending_approval':
        return [
          { label: 'Approve', status: 'approved', variant: 'default' },
          { label: 'Reject', status: 'cancelled', variant: 'destructive' },
        ];
      case 'approved':
        return [
          { label: 'Start Job', status: 'in_progress', variant: 'default' },
        ];
      case 'in_progress':
        return [
          { label: 'Complete Job', status: 'completed', variant: 'default' },
        ];
      case 'completed':
        return [
          { label: 'Mark as Paid', status: 'completed_paid', variant: 'default' },
        ];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="text-center py-24">
          <h2 className="text-lg font-medium">Job not found</h2>
          <Button asChild className="mt-4">
            <Link to="/jobs">Back to Jobs</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const timeline = buildTimeline();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/jobs">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{job.job_number}</h1>
                {getStatusBadge(job.status)}
                {getPriorityBadge(job.priority)}
                {job.flagged && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Flagged
                  </Badge>
                )}
              </div>
              <p className="text-lg text-muted-foreground mt-1">{job.title}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {getNextActions().map((action) => (
              <Button 
                key={action.status}
                variant={action.variant}
                onClick={() => updateJobStatus(action.status)}
                disabled={updating}
              >
                {action.label}
              </Button>
            ))}
            <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Notes
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Admin Notes</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={6}
                      placeholder="Add internal notes about this job..."
                    />
                  </div>
                  <Button onClick={saveAdminNotes} disabled={updating} className="w-full">
                    Save Notes
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="parts">Parts</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Description */}
                {job.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {job.description}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Schedule & Duration */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Schedule & Duration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Scheduled Date</p>
                          <p className="text-sm text-muted-foreground">
                            {job.scheduled_date 
                              ? format(new Date(job.scheduled_date), 'PPP')
                              : 'Not scheduled'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Timer className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Estimated Duration</p>
                          <p className="text-sm text-muted-foreground">
                            {job.estimated_duration_minutes 
                              ? `${job.estimated_duration_minutes} minutes`
                              : 'Not set'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {job.actual_checkin_at && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                            <Play className="h-5 w-5 text-emerald-600" />
                            <div>
                              <p className="text-sm font-medium">Check-in Time</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(job.actual_checkin_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                          {job.actual_checkout_at && (
                            <div className="flex items-center gap-3">
                              <Pause className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="text-sm font-medium">Check-out Time</p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(job.actual_checkout_at), 'PPp')}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        {job.actual_duration_minutes && (
                          <div className="rounded-lg bg-muted p-3">
                            <p className="text-sm">
                              <span className="font-medium">Actual Duration:</span>{' '}
                              {job.actual_duration_minutes} minutes
                              {job.estimated_duration_minutes && (
                                <span className={job.actual_duration_minutes > job.estimated_duration_minutes 
                                  ? 'text-amber-600 ml-2' 
                                  : 'text-emerald-600 ml-2'}>
                                  ({job.actual_duration_minutes > job.estimated_duration_minutes ? '+' : ''}
                                  {job.actual_duration_minutes - job.estimated_duration_minutes} min from estimate)
                                </span>
                              )}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* GPS Validation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Navigation className="h-5 w-5" />
                      GPS Validation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Check-in GPS</span>
                        {job.checkin_gps_valid === null ? (
                          <Badge variant="outline">Not recorded</Badge>
                        ) : job.checkin_gps_valid ? (
                          <Badge className="bg-emerald-100 text-emerald-800">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="mr-1 h-3 w-3" />
                            Invalid
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Check-out GPS</span>
                        {job.checkout_gps_valid === null ? (
                          <Badge variant="outline">Not recorded</Badge>
                        ) : job.checkout_gps_valid ? (
                          <Badge className="bg-emerald-100 text-emerald-800">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Valid
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">
                            <XCircle className="mr-1 h-3 w-3" />
                            Invalid
                          </Badge>
                        )}
                      </div>
                      {job.gps_violation_detected && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 mt-2">
                          <div className="flex items-center gap-2 text-red-800">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm font-medium">GPS Violation Detected</span>
                          </div>
                          <p className="text-xs text-red-600 mt-1">
                            Location did not match the service address during check-in or check-out.
                          </p>
                        </div>
                      )}
                      {job.service_latitude && job.service_longitude && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Coordinates: {job.service_latitude.toFixed(6)}, {job.service_longitude.toFixed(6)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Technician Notes */}
                {job.technician_notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Technician Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {job.technician_notes}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Admin Notes */}
                {job.admin_notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Admin Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {job.admin_notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Job Timeline</CardTitle>
                    <CardDescription>Complete history of this service job</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      {timeline.map((event, index) => (
                        <div key={event.id} className="flex gap-4 pb-8 last:pb-0">
                          {/* Timeline line */}
                          <div className="flex flex-col items-center">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${event.color}`}>
                              {event.icon}
                            </div>
                            {index < timeline.length - 1 && (
                              <div className="w-0.5 flex-1 bg-border mt-2" />
                            )}
                          </div>
                          {/* Content */}
                          <div className="flex-1 pt-1">
                            <p className="font-medium">{event.title}</p>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {event.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(event.timestamp), 'PPp')}
                              <span className="mx-1">·</span>
                              {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Photos Tab */}
              <TabsContent value="photos">
                <JobPhotoGallery
                  jobId={job.id}
                  beforePhotos={job.before_photos || []}
                  afterPhotos={job.after_photos || []}
                  onPhotosUpdated={fetchJob}
                />
              </TabsContent>

              {/* Parts Tab */}
              <TabsContent value="parts">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Parts Used
                      </CardTitle>
                      <CardDescription>Parts and materials used for this job</CardDescription>
                    </div>
                    <Dialog open={partsDialogOpen} onOpenChange={setPartsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Part
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Part</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Product</Label>
                            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.sku}) - {formatCurrency(product.sell_price)}
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
                              value={partQuantity}
                              onChange={(e) => setPartQuantity(e.target.value)}
                            />
                          </div>
                          <Button onClick={addPart} disabled={!selectedProduct} className="w-full">
                            Add to List
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {usedParts.length > 0 ? (
                      <div className="space-y-3">
                        {usedParts.map((item, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatCurrency(item.product.sell_price)} × {item.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">
                                {formatCurrency(item.product.sell_price * item.quantity)}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removePart(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Separator />
                        <div className="flex items-center justify-between pt-2">
                          <span className="font-medium">Total Parts Cost</span>
                          <span className="text-lg font-bold">{formatCurrency(calculatePartsTotal())}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="mt-2 text-sm text-muted-foreground">No parts recorded for this job</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{job.customer.name}</p>
                    {job.customer.email && (
                      <p className="text-sm text-muted-foreground">{job.customer.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <a 
                    href={`tel:${job.customer.phone}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {job.customer.phone}
                  </a>
                </div>
                {job.service_address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">{job.service_address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Technician Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Technician</CardTitle>
              </CardHeader>
              <CardContent>
                {job.technician ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Wrench className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{job.technician.name}</p>
                        <p className="text-sm text-muted-foreground">{job.technician.email}</p>
                      </div>
                    </div>
                    {job.technician.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <a 
                          href={`tel:${job.technician.phone}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {job.technician.phone}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No technician assigned</p>
                )}
              </CardContent>
            </Card>

            {/* Unit Info */}
            {job.unit && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Unit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span className="text-sm font-medium">{job.unit.unit_type}</span>
                  </div>
                  {job.unit.brand && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Brand</span>
                      <span className="text-sm font-medium">{job.unit.brand}</span>
                    </div>
                  )}
                  {job.unit.model && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Model</span>
                      <span className="text-sm font-medium">{job.unit.model}</span>
                    </div>
                  )}
                  {job.unit.serial_number && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Serial</span>
                      <span className="text-sm font-mono">{job.unit.serial_number}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">QR Code</span>
                    <span className="text-sm font-mono">{job.unit.qr_code}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Pricing</span>
                  {getPaymentBadge(job.payment_status)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Service Cost</span>
                  <span className="text-sm font-medium">{formatCurrency(job.service_cost)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Parts Cost</span>
                  <span className="text-sm font-medium">{formatCurrency(job.parts_cost)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(job.total_cost)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Meta Info */}
            <Card>
              <CardContent className="pt-6 space-y-2 text-sm">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Created</span>
                  <span>{format(new Date(job.created_at), 'PP')}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Last Updated</span>
                  <span>{formatDistanceToNow(new Date(job.updated_at), { addSuffix: true })}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
