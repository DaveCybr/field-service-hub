import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CashierDashboard from '@/components/dashboard/CashierDashboard';
import TechnicianDashboard from '@/components/dashboard/TechnicianDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  ArrowRight,
  Plus,
  TrendingUp,
} from 'lucide-react';

interface DashboardStats {
  totalJobsToday: number;
  pendingApprovals: number;
  inProgress: number;
  completedToday: number;
  availableTechnicians: number;
  totalTechnicians: number;
}

interface RecentJob {
  id: string;
  job_number: string;
  title: string;
  status: string;
  priority: string;
  customer_name: string;
  technician_name: string | null;
  created_at: string;
}

export default function Dashboard() {
  const { employee, userRole, isSuperadmin, isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalJobsToday: 0,
    pendingApprovals: 0,
    inProgress: 0,
    completedToday: 0,
    availableTechnicians: 0,
    totalTechnicians: 0,
  });
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  // Check role for conditional rendering
  const isCashier = userRole === 'cashier';
  const isTechnician = userRole === 'technician';
  const isManagerOrAbove = isSuperadmin || isAdmin || userRole === 'manager';

  useEffect(() => {
    // Only fetch admin dashboard data if user is manager or above
    if (isManagerOrAbove) {
      fetchDashboardData();
    } else {
      setLoading(false);
    }
  }, [isManagerOrAbove]);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch today's jobs count
      const { count: todayCount } = await supabase
        .from('service_jobs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      // Fetch pending approvals
      const { count: pendingCount } = await supabase
        .from('service_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval');

      // Fetch in progress
      const { count: progressCount } = await supabase
        .from('service_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'in_progress');

      // Fetch completed today
      const { count: completedCount } = await supabase
        .from('service_jobs')
        .select('*', { count: 'exact', head: true })
        .in('status', ['completed', 'completed_paid'])
        .gte('updated_at', `${today}T00:00:00`);

      // Fetch technician counts
      const { data: technicians } = await supabase
        .from('employees')
        .select('id, status')
        .eq('role', 'technician');

      const availableTechs = technicians?.filter(t => t.status === 'available').length || 0;
      const totalTechs = technicians?.length || 0;

      setStats({
        totalJobsToday: todayCount || 0,
        pendingApprovals: pendingCount || 0,
        inProgress: progressCount || 0,
        completedToday: completedCount || 0,
        availableTechnicians: availableTechs,
        totalTechnicians: totalTechs,
      });

      // Fetch recent jobs with customer and technician info
      const { data: jobs } = await supabase
        .from('service_jobs')
        .select(`
          id,
          job_number,
          title,
          status,
          priority,
          created_at,
          customers (name),
          employees (name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (jobs) {
        setRecentJobs(jobs.map(job => ({
          id: job.id,
          job_number: job.job_number,
          title: job.title,
          status: job.status,
          priority: job.priority,
          customer_name: (job.customers as any)?.name || 'Unknown',
          technician_name: (job.employees as any)?.name || null,
          created_at: job.created_at,
        })));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
      title: 'Jobs Today',
      value: stats.totalJobsToday,
      icon: Wrench,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Pending Approval',
      value: stats.pendingApprovals,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: TrendingUp,
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
  ];

  // Render role-specific dashboard
  if (isCashier) {
    return (
      <DashboardLayout>
        <CashierDashboard />
      </DashboardLayout>
    );
  }

  if (isTechnician) {
    return (
      <DashboardLayout>
        <TechnicianDashboard />
      </DashboardLayout>
    );
  }

  // Admin/Manager Dashboard
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {employee?.name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-muted-foreground">
              Here's what's happening with your service operations today.
            </p>
          </div>
          <Button asChild>
            <Link to="/jobs/new">
              <Plus className="mr-2 h-4 w-4" />
              New Service Job
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

        {/* Technicians Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Technician Availability</CardTitle>
              <CardDescription>
                {stats.availableTechnicians} of {stats.totalTechnicians} technicians available
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link to="/technicians">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ 
                    width: stats.totalTechnicians > 0 
                      ? `${(stats.availableTechnicians / stats.totalTechnicians) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                {stats.totalTechnicians > 0 
                  ? Math.round((stats.availableTechnicians / stats.totalTechnicians) * 100) 
                  : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Service Jobs</CardTitle>
              <CardDescription>Latest jobs created in the system</CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link to="/jobs">
                View All Jobs
                <ArrowRight className="ml-2 h-4 w-4" />
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
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No jobs yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Get started by creating your first service job.
                </p>
                <Button asChild className="mt-4">
                  <Link to="/jobs/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Job
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-muted-foreground">
                          {job.job_number}
                        </span>
                        {getPriorityBadge(job.priority)}
                      </div>
                      <p className="font-medium mt-1 truncate">{job.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {job.customer_name}
                        {job.technician_name && ` • Assigned to ${job.technician_name}`}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {getStatusBadge(job.status)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
