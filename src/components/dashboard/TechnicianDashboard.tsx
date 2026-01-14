import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calendar,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';

interface TechnicianStats {
  assignedJobs: number;
  inProgress: number;
  completedToday: number;
  upcomingJobs: number;
}

interface TechnicianJob {
  id: string;
  job_number: string;
  title: string;
  status: string;
  priority: string;
  customer_name: string;
  service_address: string | null;
  scheduled_date: string | null;
}

export default function TechnicianDashboard() {
  const { employee } = useAuth();
  const [stats, setStats] = useState<TechnicianStats>({
    assignedJobs: 0,
    inProgress: 0,
    completedToday: 0,
    upcomingJobs: 0,
  });
  const [myJobs, setMyJobs] = useState<TechnicianJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employee?.id) {
      fetchTechnicianData();
    }
  }, [employee?.id]);

  const fetchTechnicianData = async () => {
    if (!employee?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch assigned jobs (not completed)
      const { count: assignedCount } = await supabase
        .from('service_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_technician_id', employee.id)
        .not('status', 'in', '("completed","completed_paid","cancelled")');

      // Fetch in progress
      const { count: progressCount } = await supabase
        .from('service_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_technician_id', employee.id)
        .eq('status', 'in_progress');

      // Fetch completed today
      const { count: completedCount } = await supabase
        .from('service_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_technician_id', employee.id)
        .in('status', ['completed', 'completed_paid'])
        .gte('updated_at', `${today}T00:00:00`);

      // Fetch upcoming jobs (scheduled for future)
      const { count: upcomingCount } = await supabase
        .from('service_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_technician_id', employee.id)
        .eq('status', 'approved')
        .gte('scheduled_date', today);

      setStats({
        assignedJobs: assignedCount || 0,
        inProgress: progressCount || 0,
        completedToday: completedCount || 0,
        upcomingJobs: upcomingCount || 0,
      });

      // Fetch my active jobs
      const { data: jobs } = await supabase
        .from('service_jobs')
        .select(`
          id,
          job_number,
          title,
          status,
          priority,
          service_address,
          scheduled_date,
          customers (name)
        `)
        .eq('assigned_technician_id', employee.id)
        .not('status', 'in', '("completed","completed_paid","cancelled")')
        .order('scheduled_date', { ascending: true })
        .limit(10);

      if (jobs) {
        setMyJobs(jobs.map(job => ({
          id: job.id,
          job_number: job.job_number,
          title: job.title,
          status: job.status,
          priority: job.priority,
          customer_name: (job.customers as any)?.name || 'Unknown',
          service_address: job.service_address,
          scheduled_date: job.scheduled_date,
        })));
      }
    } catch (error) {
      console.error('Error fetching technician data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending_assignment: { label: 'Pending', className: 'badge-status-pending' },
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

  const statCards = [
    {
      title: 'Assigned Jobs',
      value: stats.assignedJobs,
      icon: Wrench,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Completed Today',
      value: stats.completedToday,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Upcoming',
      value: stats.upcomingJobs,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome, {employee?.name?.split(' ')[0] || 'Technician'}!
          </h1>
          <p className="text-muted-foreground">
            Here are your assigned service jobs for today.
          </p>
        </div>
        <Button asChild>
          <Link to="/jobs">
            <Wrench className="mr-2 h-4 w-4" />
            View My Jobs
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="stats-card">
            <div className="stats-card-gradient" />
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`rounded-lg p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">My Active Jobs</CardTitle>
            <CardDescription>Jobs assigned to you that need attention</CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link to="/jobs">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : myJobs.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h3 className="mt-4 text-lg font-medium">No active jobs</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You don't have any assigned jobs at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myJobs.map((job) => (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm text-muted-foreground">
                        {job.job_number}
                      </span>
                      {getPriorityBadge(job.priority)}
                      {getStatusBadge(job.status)}
                    </div>
                    <p className="font-medium mt-1 truncate">{job.title}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{job.customer_name}</span>
                      {job.scheduled_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(job.scheduled_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                    {job.service_address && (
                      <p className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{job.service_address}</span>
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground ml-4" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
