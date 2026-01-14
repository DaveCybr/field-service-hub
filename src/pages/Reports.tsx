import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface JobStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  cancelled: number;
}

interface RevenueData {
  date: string;
  revenue: number;
  jobs: number;
}

interface TechnicianPerformance {
  name: string;
  jobsCompleted: number;
  avgDuration: number;
  rating: number;
}

interface StatusDistribution {
  name: string;
  value: number;
  color: string;
}

interface PriorityDistribution {
  name: string;
  value: number;
  color: string;
}

const COLORS = {
  primary: 'hsl(217, 91%, 60%)',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  danger: 'hsl(0, 84%, 60%)',
  info: 'hsl(199, 89%, 48%)',
  muted: 'hsl(215, 16%, 47%)',
};

const STATUS_COLORS: Record<string, string> = {
  pending_assignment: '#f59e0b',
  pending_approval: '#f59e0b',
  approved: '#0ea5e9',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  completed_paid: '#16a34a',
  cancelled: '#6b7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#6b7280',
  normal: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export default function Reports() {
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [jobStats, setJobStats] = useState<JobStats>({ total: 0, completed: 0, inProgress: 0, pending: 0, cancelled: 0 });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [technicianPerformance, setTechnicianPerformance] = useState<TechnicianPerformance[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([]);
  const [priorityDistribution, setPriorityDistribution] = useState<PriorityDistribution[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [avgJobDuration, setAvgJobDuration] = useState(0);
  const [monthlyComparison, setMonthlyComparison] = useState<{ current: number; previous: number; change: number }>({ current: 0, previous: 0, change: 0 });

  useEffect(() => {
    fetchReportData();
  }, [timeRange]);

  const fetchReportData = async () => {
    setLoading(true);
    const days = parseInt(timeRange);
    const startDate = subDays(new Date(), days).toISOString();

    try {
      // Fetch jobs within time range
      const { data: jobs } = await supabase
        .from('service_jobs')
        .select('*')
        .gte('created_at', startDate);

      if (jobs) {
        // Calculate job stats
        const stats: JobStats = {
          total: jobs.length,
          completed: jobs.filter(j => ['completed', 'completed_paid'].includes(j.status)).length,
          inProgress: jobs.filter(j => j.status === 'in_progress').length,
          pending: jobs.filter(j => ['pending_assignment', 'pending_approval', 'approved'].includes(j.status)).length,
          cancelled: jobs.filter(j => j.status === 'cancelled').length,
        };
        setJobStats(stats);

        // Calculate total revenue
        const revenue = jobs
          .filter(j => j.status === 'completed_paid')
          .reduce((sum, j) => sum + (j.total_cost || 0), 0);
        setTotalRevenue(revenue);

        // Calculate average job duration
        const completedJobs = jobs.filter(j => j.actual_duration_minutes);
        const avgDuration = completedJobs.length > 0
          ? Math.round(completedJobs.reduce((sum, j) => sum + (j.actual_duration_minutes || 0), 0) / completedJobs.length)
          : 0;
        setAvgJobDuration(avgDuration);

        // Build daily revenue data
        const dailyData: Record<string, { revenue: number; jobs: number }> = {};
        const dateRange = eachDayOfInterval({
          start: subDays(new Date(), days),
          end: new Date(),
        });

        dateRange.forEach(date => {
          const dateStr = format(date, 'MMM dd');
          dailyData[dateStr] = { revenue: 0, jobs: 0 };
        });

        jobs.forEach(job => {
          const dateStr = format(new Date(job.created_at), 'MMM dd');
          if (dailyData[dateStr]) {
            dailyData[dateStr].jobs += 1;
            if (job.status === 'completed_paid') {
              dailyData[dateStr].revenue += job.total_cost || 0;
            }
          }
        });

        setRevenueData(Object.entries(dailyData).map(([date, data]) => ({
          date,
          revenue: data.revenue,
          jobs: data.jobs,
        })));

        // Status distribution
        const statusCounts: Record<string, number> = {};
        jobs.forEach(job => {
          statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
        });

        const statusLabels: Record<string, string> = {
          pending_assignment: 'Pending Assignment',
          pending_approval: 'Pending Approval',
          approved: 'Approved',
          in_progress: 'In Progress',
          completed: 'Completed',
          completed_paid: 'Paid',
          cancelled: 'Cancelled',
        };

        setStatusDistribution(
          Object.entries(statusCounts).map(([status, count]) => ({
            name: statusLabels[status] || status,
            value: count,
            color: STATUS_COLORS[status] || '#6b7280',
          }))
        );

        // Priority distribution
        const priorityCounts: Record<string, number> = {};
        jobs.forEach(job => {
          priorityCounts[job.priority] = (priorityCounts[job.priority] || 0) + 1;
        });

        setPriorityDistribution(
          Object.entries(priorityCounts).map(([priority, count]) => ({
            name: priority.charAt(0).toUpperCase() + priority.slice(1),
            value: count,
            color: PRIORITY_COLORS[priority] || '#6b7280',
          }))
        );
      }

      // Fetch technician performance
      const { data: technicians } = await supabase
        .from('employees')
        .select('id, name, rating, total_jobs_completed')
        .eq('role', 'technician');

      if (technicians) {
        // Get job stats per technician
        const { data: techJobs } = await supabase
          .from('service_jobs')
          .select('assigned_technician_id, actual_duration_minutes, status')
          .gte('created_at', startDate)
          .in('status', ['completed', 'completed_paid']);

        const techStats: Record<string, { jobs: number; totalDuration: number }> = {};
        techJobs?.forEach(job => {
          if (job.assigned_technician_id) {
            if (!techStats[job.assigned_technician_id]) {
              techStats[job.assigned_technician_id] = { jobs: 0, totalDuration: 0 };
            }
            techStats[job.assigned_technician_id].jobs += 1;
            techStats[job.assigned_technician_id].totalDuration += job.actual_duration_minutes || 0;
          }
        });

        setTechnicianPerformance(
          technicians.map(tech => ({
            name: tech.name,
            jobsCompleted: techStats[tech.id]?.jobs || 0,
            avgDuration: techStats[tech.id]?.jobs 
              ? Math.round(techStats[tech.id].totalDuration / techStats[tech.id].jobs)
              : 0,
            rating: tech.rating || 0,
          })).sort((a, b) => b.jobsCompleted - a.jobsCompleted)
        );
      }

      // Monthly comparison
      const currentMonthStart = startOfMonth(new Date());
      const previousMonthStart = startOfMonth(subMonths(new Date(), 1));
      const previousMonthEnd = endOfMonth(subMonths(new Date(), 1));

      const { data: currentMonthJobs } = await supabase
        .from('service_jobs')
        .select('total_cost, status')
        .gte('created_at', currentMonthStart.toISOString())
        .in('status', ['completed', 'completed_paid']);

      const { data: previousMonthJobs } = await supabase
        .from('service_jobs')
        .select('total_cost, status')
        .gte('created_at', previousMonthStart.toISOString())
        .lte('created_at', previousMonthEnd.toISOString())
        .in('status', ['completed', 'completed_paid']);

      const currentRevenue = currentMonthJobs?.reduce((sum, j) => sum + (j.total_cost || 0), 0) || 0;
      const previousRevenue = previousMonthJobs?.reduce((sum, j) => sum + (j.total_cost || 0), 0) || 0;
      const change = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      setMonthlyComparison({ current: currentRevenue, previous: previousRevenue, change });

    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      notation: 'compact',
    }).format(amount);
  };

  const formatFullCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
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

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Business insights and performance metrics
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="stats-card">
            <div className="stats-card-gradient" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <div className="flex items-center gap-1 mt-1">
                {monthlyComparison.change >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={`text-xs ${monthlyComparison.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {monthlyComparison.change >= 0 ? '+' : ''}{monthlyComparison.change.toFixed(1)}% from last month
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="stats-card">
            <div className="stats-card-gradient" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobStats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {jobStats.completed} completed ({jobStats.total > 0 ? Math.round((jobStats.completed / jobStats.total) * 100) : 0}%)
              </p>
            </CardContent>
          </Card>

          <Card className="stats-card">
            <div className="stats-card-gradient" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgJobDuration} min</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per completed job
              </p>
            </CardContent>
          </Card>

          <Card className="stats-card">
            <div className="stats-card-gradient" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {jobStats.total > 0 ? Math.round((jobStats.completed / jobStats.total) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {jobStats.cancelled} cancelled
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="technicians">Technicians</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Jobs Over Time */}
              <Card>
                <CardHeader>
                  <CardTitle>Jobs Over Time</CardTitle>
                  <CardDescription>Daily job volume for the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="jobs" 
                          stroke={COLORS.primary}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorJobs)"
                          name="Jobs"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Job Status Distribution</CardTitle>
                  <CardDescription>Current status breakdown of all jobs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                  <CardDescription>Jobs by priority level</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityDistribution} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          tick={{ fontSize: 12 }}
                          width={80}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar 
                          dataKey="value" 
                          name="Jobs"
                          radius={[0, 4, 4, 0]}
                        >
                          {priorityDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Stats</CardTitle>
                  <CardDescription>Key metrics at a glance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-amber-100">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">Pending Jobs</p>
                        <p className="text-sm text-muted-foreground">Awaiting action</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">{jobStats.pending}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-100">
                        <Briefcase className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">In Progress</p>
                        <p className="text-sm text-muted-foreground">Currently active</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">{jobStats.inProgress}</span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-emerald-100">
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">Completed</p>
                        <p className="text-sm text-muted-foreground">Successfully done</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold">{jobStats.completed}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [formatFullCurrency(value), 'Revenue']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={COLORS.success}
                        strokeWidth={3}
                        dot={{ fill: COLORS.success, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Comparison</CardTitle>
                  <CardDescription>Current vs previous month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <p className="text-sm text-muted-foreground">This Month</p>
                      <p className="text-3xl font-bold text-primary">{formatFullCurrency(monthlyComparison.current)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Month</p>
                      <p className="text-2xl font-semibold">{formatFullCurrency(monthlyComparison.previous)}</p>
                    </div>
                    <div className={`flex items-center gap-2 p-3 rounded-lg ${monthlyComparison.change >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {monthlyComparison.change >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                      <span className={`font-medium ${monthlyComparison.change >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        {monthlyComparison.change >= 0 ? '+' : ''}{monthlyComparison.change.toFixed(1)}% change
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Jobs vs Revenue</CardTitle>
                  <CardDescription>Correlation between jobs and revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData.slice(-14)}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="jobs" fill={COLORS.primary} name="Jobs" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="revenue" fill={COLORS.success} name="Revenue" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Technicians Tab */}
          <TabsContent value="technicians" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Technician Performance</CardTitle>
                <CardDescription>Jobs completed by each technician</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={technicianPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{ fontSize: 12 }}
                        width={120}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="jobsCompleted" 
                        fill={COLORS.primary}
                        name="Jobs Completed"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Average Job Duration</CardTitle>
                  <CardDescription>Minutes per job by technician</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={technicianPerformance.filter(t => t.avgDuration > 0)}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [`${value} min`, 'Avg Duration']}
                        />
                        <Bar 
                          dataKey="avgDuration" 
                          fill={COLORS.info}
                          name="Avg Duration (min)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Technician Leaderboard</CardTitle>
                  <CardDescription>Top performers this period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {technicianPerformance.slice(0, 5).map((tech, index) => (
                      <div key={tech.name} className="flex items-center gap-4">
                        <div className={`flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm ${
                          index === 0 ? 'bg-amber-100 text-amber-700' :
                          index === 1 ? 'bg-gray-200 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{tech.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {tech.jobsCompleted} jobs · {tech.avgDuration > 0 ? `${tech.avgDuration} min avg` : 'No data'}
                          </p>
                        </div>
                        {tech.rating > 0 && (
                          <div className="flex items-center gap-1 text-amber-500">
                            <span className="font-medium">{tech.rating.toFixed(1)}</span>
                            <span>★</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {technicianPerformance.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No technician data available
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
