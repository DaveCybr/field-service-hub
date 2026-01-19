import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Notification } from "@/hooks/useRealtimeNotifications";
import {
  Loader2,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Package,
} from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils/currency";

interface PendingJob {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  service_cost: number;
  scheduled_date: string | null;
  service_address: string | null;
  invoice: {
    invoice_number: string;
    customer: {
      name: string;
      phone: string;
    };
  };
  unit: {
    unit_type: string;
    brand: string | null;
  } | null;
}

interface QuickAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: Notification | null;
}

export function QuickAssignModal({
  open,
  onOpenChange,
  notification,
}: QuickAssignModalProps) {
  const { toast } = useToast();
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const technicianId = notification?.data?.technician_id;
  const technicianName =
    notification?.message?.match(/Technician (.*?) is/)?.[1] || "Technician";

  useEffect(() => {
    if (open && technicianId) {
      fetchPendingJobs();
    }
  }, [open, technicianId]);

  const fetchPendingJobs = async () => {
    setLoading(true);
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
          unit:units(unit_type, brand)
        `,
        )
        .eq("status", "pending")
        .is("assigned_technician_id", null)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(5);

      if (error) throw error;

      setPendingJobs(
        data?.map((job) => ({
          ...job,
          invoice: Array.isArray(job.invoice) ? job.invoice[0] : job.invoice,
          unit: Array.isArray(job.unit) ? job.unit[0] : job.unit,
        })) || [],
      );
    } catch (error: any) {
      console.error("Error fetching pending jobs:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load pending jobs",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (jobId: string) => {
    if (!technicianId) return;

    setAssigning(jobId);
    try {
      const { error } = await supabase
        .from("invoice_services")
        .update({
          assigned_technician_id: technicianId,
          status: "assigned",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      if (error) throw error;

      toast({
        title: "Job Assigned",
        description: `Job successfully assigned to ${technicianName}`,
      });

      // Remove assigned job from list
      setPendingJobs((prev) => prev.filter((job) => job.id !== jobId));

      // Close modal if no more jobs
      if (pendingJobs.length <= 1) {
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Error assigning job:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to assign job",
      });
    } finally {
      setAssigning(null);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config: Record<string, { className: string }> = {
      urgent: { className: "bg-red-100 text-red-800" },
      high: { className: "bg-orange-100 text-orange-800" },
      normal: { className: "bg-blue-100 text-blue-800" },
      low: { className: "bg-gray-100 text-gray-800" },
    };
    const { className } = config[priority] || config.normal;
    return <Badge className={className}>{priority.toUpperCase()}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Assign Pending Jobs</DialogTitle>
          <DialogDescription>
            Select a job to assign to <strong>{technicianName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pendingJobs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <h3 className="text-lg font-medium">No Pending Jobs</h3>
              <p className="text-sm text-muted-foreground mt-1">
                All jobs have been assigned
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {pendingJobs.map((job) => (
                <Card key={job.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title & Priority */}
                      <div className="flex items-start gap-2 mb-2">
                        <h4 className="font-medium">{job.title}</h4>
                        {getPriorityBadge(job.priority)}
                      </div>

                      {/* Description */}
                      {job.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {job.description}
                        </p>
                      )}

                      {/* Customer Info */}
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Customer:
                          </span>
                          <span className="font-medium">
                            {job.invoice.customer.name}
                          </span>
                          <span className="text-muted-foreground">
                            ({job.invoice.customer.phone})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            Invoice:
                          </span>
                          <span className="font-mono text-xs">
                            {job.invoice.invoice_number}
                          </span>
                        </div>

                        {/* Unit Info */}
                        {job.unit && (
                          <div className="flex items-center gap-2">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {job.unit.brand} {job.unit.unit_type}
                            </span>
                          </div>
                        )}

                        {/* Scheduled Date */}
                        {job.scheduled_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {format(
                                new Date(job.scheduled_date),
                                "dd MMM yyyy, HH:mm",
                              )}
                            </span>
                          </div>
                        )}

                        {/* Service Address */}
                        {job.service_address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                            <span className="text-muted-foreground text-xs">
                              {job.service_address}
                            </span>
                          </div>
                        )}

                        {/* Service Cost */}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-muted-foreground">
                            Service Cost:
                          </span>
                          <span className="font-medium">
                            {formatCurrency(job.service_cost)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Assign Button */}
                    <Button
                      onClick={() => handleAssign(job.id)}
                      disabled={assigning !== null}
                      className="whitespace-nowrap"
                    >
                      {assigning === job.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        "Assign Job"
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {pendingJobs.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span>Showing up to 5 pending jobs</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
