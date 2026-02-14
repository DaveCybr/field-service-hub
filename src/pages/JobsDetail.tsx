// JobDetail.tsx - Alternative approach with proper typing
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";
import { ServiceTeamManager } from "@/components/technician/ServiceTeamManager";

interface JobDetail {
  id: string;
  invoice_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  scheduled_date: string | null;
  service_address: string | null;
  service_cost: number;
  parts_cost: number;
  total_cost: number;
  actual_checkin_at: string | null;
  actual_checkout_at: string | null;
  actual_duration_minutes: number | null;
  before_photos: string[] | null;
  after_photos: string[] | null;
  technician_notes: string | null;
  admin_notes: string | null;
  assigned_technician_id: string | null;
  created_at: string;
  invoice: {
    id: string;
    invoice_number: string;
    customer: {
      name: string;
      phone: string;
      email: string | null;
    };
  };
  assigned_technician: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  unit: {
    unit_type: string;
    brand: string | null;
    model: string | null;
    serial_number: string | null;
  } | null;
}

interface TeamMember {
  id: string;
  technician: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  role: string;
  status: string;
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchJobDetail();
      fetchTeamMembers();
    }
  }, [id]);

  const fetchJobDetail = async () => {
    try {
      const { data, error } = await supabase
        .from("invoice_services")
        .select(
          `
          *,
          invoice:invoices!inner(
            id,
            invoice_number,
            customer:customers(name, phone, email)
          ),
          assigned_technician:employees(id, name, email, phone),
          unit:units(unit_type, brand, model, serial_number)
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error("Error fetching job detail:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load job details.",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    if (!id) return;

    try {
      // ✅ Use direct SQL-like query to bypass TypeScript issues
      const {
        data,
        error,
      }: {
        data: any[] | null;
        error: any;
      } = await supabase
        .from("service_technician_assignments")
        .select(
          `
          id,
          role,
          status,
          technician:employees!service_technician_assignments_technician_id_fkey(
            id,
            name,
            email,
            phone
          )
        `,
        )
        .eq("service_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error("Error fetching team members:", error);
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

  const getRoleBadge = (role: string) => {
    const config: Record<string, { label: string; className: string }> = {
      lead: { label: "Lead", className: "bg-blue-100 text-blue-800" },
      assistant: {
        label: "Assistant",
        className: "bg-gray-100 text-gray-800",
      },
      specialist: {
        label: "Specialist",
        className: "bg-purple-100 text-purple-800",
      },
    };

    const { label, className } = config[role] || config.assistant;
    return <Badge className={className}>{label}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Job not found</h3>
          <Button className="mt-4" onClick={() => navigate("/jobs")}>
            Back to Jobs
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/jobs")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{job.title}</h1>
              <p className="text-muted-foreground">
                Invoice: {job.invoice.invoice_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(job.status)}
            {getPriorityBadge(job.priority)}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                {/* Job Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Job Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {job.description && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Description
                        </p>
                        <p className="mt-1">{job.description}</p>
                      </div>
                    )}

                    {job.scheduled_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Scheduled:{" "}
                          {format(
                            new Date(job.scheduled_date),
                            "EEEE, dd MMMM yyyy, HH:mm",
                          )}
                        </span>
                      </div>
                    )}

                    {job.service_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Service Address</p>
                          <p className="text-sm text-muted-foreground">
                            {job.service_address}
                          </p>
                        </div>
                      </div>
                    )}

                    {job.unit && (
                      <div className="flex items-start gap-2">
                        <Package className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Unit</p>
                          <p className="text-sm text-muted-foreground">
                            {job.unit.brand} {job.unit.unit_type}
                            {job.unit.model && ` - ${job.unit.model}`}
                            {job.unit.serial_number &&
                              ` (SN: ${job.unit.serial_number})`}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cost Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Service Cost
                      </span>
                      <span className="font-medium">
                        {formatCurrency(job.service_cost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parts Cost</span>
                      <span className="font-medium">
                        {formatCurrency(job.parts_cost)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(job.total_cost)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {(job.technician_notes || job.admin_notes) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {job.technician_notes && (
                        <div>
                          <p className="text-sm font-medium">
                            Technician Notes
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {job.technician_notes}
                          </p>
                        </div>
                      )}
                      {job.admin_notes && (
                        <div>
                          <p className="text-sm font-medium">Admin Notes</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {job.admin_notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="progress">
                <Card>
                  <CardHeader>
                    <CardTitle>Job Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {job.actual_checkin_at && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Checked In</p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(job.actual_checkin_at),
                              "dd MMM yyyy, HH:mm",
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {job.actual_checkout_at && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Checked Out</p>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(job.actual_checkout_at),
                              "dd MMM yyyy, HH:mm",
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {job.actual_duration_minutes && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Duration</p>
                          <p className="text-xs text-muted-foreground">
                            {job.actual_duration_minutes} minutes
                          </p>
                        </div>
                      </div>
                    )}

                    {!job.actual_checkin_at && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-12 w-12 mx-auto opacity-50 mb-2" />
                        <p className="text-sm">Job not started yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="photos">
                <Card>
                  <CardHeader>
                    <CardTitle>Photos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Before Photos */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">Before</h4>
                      {job.before_photos && job.before_photos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {job.before_photos.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Before ${idx + 1}`}
                              className="w-full aspect-square object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No photos yet
                        </p>
                      )}
                    </div>

                    {/* After Photos */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">After</h4>
                      {job.after_photos && job.after_photos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {job.after_photos.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`After ${idx + 1}`}
                              className="w-full aspect-square object-cover rounded-lg"
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No photos yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div>
                  <p className="font-medium">{job.invoice.customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.invoice.customer.phone}
                  </p>
                  {job.invoice.customer.email && (
                    <p className="text-sm text-muted-foreground">
                      {job.invoice.customer.email}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Service Team Info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Service Team
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTeamDialogOpen(true)}
                >
                  {teamMembers.length > 0 ? "Manage" : "Assign"}
                </Button>
              </CardHeader>
              <CardContent className="pt-0">
                {teamMembers.length > 0 ? (
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-start justify-between gap-2"
                      >
                        <div className="flex items-start gap-2 flex-1">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {member.technician.name}
                            </p>
                            {member.technician.phone && (
                              <p className="text-xs text-muted-foreground truncate">
                                {member.technician.phone}
                              </p>
                            )}
                          </div>
                        </div>
                        {getRoleBadge(member.role)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      No team assigned yet
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() =>
                    navigate(`/invoices/${job.invoice.invoice_number}`)
                  }
                >
                  View Invoice
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Team Management Dialog */}
        <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Service Team</DialogTitle>
              <DialogDescription>
                Assign and manage technicians for this job
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {job.service_address && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Service Address</p>
                      <p className="text-sm text-muted-foreground">
                        {job.service_address}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <ServiceTeamManager
                serviceId={job.id}
                invoiceId={job.invoice.id}
                onTeamUpdated={() => {
                  fetchTeamMembers();
                  fetchJobDetail();
                  setTeamDialogOpen(false);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
