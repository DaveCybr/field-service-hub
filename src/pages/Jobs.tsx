// Jobs.tsx - Job Management with SERVER-SIDE Pagination
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  MapPin,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ServiceTeamManager } from "@/components/technician/ServiceTeamManager";
import { DataTableServer } from "@/components/ui/data-table";
import {
  createJobColumns,
  Job,
  JobColumnActions,
} from "@/components/jobs/columns";
import { useServerPagination } from "@/hooks/useServerPagination";

export default function Jobs() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});

  // ✅ Server-side pagination hook
  const {
    data: jobs,
    loading,
    pageCount,
    totalRows,
    pagination,
    setPagination,
    refetch,
  } = useServerPagination<Job>({
    table: "invoice_services",
    select: `
      *,
      invoice:invoices!inner(
        id,
        invoice_number,
        customer:customers(name, phone)
      ),
      unit:units(unit_type, brand)
    `,
    orderBy: { column: "created_at", ascending: false },
    filters: {
      status: statusFilter,
    },
    searchColumn: "title",
    searchValue: searchValue,
    initialPageSize: 10,
  });

  // Fetch team counts for current page
  useEffect(() => {
    if (jobs.length > 0) {
      fetchTeamCounts();
    }
  }, [jobs]);

  const fetchTeamCounts = async () => {
    // service_technician_assignments table not yet created - skip
    setTeamCounts({});
  };

  // Fetch stats (separate query for dashboard cards)
  const [stats, setStats] = useState({
    unassigned: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Get counts for each status
    const { count: unassignedCount } = await supabase
      .from("invoice_services")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: assignedCount } = await supabase
      .from("invoice_services")
      .select("*", { count: "exact", head: true })
      .eq("status", "assigned");

    const { count: inProgressCount } = await supabase
      .from("invoice_services")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress");

    const { count: completedCount } = await supabase
      .from("invoice_services")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    setStats({
      unassigned: unassignedCount || 0,
      assigned: assignedCount || 0,
      in_progress: inProgressCount || 0,
      completed: completedCount || 0,
    });
  };

  // Add team_count to jobs data
  const jobsWithTeamCount = useMemo(() => {
    return jobs.map((job) => ({
      ...job,
      team_count: teamCounts[job.id] || 0,
    }));
  }, [jobs, teamCounts]);

  const handleRowClick = (job: Job) => {
    navigate(`/jobs/${job.id}`);
  };

  const handleSelectionChange = (selectedRows: Job[]) => {
    setSelectedJobs(selectedRows);
  };

  // Column action handlers
  const columnActions: JobColumnActions = {
    onViewDetails: (job) => {
      navigate(`/jobs/${job.id}`);
    },
    onManageTeam: (job) => {
      setSelectedJob(job);
      setTeamDialogOpen(true);
    },
    onViewInvoice: (job) => {
      navigate(`/invoices/${job.invoice.invoice_number}`);
    },
    onCopyId: (job) => {
      navigator.clipboard.writeText(job.id);
      toast({
        title: "Copied!",
        description: "Job ID copied to clipboard",
      });
    },
  };

  const columns = createJobColumns(columnActions);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Job Management</h1>
          <p className="text-muted-foreground">
            Manage and assign service jobs to technician teams
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
                  <p className="text-3xl font-bold mt-1">{stats.unassigned}</p>
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
                  <p className="text-3xl font-bold mt-1">{stats.assigned}</p>
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
                  <p className="text-3xl font-bold mt-1">{stats.in_progress}</p>
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
                  <p className="text-3xl font-bold mt-1">{stats.completed}</p>
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
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
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

                {selectedJobs.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {selectedJobs.length} selected
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Bulk Action",
                          description: `${selectedJobs.length} jobs selected`,
                        });
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Bulk Assign
                    </Button>
                  </div>
                )}
              </div>

              <Button variant="outline" onClick={refetch} disabled={loading}>
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data Table with Server-Side Pagination */}
        <Card>
          <CardContent className="p-6">
            <DataTableServer
              columns={columns}
              data={jobsWithTeamCount}
              pageCount={pageCount}
              totalRows={totalRows}
              pagination={pagination}
              onPaginationChange={setPagination}
              loading={loading}
              searchKey="title"
              searchPlaceholder="Search by job title..."
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              onRowClick={handleRowClick}
              onSelectionChange={handleSelectionChange}
              enableMultiSelect={true}
              enableColumnVisibility={true}
              emptyMessage="No jobs found"
              emptyDescription="Jobs will appear here when invoices with services are created."
            />
          </CardContent>
        </Card>

        {/* Team Management Dialog */}
        <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Service Team</DialogTitle>
              <DialogDescription>
                {selectedJob && (
                  <>
                    Job: <strong>{selectedJob.title}</strong>
                    <br />
                    Invoice: {selectedJob.invoice.invoice_number}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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

              {selectedJob && (
                <ServiceTeamManager
                  serviceId={selectedJob.id}
                  invoiceId={selectedJob.invoice.id}
                  onTeamUpdated={() => {
                    refetch();
                    fetchTeamCounts();
                    setTeamDialogOpen(false);
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
