import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  User,
  FileText,
  DollarSign,
  CheckCircle,
  Edit,
  Plus,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import type { Invoice } from "@/hooks/invoices/useInvoiceDetail";

interface TimelineEvent {
  id: string;
  action: string;
  entity_type: string;
  old_data?: any;
  new_data?: any;
  created_at: string;
  employee?: {
    name: string;
  };
}

interface TimelineTabProps {
  invoice: Invoice;
}

// ============================================
// HELPER FUNCTIONS - Handle null/undefined
// ============================================

const formatStatusLabel = (status: string | null | undefined): string => {
  if (!status) return "Not Set";

  const statusMap: Record<string, string> = {
    draft: "Draft",
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return statusMap[status] || status;
};

const formatPaymentLabel = (status: string | null | undefined): string => {
  if (!status) return "Not Set";

  const paymentMap: Record<string, string> = {
    unpaid: "Unpaid",
    partial: "Partially Paid",
    paid: "Paid",
    overdue: "Overdue",
  };

  return paymentMap[status] || status;
};

const formatCurrency = (amount: number | null | undefined): string => {
  if (!amount) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

// ============================================
// MAIN COMPONENT
// ============================================

export function TimelineTab({ invoice }: TimelineTabProps) {
  const { toast } = useToast();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeline();
  }, [invoice.id]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(
          `
          *,
          employee:employees!audit_logs_employee_id_fkey(name)
        `,
        )
        .eq("entity_type", "invoices")
        .eq("entity_id", invoice.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error("Error fetching timeline:", error);
      // Don't show error toast, just use basic timeline
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (action: string) => {
    switch (action) {
      case "INSERT":
      case "CREATE":
        return <Plus className="h-4 w-4 text-emerald-600" />;
      case "UPDATE":
      case "EDIT":
        return <Edit className="h-4 w-4 text-blue-600" />;
      case "PAYMENT":
        return <DollarSign className="h-4 w-4 text-amber-600" />;
      case "STATUS_CHANGE":
        return <CheckCircle className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getEventColor = (action: string) => {
    switch (action) {
      case "INSERT":
      case "CREATE":
        return "bg-emerald-50 border-emerald-200";
      case "UPDATE":
      case "EDIT":
        return "bg-blue-50 border-blue-200";
      case "PAYMENT":
        return "bg-amber-50 border-amber-200";
      case "STATUS_CHANGE":
        return "bg-purple-50 border-purple-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const formatEventDescription = (event: TimelineEvent) => {
    try {
      // Invoice created
      if (event.action === "INSERT") {
        return "Invoice created";
      }

      // Invoice updated
      if (event.action === "UPDATE") {
        const oldData = event.old_data || {};
        const newData = event.new_data || {};
        const changes: string[] = [];

        // Status change
        if (oldData.status !== newData.status) {
          const oldStatus = formatStatusLabel(oldData.status);
          const newStatus = formatStatusLabel(newData.status);

          // If old status was "Not Set", it's being set for first time
          if (oldStatus === "Not Set") {
            changes.push(`Status set to ${newStatus}`);
          } else {
            changes.push(`Status: ${oldStatus} → ${newStatus}`);
          }
        }

        // Payment status change
        if (oldData.payment_status !== newData.payment_status) {
          const oldPayment = formatPaymentLabel(oldData.payment_status);
          const newPayment = formatPaymentLabel(newData.payment_status);

          // If old payment was "Not Set", it's being set for first time
          if (oldPayment === "Not Set") {
            changes.push(`Payment status set to ${newPayment}`);
          } else {
            changes.push(`Payment: ${oldPayment} → ${newPayment}`);
          }
        }

        // Total amount change
        if (oldData.grand_total !== newData.grand_total) {
          const oldTotal = oldData.grand_total;
          const newTotal = newData.grand_total;

          if (oldTotal && newTotal) {
            changes.push(
              `Total: ${formatCurrency(oldTotal)} → ${formatCurrency(newTotal)}`,
            );
          } else if (newTotal) {
            changes.push(`Total set to ${formatCurrency(newTotal)}`);
          } else {
            changes.push("Total updated");
          }
        }

        // Amount paid change
        if (oldData.amount_paid !== newData.amount_paid) {
          const oldPaid = oldData.amount_paid || 0;
          const newPaid = newData.amount_paid || 0;

          if (newPaid > oldPaid) {
            const payment = newPaid - oldPaid;
            changes.push(`Payment received: ${formatCurrency(payment)}`);
          } else {
            changes.push(`Amount paid updated to ${formatCurrency(newPaid)}`);
          }
        }

        // Services/items changes
        if (oldData.services_total !== newData.services_total) {
          changes.push("Services updated");
        }
        if (oldData.items_total !== newData.items_total) {
          changes.push("Items updated");
        }

        // Discount/tax changes
        if (oldData.discount !== newData.discount) {
          changes.push("Discount updated");
        }
        if (oldData.tax !== newData.tax) {
          changes.push("Tax updated");
        }

        return changes.length > 0 ? changes.join(", ") : "Invoice updated";
      }

      // Default
      return event.action;
    } catch (e) {
      console.error("Error formatting event:", e);
      return event.action;
    }
  };

  const buildBasicTimeline = () => {
    const timeline = [];

    // Invoice created
    timeline.push({
      id: "created",
      action: "CREATE",
      entity_type: "invoices",
      created_at: invoice.created_at,
      description: "Invoice created",
    });

    // Status changes
    if (invoice.status !== "draft") {
      timeline.push({
        id: "status",
        action: "STATUS_CHANGE",
        entity_type: "invoices",
        created_at: invoice.updated_at,
        description: `Status set to ${formatStatusLabel(invoice.status)}`,
      });
    }

    // Payment status
    if (invoice.payment_status === "paid") {
      timeline.push({
        id: "paid",
        action: "PAYMENT",
        entity_type: "invoices",
        created_at: invoice.updated_at,
        description: "Invoice paid in full",
      });
    } else if (invoice.payment_status === "partial") {
      timeline.push({
        id: "partial",
        action: "PAYMENT",
        entity_type: "invoices",
        created_at: invoice.updated_at,
        description: `Partial payment received: ${formatCurrency(invoice.amount_paid)}`,
      });
    }

    return timeline;
  };

  // Use audit logs if available, otherwise use basic timeline
  const timelineData = events.length > 0 ? events : buildBasicTimeline();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timeline & History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          {/* Events */}
          <div className="space-y-6">
            {timelineData.map((event, index) => (
              <div key={event.id} className="relative pl-14">
                {/* Icon */}
                <div
                  className={`absolute left-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${getEventColor(
                    event.action,
                  )}`}
                >
                  {getEventIcon(event.action)}
                </div>

                {/* Content */}
                <div className="bg-card border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium">
                        {event.description || formatEventDescription(event)}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(event.created_at), "PPP 'at' p")}
                      </div>
                      {event.employee && (
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          {event.employee.name}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">{event.action}</Badge>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {timelineData.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No timeline events yet</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
