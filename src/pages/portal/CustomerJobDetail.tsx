import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  Clock, 
  CheckCircle2, 
  Wrench, 
  Calendar,
  MapPin,
  User,
  Phone,
  FileText,
  Image,
} from 'lucide-react';
import { format } from 'date-fns';

interface JobDetail {
  id: string;
  job_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  scheduled_date: string | null;
  created_at: string;
  service_address: string | null;
  total_cost: number;
  service_cost: number;
  parts_cost: number;
  technician_notes: string | null;
  before_photos: string[];
  after_photos: string[];
  actual_checkin_at: string | null;
  actual_checkout_at: string | null;
  units: { 
    unit_type: string; 
    brand: string | null; 
    model: string | null;
    serial_number: string | null;
  } | null;
  employees: { name: string; phone: string | null } | null;
}

export default function CustomerJobDetail() {
  const { id } = useParams<{ id: string }>();
  const { customerName } = useCustomerAuth();
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobDetail | null>(null);

  useEffect(() => {
    if (id) {
      fetchJobDetail();
    }
  }, [id]);

  const fetchJobDetail = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_jobs')
        .select(`
          id, job_number, title, description, status, priority,
          scheduled_date, created_at, service_address, total_cost,
          service_cost, parts_cost, technician_notes,
          before_photos, after_photos,
          actual_checkin_at, actual_checkout_at,
          units (unit_type, brand, model, serial_number),
          employees!service_jobs_assigned_technician_id_fkey (name, phone)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error fetching job:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any; description: string }> = {
      pending_assignment: { 
        label: 'Pending', 
        className: 'bg-amber-100 text-amber-800', 
        icon: Clock,
        description: 'We are assigning a technician to your job'
      },
      pending_approval: { 
        label: 'Awaiting Your Approval', 
        className: 'bg-orange-100 text-orange-800', 
        icon: Clock,
        description: 'Please review and approve the job details'
      },
      approved: { 
        label: 'Scheduled', 
        className: 'bg-sky-100 text-sky-800', 
        icon: Calendar,
        description: 'Your job is scheduled and will be completed soon'
      },
      in_progress: { 
        label: 'In Progress', 
        className: 'bg-blue-100 text-blue-800', 
        icon: Wrench,
        description: 'A technician is currently working on your job'
      },
      completed: { 
        label: 'Completed', 
        className: 'bg-emerald-100 text-emerald-800', 
        icon: CheckCircle2,
        description: 'Your service job has been completed'
      },
      completed_paid: { 
        label: 'Completed & Paid', 
        className: 'bg-emerald-100 text-emerald-800', 
        icon: CheckCircle2,
        description: 'Your service job has been completed and paid'
      },
      cancelled: { 
        label: 'Cancelled', 
        className: 'bg-gray-100 text-gray-800', 
        icon: Clock,
        description: 'This job was cancelled'
      },
    };
    return config[status] || { label: status, className: '', icon: Clock, description: '' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <CustomerLayout customerName={customerName || 'Customer'}>
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </CustomerLayout>
    );
  }

  if (!job) {
    return (
      <CustomerLayout customerName={customerName || 'Customer'}>
        <div className="text-center py-12">
          <h2 className="text-lg font-medium">Job not found</h2>
          <Button asChild className="mt-4">
            <Link to="/portal/jobs">Back to Jobs</Link>
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const statusConfig = getStatusConfig(job.status);
  const StatusIcon = statusConfig.icon;

  return (
    <CustomerLayout customerName={customerName || 'Customer'}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/portal/jobs">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
              <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
            </div>
            <p className="text-muted-foreground mt-1">{job.job_number}</p>
          </div>
        </div>

        {/* Status Card */}
        <Card className={`border-l-4 ${job.status === 'in_progress' ? 'border-l-blue-500' : job.status.includes('completed') ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${statusConfig.className}`}>
                <StatusIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">{statusConfig.label}</p>
                <p className="text-sm text-muted-foreground">{statusConfig.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {job.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="mt-1">{job.description}</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(job.created_at), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Scheduled</p>
                  <p className="font-medium">
                    {job.scheduled_date 
                      ? format(new Date(job.scheduled_date), 'MMM d, yyyy')
                      : 'Not yet scheduled'}
                  </p>
                </div>
              </div>

              {job.service_address && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Service Address</p>
                      <p className="mt-1">{job.service_address}</p>
                    </div>
                  </div>
                </>
              )}

              {job.units && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Unit</p>
                      <p className="font-medium mt-1">
                        {job.units.unit_type} {job.units.brand && `- ${job.units.brand}`} {job.units.model}
                      </p>
                      {job.units.serial_number && (
                        <p className="text-sm text-muted-foreground">S/N: {job.units.serial_number}</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Technician & Pricing */}
          <div className="space-y-6">
            {job.employees && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Assigned Technician
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{job.employees.name}</p>
                      {job.employees.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {job.employees.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Cost Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Cost</span>
                    <span>{formatCurrency(job.service_cost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parts Cost</span>
                    <span>{formatCurrency(job.parts_cost || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(job.total_cost || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Technician Notes */}
        {job.technician_notes && (
          <Card>
            <CardHeader>
              <CardTitle>Technician Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{job.technician_notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        {(job.before_photos?.length > 0 || job.after_photos?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Service Photos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {job.before_photos?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">Before Service</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {job.before_photos.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Before ${idx + 1}`}
                        className="rounded-lg aspect-square object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
              {job.after_photos?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-3">After Service</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {job.after_photos.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`After ${idx + 1}`}
                        className="rounded-lg aspect-square object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </CustomerLayout>
  );
}