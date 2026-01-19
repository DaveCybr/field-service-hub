// Jobs.tsx - Job Management for Admin/Manager
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  RefreshCw,
  Briefcase,
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  Calendar,
  MapPin,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Job {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  scheduled_date: string | null;
  service_address: string | null;
  assigned_technician_id: string | null;
  created_at: string;
  invoice: {
    invoice_number: string;
    customer: {
      name: string;
      phone: string;
    };
  };
  assigned_technician: {
    name: string;
  } | null;
  unit: {
    unit_type: string;
    brand: string | null;
  } | null;
}

interface Technician {
  id: string;
  name: string;
  status: string;
  rating: number | null;
  total_jobs_completed: number | null;
}

export default function Jobs() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchTechnicians();
  }, [statusFilter]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("invoice_services")
        .select(
          `
          *,
          invoice:invoices!inner(
            invoice_number,
            customer:customers(name, phone)
          ),
          assigned_technician:employees(name),
          unit:units(unit_type, brand)
        `,
        )
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load jobs.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    try {
      // Get technicians with active job count
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          id, 
          name, 
          status, 
          rating, 
          total_jobs_completed,
          active_jobs:invoice_services!assigned_technician_id(count)
        `,
        )
        .eq("role", "technician")
        .in("status", ["available", "off_duty"])
        .order("name");

      if (error) throw error;

      // Calculate active jobs count and filter
      const techsWithWorkload = (data || []).map((tech: any) => ({
        ...tech,
        active_jobs_count: tech.active_jobs?.[0]?.count || 0,
      }));

      // Only show technicians with NO active jobs
      const freeTechs = techsWithWorkload.filter(
        (t) => t.active_jobs_count === 0,
      );

      setTechnicians(freeTechs);
    } catch (error) {
      console.error("Error fetching technicians:", error);
    }
  };

  const handleAssignJob = async () => {
    if (!selectedJob || !selectedTechnicianId) return;

    setAssigning(true);
    try {
      const { error } = await supabase
        .from("invoice_services")
        .update({
          assigned_technician_id: selectedTechnicianId,
          status: "assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedJob.id);

      if (error) throw error;

      toast({
        title: "Job Assigned",
        description: "The job has been assigned to the technician.",
      });

      setAssignDialogOpen(false);
      setSelectedJob(null);
      setSelectedTechnicianId("");
      fetchJobs();
    } catch (error: any) {
      console.error("Error assigning job:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to assign job.",
      });
    } finally {
      setAssigning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: {
        label: "Unassigned",
        className: "bg-yellow-100 text-yellow-800",
      },
      assigned: { label: "Assigned", className: "bg-blue-100 text-blue-800" },
      in_progress: {
        label: "In Progress",
        className: "bg-purple-100 text-purple-800",
      },
      completed: {
        label: "Completed",
        className: "bg-green-100 text-green-800",
      },
      cancelled: { label: "Cancelled", className: "bg-red-100 text-red-800" },
    };

    const { label, className } = config[status] || config.pending;
    return <Badge className={className}>{label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { className: string }> = {
      low: { className: "bg-gray-100 text-gray-800" },
      normal: { className: "bg-blue-100 text-blue-800" },
      high: { className: "bg-orange-100 text-orange-800" },
      urgent: { className: "bg-red-100 text-red-800" },
    };

    const { className } = config[priority] || config.normal;
    return <Badge className={className}>{priority.toUpperCase()}</Badge>;
  };

  const filteredJobs = jobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.invoice.invoice_number
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      job.invoice.customer.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  // Stats
  const unassignedCount = jobs.filter((j) => j.status === "pending").length;
  const assignedCount = jobs.filter((j) => j.status === "assigned").length;
  const inProgressCount = jobs.filter((j) => j.status === "in_progress").length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Management</h1>
          <p className="text-muted-foreground">
            Manage and assign service jobs to technicians
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Unassigned
                  </p>
                  <p className="text-3xl font-bold mt-1">{unassignedCount}</p>
                </div>
                <div className="rounded-lg p-3 bg-yellow-100">
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Assigned
                  </p>
                  <p className="text-3xl font-bold mt-1">{assignedCount}</p>
                </div>
                <div className="rounded-lg p-3 bg-blue-100">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    In Progress
                  </p>
                  <p className="text-3xl font-bold mt-1">{inProgressCount}</p>
                </div>
                <div className="rounded-lg p-3 bg-purple-100">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Completed
                  </p>
                  <p className="text-3xl font-bold mt-1">{completedCount}</p>
                </div>
                <div className="rounded-lg p-3 bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by job title, invoice, or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Unassigned</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchJobs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No jobs found</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Jobs will appear here when invoices with services are created.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow
                        key={job.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/jobs/${job.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{job.title}</p>
                            {job.unit && (
                              <p className="text-sm text-muted-foreground">
                                {job.unit.brand} {job.unit.unit_type}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">
                            {job.invoice.invoice_number}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {job.invoice.customer.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {job.invoice.customer.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {job.scheduled_date ? (
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(
                                new Date(job.scheduled_date),
                                "dd MMM yyyy, HH:mm",
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Not scheduled
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {job.assigned_technician ? (
                            <span className="text-sm">
                              {job.assigned_technician.name}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{getPriorityBadge(job.priority)}</TableCell>
                        <TableCell>{getStatusBadge(job.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(job);
                              setSelectedTechnicianId(
                                job.assigned_technician_id || "",
                              );
                              setAssignDialogOpen(true);
                            }}
                          >
                            {job.assigned_technician_id ? "Reassign" : "Assign"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Technician</DialogTitle>
              <DialogDescription>
                {selectedJob && (
                  <>
                    Assigning job: <strong>{selectedJob.title}</strong>
                    <br />
                    Invoice: {selectedJob.invoice.invoice_number}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Technician</Label>
                {technicians.length === 0 ? (
                  <div className="p-4 border rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">
                      ⚠️ No free technicians available. All technicians
                      currently have active jobs.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Please wait for a technician to complete their current
                      job.
                    </p>
                  </div>
                ) : (
                  <Select
                    value={selectedTechnicianId}
                    onValueChange={setSelectedTechnicianId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{tech.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {tech.total_jobs_completed || 0} jobs completed
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedJob?.service_address && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Service Address</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedJob.service_address}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAssignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignJob}
                disabled={!selectedTechnicianId || assigning}
              >
                {assigning ? "Assigning..." : "Assign Job"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
