import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const { toast } = useToast();

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
          employees (name)
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
        customer_name: (job.customers as any)?.name || 'Unknown',
        technician_name: (job.employees as any)?.name || null,
        total_cost: job.total_cost || 0,
        created_at: job.created_at,
      })) || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load jobs. Please try again.',
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
        title: 'Status Updated',
        description: `Job status changed to ${newStatus.replace('_', ' ')}.`,
      });

      fetchJobs();
    } catch (error) {
      console.error('Error updating job status:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update job status.',
      });
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
            <h1 className="text-2xl font-bold tracking-tight">Service Jobs</h1>
            <p className="text-muted-foreground">
              Manage and track all service jobs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
            <Button asChild>
              <Link to="/jobs/new">
                <Plus className="mr-2 h-4 w-4" />
                New Job
              </Link>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending_assignment">Pending Assignment</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="completed_paid">Paid</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchJobs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        {viewMode === 'calendar' ? (
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
                  <h3 className="text-lg font-medium">No jobs found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Get started by creating a new service job'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job #</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Technician</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
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
                              <span className="text-muted-foreground italic">Unassigned</span>
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
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                {job.status === 'pending_approval' && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => updateJobStatus(job.id, 'approved')}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => updateJobStatus(job.id, 'cancelled')}
                                    >
                                      <XCircle className="mr-2 h-4 w-4 text-destructive" />
                                      Reject
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
