// Jobs.tsx - Manajemen Pekerjaan dengan Pagination SERVER-SIDE
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
    filters: { status: statusFilter },
    searchColumn: "title",
    searchValue: searchValue,
    initialPageSize: 10,
  });

  useEffect(() => {
    if (jobs.length > 0) fetchTeamCounts();
  }, [jobs]);

  const fetchTeamCounts = async () => {
    const serviceIds = jobs.map((job) => job.id);
    // ✅ FIX: Hapus filter status "active" - tidak ada status "active" di tabel
    // Status yang ada: "assigned", dll
    const { data } = await supabase
      .from("service_technician_assignments")
      .select("service_id")
      .in("service_id", serviceIds);

    const counts = data?.reduce((acc: Record<string, number>, assignment) => {
      if (assignment.service_id) {
        acc[assignment.service_id] = (acc[assignment.service_id] || 0) + 1;
      }
      return acc;
    }, {});

    setTeamCounts(counts || {});
  };

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

  const jobsWithTeamCount = useMemo(() => {
    return jobs.map((job) => ({ ...job, team_count: teamCounts[job.id] || 0 }));
  }, [jobs, teamCounts]);

  const columnActions: JobColumnActions = {
    onViewDetails: (job) => navigate(`/jobs/${job.id}`),
    onManageTeam: (job) => {
      setSelectedJob(job);
      setTeamDialogOpen(true);
    },
    onViewInvoice: (job) => navigate(`/invoices/${job.invoice.invoice_number}`),
    onCopyId: (job) => {
      navigator.clipboard.writeText(job.id);
      toast({
        title: "Tersalin!",
        description: "ID pekerjaan telah disalin ke clipboard",
      });
    },
  };

  const columns = createJobColumns(columnActions);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Manajemen Pekerjaan
          </h1>
          <p className="text-muted-foreground">
            Kelola dan tugaskan pekerjaan service ke tim teknisi
          </p>
        </div>

        {/* Kartu Statistik */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Belum Ditugaskan
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
                    Ditugaskan
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
                    Sedang Dikerjakan
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
                    Selesai
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

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="pending">Belum Ditugaskan</SelectItem>
                    <SelectItem value="assigned">Ditugaskan</SelectItem>
                    <SelectItem value="in_progress">
                      Sedang Dikerjakan
                    </SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                    <SelectItem value="cancelled">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>

                {selectedJobs.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {selectedJobs.length} dipilih
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Aksi Massal",
                          description: `${selectedJobs.length} pekerjaan dipilih`,
                        });
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Tugaskan Massal
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

        {/* Tabel Data */}
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
              searchPlaceholder="Cari berdasarkan judul pekerjaan..."
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              onRowClick={(job) => navigate(`/jobs/${job.id}`)}
              onSelectionChange={setSelectedJobs}
              enableMultiSelect={true}
              enableColumnVisibility={true}
              emptyMessage="Tidak ada pekerjaan"
              emptyDescription="Pekerjaan akan muncul di sini ketika faktur dengan service dibuat."
            />
          </CardContent>
        </Card>

        {/* Dialog Manajemen Tim */}
        <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Kelola Tim Service</DialogTitle>
              <DialogDescription>
                {selectedJob && (
                  <>
                    Pekerjaan: <strong>{selectedJob.title}</strong>
                    <br />
                    Faktur: {selectedJob.invoice.invoice_number}
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
                      <p className="text-sm font-medium">Alamat Service</p>
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
