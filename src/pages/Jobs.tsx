import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  CalendarDays,
  List,
  Map,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import JobCalendar from '@/components/jobs/JobCalendar';
import { JobsOverviewMap } from '@/components/jobs/JobsOverviewMap';

interface Job {
  id: string;
  job_number: string;
  title: string;
  status: string;
  priority: string;
  scheduled_date: string | null;
  customer_name: string;
  technician_name: string | null;
  total_cost: number;
  created_at: string;
}

export default function Jobs() {
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'map'>('list');
  const { toast } = useToast();
  const { userRole, isSuperadmin, isAdmin } = useAuth();

  // Check if user can create jobs (admin, manager, superadmin)
  const canCreateJobs = isSuperadmin || isAdmin || userRole === 'manager';
  
  // Check if user is cashier (limited view)
  const isCashier = userRole === 'cashier';
  
  // Check if user is technician (limited view)
  const isTechnician = userRole === 'technician';

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, priorityFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('service_jobs')
        .select(`
          id,
          job_number,
          title,
          status,
          priority,
          scheduled_date,
          total_cost,
          created_at,
          customers (name),
          employees!service_jobs_assigned_technician_id_fkey (name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'pending_assignment' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'completed_paid' | 'cancelled');
      }

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter as 'low' | 'normal' | 'high' | 'urgent');
      }

      const { data, error } = await query;

      if (error) throw error;

      setJobs(data?.map(job => ({
        id: job.id,
        job_number: job.job_number,
        title: job.title,
        status: job.status,
        priority: job.priority,
        scheduled_date: job.scheduled_date,
        customer_name: (job.customers as any)?.name || t('common.unknown'),
        technician_name: (job.employees as any)?.name || null,
        total_cost: job.total_cost || 0,
        created_at: job.created_at,
      })) || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('messages.loadFailed'),
      });
    } finally {
      setLoading(false);
    }
  };

  type JobStatus = 'pending_assignment' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'completed_paid' | 'cancelled';

  const updateJobStatus = async (jobId: string, newStatus: JobStatus) => {
    try {
      const { error } = await supabase
        .from('service_jobs')
        .update({ status: newStatus })
        .eq('id', jobId);

      if (error) throw error;

      toast({
        title: t('messages.statusUpdated'),
        description: t('messages.statusChangedTo', { status: t(`jobStatus.${newStatus}`) }),
      });

      fetchJobs();
    } catch (error) {
      console.error('Error updating job status:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('messages.failedToUpdateStatus'),
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { labelKey: string; className: string }> = {
      pending_assignment: { labelKey: 'jobStatus.pending', className: 'badge-status-pending' },
      pending_approval: { labelKey: 'jobStatus.needsApproval', className: 'badge-status-pending' },
      approved: { labelKey: 'jobStatus.approved', className: 'badge-status-approved' },
      in_progress: { labelKey: 'jobStatus.in_progress', className: 'badge-status-progress' },
      completed: { labelKey: 'jobStatus.completed', className: 'badge-status-completed' },
      completed_paid: { labelKey: 'jobStatus.paid', className: 'badge-status-completed' },
      cancelled: { labelKey: 'jobStatus.cancelled', className: 'badge-status-cancelled' },
    };
    const config = statusConfig[status] || { labelKey: status, className: '' };
    return <Badge variant="outline" className={config.className}>{t(config.labelKey)}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { labelKey: string; className: string }> = {
      low: { labelKey: 'jobPriority.low', className: 'badge-priority-low' },
      normal: { labelKey: 'jobPriority.normal', className: 'badge-priority-normal' },
      high: { labelKey: 'jobPriority.high', className: 'badge-priority-high' },
      urgent: { labelKey: 'jobPriority.urgent', className: 'badge-priority-urgent' },
    };
    const config = priorityConfig[priority] || { labelKey: priority, className: '' };
    return <Badge className={config.className}>{t(config.labelKey)}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredJobs = jobs.filter(job =>
    job.job_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isCashier ? t('jobs.paymentProcessingTitle') : isTechnician ? t('jobs.myJobsTitle') : t('jobs.title')}
            </h1>
            <p className="text-muted-foreground">
              {isCashier 
                ? t('jobs.paymentProcessingSubtitle')
                : isTechnician 
                  ? t('jobs.myJobsSubtitle')
                  : t('jobs.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isCashier && (
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  title={t('jobs.listView')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  title={t('jobs.calendarView')}
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
                {canCreateJobs && (
                  <Button
                    variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('map')}
                    title={t('jobs.mapView')}
                  >
                    <Map className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {canCreateJobs && (
              <Button asChild>
                <Link to="/jobs/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('jobs.newJob')}
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('jobs.searchJobs')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder={t('common.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('jobs.allStatus')}</SelectItem>
                  <SelectItem value="pending_assignment">{t('jobStatus.pending_assignment')}</SelectItem>
                  <SelectItem value="pending_approval">{t('jobStatus.pending_approval')}</SelectItem>
                  <SelectItem value="approved">{t('jobStatus.approved')}</SelectItem>
                  <SelectItem value="in_progress">{t('jobStatus.in_progress')}</SelectItem>
                  <SelectItem value="completed">{t('jobStatus.completed')}</SelectItem>
                  <SelectItem value="completed_paid">{t('jobStatus.paid')}</SelectItem>
                  <SelectItem value="cancelled">{t('jobStatus.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder={t('common.priority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('jobs.allPriority')}</SelectItem>
                  <SelectItem value="low">{t('jobPriority.low')}</SelectItem>
                  <SelectItem value="normal">{t('jobPriority.normal')}</SelectItem>
                  <SelectItem value="high">{t('jobPriority.high')}</SelectItem>
                  <SelectItem value="urgent">{t('jobPriority.urgent')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchJobs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Map View */}
        {viewMode === 'map' ? (
          <JobsOverviewMap />
        ) : viewMode === 'calendar' ? (
          /* Calendar View */
          <Card>
            <CardContent className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : (
                <JobCalendar jobs={filteredJobs} onJobUpdated={fetchJobs} />
              )}
            </CardContent>
          </Card>
        ) : (
          /* Jobs Table */
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-lg font-medium">{t('jobs.noJobsFound')}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                      ? t('jobs.adjustFilters')
                      : t('jobs.getStarted')}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('jobs.jobNumber')}</TableHead>
                        <TableHead>{t('jobs.jobTitle')}</TableHead>
                        <TableHead>{t('jobs.customer')}</TableHead>
                        <TableHead>{t('jobs.technician')}</TableHead>
                        <TableHead>{t('common.priority')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('jobs.scheduled')}</TableHead>
                        <TableHead className="text-right">{t('common.cost')}</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobs.map((job) => (
                        <TableRow key={job.id} className="table-row-hover">
                          <TableCell className="font-mono text-sm">
                            {job.job_number}
                          </TableCell>
                          <TableCell>
                            <Link 
                              to={`/jobs/${job.id}`}
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {job.title}
                            </Link>
                          </TableCell>
                          <TableCell>{job.customer_name}</TableCell>
                          <TableCell>
                            {job.technician_name || (
                              <span className="text-muted-foreground italic">{t('common.unassigned')}</span>
                            )}
                          </TableCell>
                          <TableCell>{getPriorityBadge(job.priority)}</TableCell>
                          <TableCell>{getStatusBadge(job.status)}</TableCell>
                          <TableCell>
                            {job.scheduled_date
                              ? format(new Date(job.scheduled_date), 'MMM d, yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(job.total_cost)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/jobs/${job.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    {t('common.viewDetails')}
                                  </Link>
                                </DropdownMenuItem>
                                {job.status === 'pending_approval' && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => updateJobStatus(job.id, 'approved')}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                                      {t('jobs.approve')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => updateJobStatus(job.id, 'cancelled')}
                                    >
                                      <XCircle className="mr-2 h-4 w-4 text-destructive" />
                                      {t('jobs.reject')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
