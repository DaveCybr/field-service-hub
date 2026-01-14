import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  Wrench, 
  Calendar,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { format } from 'date-fns';

interface Job {
  id: string;
  job_number: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  created_at: string;
}

interface Stats {
  activeJobs: number;
  completedJobs: number;
  totalUnits: number;
  pendingApproval: number;
}

export default function CustomerDashboard() {
  const { customerName, customerId } = useCustomerAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ activeJobs: 0, completedJobs: 0, totalUnits: 0, pendingApproval: 0 });
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (customerId) {
      fetchDashboardData();
    }
  }, [customerId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch jobs
      const { data: jobs } = await supabase
        .from('service_jobs')
        .select('id, job_number, title, status, scheduled_date, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Count units
      const { count: unitsCount } = await supabase
        .from('units')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customerId);

      // Calculate stats
      const allJobs = jobs || [];
      const activeStatuses = ['pending_assignment', 'pending_approval', 'approved', 'in_progress'];
      const activeJobs = allJobs.filter(j => activeStatuses.includes(j.status)).length;
      const completedJobs = allJobs.filter(j => j.status === 'completed' || j.status === 'completed_paid').length;
      const pendingApproval = allJobs.filter(j => j.status === 'pending_approval').length;

      setStats({
        activeJobs,
        completedJobs,
        totalUnits: unitsCount || 0,
        pendingApproval,
      });

      setRecentJobs(jobs || []);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
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

  return (
    <CustomerLayout customerName={customerName || 'Customer'}>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {customerName?.split(' ')[0] || 'Customer'}!
          </h1>
          <p className="text-muted-foreground">
            Here's an overview of your service activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Jobs</p>
                  <p className="text-3xl font-bold">{stats.activeJobs}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Needs Approval</p>
                  <p className="text-3xl font-bold">{stats.pendingApproval}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed Jobs</p>
                  <p className="text-3xl font-bold">{stats.completedJobs}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Registered Units</p>
                  <p className="text-3xl font-bold">{stats.totalUnits}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Service Jobs</CardTitle>
              <CardDescription>Your latest service requests</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/portal/jobs">
                View All
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : recentJobs.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium">No service jobs yet</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your service requests will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((job) => {
                  const statusConfig = getStatusConfig(job.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <Link
                      key={job.id}
                      to={`/portal/jobs/${job.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${statusConfig.className}`}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{job.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {job.job_number} • {format(new Date(job.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}