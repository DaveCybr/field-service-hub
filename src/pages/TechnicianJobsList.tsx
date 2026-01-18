import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, Calendar, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ServiceJob {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  scheduled_date: string;
  service_address: string;
  actual_checkin_at: string | null;
  actual_checkout_at: string | null;
  invoice: {
    invoice_number: string;
    customer: {
      name: string;
      phone: string;
    };
  };
  unit: {
    unit_type: string;
    brand: string;
    model: string;
  } | null;
}

export default function TechnicianJobsList() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<ServiceJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<ServiceJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");

  // Stats
  const [stats, setStats] = useState({
    today: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });

  useEffect(() => {
    if (employee) {
      fetchJobs();
    }
  }, [employee]);

  useEffect(() => {
    filterJobs();
  }, [jobs, searchQuery, statusFilter, timeFilter]);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("invoice_services")
        .select(
          `
          *,
          invoice:invoices!inner(
            invoice_number,
            customer:customers(name, phone)
          ),
          unit:units(unit_type, brand, model)
        `
        )
        .eq("assigned_technician_id", employee?.id)
        .order("scheduled_date", { ascending: true });

      if (error) throw error;

      setJobs(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load jobs",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (jobsList: ServiceJob[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayJobs = jobsList.filter((job) => {
      if (!job.scheduled_date) return false;
      const scheduleDate = new Date(job.scheduled_date);
      return scheduleDate >= today && scheduleDate < tomorrow;
    });

    setStats({
      today: todayJobs.length,
      pending: jobsList.filter((j) => j.status === "pending").length,
      inProgress: jobsList.filter((j) => j.status === "in_progress").length,
      completed: jobsList.filter((j) => j.status === "completed").length,
    });
  };

  const filterJobs = () => {
    let filtered = [...jobs];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (job) =>
          job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.invoice.customer.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          job.invoice.invoice_number
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((job) => job.status === statusFilter);
    }

    // Time filter
    if (timeFilter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      filtered = filtered.filter((job) => {
        if (!job.scheduled_date) return false;
        const scheduleDate = new Date(job.scheduled_date);
        return scheduleDate >= today && scheduleDate < tomorrow;
      });
    } else if (timeFilter === "week") {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      filtered = filtered.filter((job) => {
        if (!job.scheduled_date) return false;
        const scheduleDate = new Date(job.scheduled_date);
        return scheduleDate >= today && scheduleDate <= nextWeek;
      });
    }

    setFilteredJobs(filtered);
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

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-100 text-blue-800",
      normal: "bg-gray-100 text-gray-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };

    return (
      <Badge className={colors[priority] || colors.normal}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">My Jobs</h1>
          <p className="text-muted-foreground">
            View and manage your assigned service jobs
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search jobs, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Time filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <p className="text-center text-muted-foreground">
                  No jobs found
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => (
              <Card
                key={job.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/technician/jobs/${job.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{job.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {job.invoice.invoice_number}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {getStatusBadge(job.status)}
                          {getPriorityBadge(job.priority)}
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {job.scheduled_date
                              ? format(
                                  new Date(job.scheduled_date),
                                  "dd MMM yyyy, HH:mm"
                                )
                              : "Not scheduled"}
                          </span>
                        </div>

                        {job.service_address && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">
                              {job.service_address}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium">
                          {job.invoice.customer.name}
                        </span>
                        <span className="text-muted-foreground">
                          {job.invoice.customer.phone}
                        </span>
                        {job.unit && (
                          <span className="text-muted-foreground">
                            {job.unit.unit_type} - {job.unit.brand}{" "}
                            {job.unit.model}
                          </span>
                        )}
                      </div>

                      {job.actual_checkin_at && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <Clock className="h-4 w-4" />
                          <span>
                            Checked in at{" "}
                            {format(new Date(job.actual_checkin_at), "HH:mm")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
