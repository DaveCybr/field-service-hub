import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  Wrench, 
  Calendar,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';

interface Job {
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
  units: { unit_type: string; brand: string | null; model: string | null } | null;
}

export default function CustomerJobs() {
  const { customerName, customerId } = useCustomerAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (customerId) {
      fetchJobs();
    }
  }, [customerId]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_jobs')
        .select(`
          id, job_number, title, description, status, priority,
          scheduled_date, created_at, service_address, total_cost,
          units (unit_type, brand, model)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      pending_assignment: { label: 'Pending', className: 'bg-amber-100 text-amber-800', icon: Clock },
      pending_approval: { label: 'Awaiting Approval', className: 'bg-orange-100 text-orange-800', icon: Clock },
      approved: { label: 'Scheduled', className: 'bg-sky-100 text-sky-800', icon: Calendar },
      in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800', icon: Wrench },
      completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
      completed_paid: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
      cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-800', icon: Clock },
    };
    return config[status] || { label: status, className: '', icon: Clock };
  };

  const activeStatuses = ['pending_assignment', 'pending_approval', 'approved', 'in_progress'];
  const activeJobs = jobs.filter(j => activeStatuses.includes(j.status));
  const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'completed_paid' || j.status === 'cancelled');

  const renderJobCard = (job: Job) => {
    const statusConfig = getStatusConfig(job.status);
    const StatusIcon = statusConfig.icon;

    return (
      <Link
        key={job.id}
        to={`/portal/jobs/${job.id}`}
        className="block"
      >
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className={`h-12 w-12 rounded-full flex-shrink-0 flex items-center justify-center ${statusConfig.className}`}>
                  <StatusIcon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{job.title}</h3>
                    <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {job.job_number}
                  </p>
                  {job.units && (
                    <p className="text-sm text-muted-foreground">
                      {job.units.unit_type} {job.units.brand && `- ${job.units.brand}`} {job.units.model}
                    </p>
                  )}
                  {job.service_address && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {job.service_address}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {job.scheduled_date 
                        ? format(new Date(job.scheduled_date), 'MMM d, yyyy')
                        : 'Not scheduled'}
                    </span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  return (
    <CustomerLayout customerName={customerName || 'Customer'}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Jobs</h1>
          <p className="text-muted-foreground">
            Track and manage your service requests
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Active ({activeJobs.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              History ({completedJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : activeJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium">No active jobs</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    You don't have any active service requests
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {activeJobs.map(renderJobCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : completedJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="font-medium">No service history</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Completed jobs will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedJobs.map(renderJobCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </CustomerLayout>
  );
}