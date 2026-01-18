import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Briefcase,
  Clock,
  CheckCircle2,
  TrendingUp,
  Calendar,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";

interface DashboardStats {
  todayJobs: number;
  pendingJobs: number;
  inProgressJobs: number;
  completedThisWeek: number;
  completedThisMonth: number;
  avgDuration: number;
  totalRevenue: number;
}

interface TodayJob {
  id: string;
  title: string;
  scheduled_date: string;
  status: string;
  priority: string;
  service_address: string;
  actual_checkin_at: string | null;
  invoice: {
    invoice_number: string;
    customer: {
      name: string;
      phone: string;
    };
  };
}

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayJobs: 0,
    pendingJobs: 0,
    inProgressJobs: 0,
    completedThisWeek: 0,
    completedThisMonth: 0,
    avgDuration: 0,
    totalRevenue: 0,
  });
  const [todayJobs, setTodayJobs] = useState<TodayJob[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<TodayJob[]>([]);

  useEffect(() => {
    if (employee?.id) {
      loadDashboardData();
    }
  }, [employee?.id]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all jobs for stats
      const { data: allJobs, error: allJobsError } = await supabase
        .from("invoice_services")
        .select("*")
        .eq("assigned_technician_id", employee?.id);

      if (allJobsError) throw allJobsError;

      // Load today's jobs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: todayJobsData, error: todayError } = await supabase
        .from("invoice_services")
        .select(
          `
          *,
          invoice:invoices!inner(
            invoice_number,
            customer:customers(name, phone)
          )
        `
        )
        .eq("assigned_technician_id", employee?.id)
        .gte("scheduled_date", today.toISOString())
        .lt("scheduled_date", tomorrow.toISOString())
        .order("scheduled_date", { ascending: true });

      if (todayError) throw todayError;

      // Load upcoming jobs (next 7 days, excluding today)
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: upcomingJobsData, error: upcomingError } = await supabase
        .from("invoice_services")
        .select(
          `
          *,
          invoice:invoices!inner(
            invoice_number,
            customer:customers(name, phone)
          )
        `
        )
        .eq("assigned_technician_id", employee?.id)
        .gte("scheduled_date", tomorrow.toISOString())
        .lte("scheduled_date", nextWeek.toISOString())
        .order("scheduled_date", { ascending: true })
        .limit(5);

      if (upcomingError) throw upcomingError;

      // Calculate stats
      const now = new Date();
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      const pendingJobs = allJobs.filter((j) => j.status === "pending").length;
      const inProgressJobs = allJobs.filter(
        (j) => j.status === "in_progress"
      ).length;

      const completedJobs = allJobs.filter((j) => j.status === "completed");
      const completedThisWeek = completedJobs.filter(
        (j) => new Date(j.updated_at) >= weekAgo
      ).length;
      const completedThisMonth = completedJobs.filter(
        (j) => new Date(j.updated_at) >= monthAgo
      ).length;

      // Calculate average duration
      const jobsWithDuration = completedJobs.filter(
        (j) => j.actual_duration_minutes
      );
      const avgDuration =
        jobsWithDuration.length > 0
          ? Math.round(
              jobsWithDuration.reduce(
                (sum, j) => sum + (j.actual_duration_minutes || 0),
                0
              ) / jobsWithDuration.length
            )
          : 0;

      // Calculate revenue (completed jobs)
      const totalRevenue = completedJobs.reduce(
        (sum, j) => sum + (j.total_cost || 0),
        0
      );

      setStats({
        todayJobs: todayJobsData.length,
        pendingJobs,
        inProgressJobs,
        completedThisWeek,
        completedThisMonth,
        avgDuration,
        totalRevenue,
      });

      setTodayJobs(todayJobsData || []);
      setUpcomingJobs(upcomingJobsData || []);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load dashboard data",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "secondary",
      in_progress: "default",
      completed: "outline",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "text-blue-600",
      normal: "text-gray-600",
      high: "text-orange-600",
      urgent: "text-red-600",
    };
    return colors[priority] || colors.normal;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {employee?.name}!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Jobs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayJobs}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        {/* Pending Jobs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingJobs}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting your action
            </p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgressJobs}</div>
            <p className="text-xs text-muted-foreground">Active jobs</p>
          </CardContent>
        </Card>

        {/* Completed This Week */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisWeek}</div>
            <p className="text-xs text-muted-foreground">Jobs completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">Jobs completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration}</div>
            <p className="text-xs text-muted-foreground">Minutes per job</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">All completed jobs</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Today's Schedule</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/technician/jobs")}
            >
              View All Jobs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {todayJobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No jobs scheduled for today</p>
              <p className="text-xs">Enjoy your day off!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/technician/jobs/${job.id}`)}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{job.title}</p>
                      {getStatusBadge(job.status)}
                      <span
                        className={`text-xs font-medium ${getPriorityColor(
                          job.priority
                        )}`}
                      >
                        {job.priority.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{job.invoice.customer.name}</span>
                      <span>•</span>
                      <span>
                        {format(parseISO(job.scheduled_date), "HH:mm")}
                      </span>
                    </div>

                    {job.service_address && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{job.service_address}</span>
                      </div>
                    )}

                    {job.actual_checkin_at && (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>
                          Checked in at{" "}
                          {format(parseISO(job.actual_checkin_at), "HH:mm")}
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant={job.status === "pending" ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/technician/jobs/${job.id}`);
                    }}
                  >
                    {job.status === "pending" && "Start"}
                    {job.status === "in_progress" && "Continue"}
                    {job.status === "completed" && "View"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Jobs */}
      {upcomingJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/technician/jobs/${job.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{job.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {job.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{job.invoice.customer.name}</span>
                      <span>•</span>
                      <span>
                        {format(parseISO(job.scheduled_date), "EEE, dd MMM")}
                      </span>
                      <span>•</span>
                      <span>
                        {format(parseISO(job.scheduled_date), "HH:mm")}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(job.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate("/technician/jobs?filter=pending")}
            >
              <Briefcase className="mr-2 h-4 w-4" />
              View Pending Jobs
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate("/technician/jobs?filter=in_progress")}
            >
              <Clock className="mr-2 h-4 w-4" />
              Continue Jobs
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => navigate("/technician/jobs?filter=today")}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Today's Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
