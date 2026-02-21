import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
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
import { id as localeId } from "date-fns/locale";
import type { Invoice } from "@/hooks/invoices/useInvoiceDetail";

interface TimelineEvent {
  id: string;
  action: string;
  entity_type: string;
  old_data?: any;
  new_data?: any;
  created_at: string;
  description?: string;
  employee?: { name: string };
}

const ACTION_LABELS: Record<string, string> = {
  INSERT: "DIBUAT",
  CREATE: "DIBUAT",
  UPDATE: "DIPERBARUI",
  EDIT: "DIEDIT",
  PAYMENT: "PEMBAYARAN",
  STATUS_CHANGE: "PERUBAHAN STATUS",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Menunggu",
  assigned: "Ditugaskan",
  in_progress: "Sedang Dikerjakan",
  completed: "Selesai",
  paid: "Lunas",
  cancelled: "Dibatalkan",
  closed: "Ditutup",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Belum Bayar",
  partial: "Bayar Sebagian",
  paid: "Lunas",
  overdue: "Jatuh Tempo",
};

function fmtCurrency(amount: number | null | undefined): string {
  if (!amount) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function TimelineTab({ invoice }: { invoice: Invoice }) {
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
        .select(`*, employee:employees!audit_logs_employee_id_fkey(name)`)
        .eq("entity_type", "invoices")
        .eq("entity_id", invoice.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch {
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

  const formatEventDescription = (event: TimelineEvent): string => {
    try {
      if (event.action === "INSERT") return "Faktur dibuat";

      if (event.action === "STATUS_CHANGE") {
        const from =
          STATUS_LABELS[event.old_data?.status] ||
          event.old_data?.status ||
          "-";
        const to =
          STATUS_LABELS[event.new_data?.status] ||
          event.new_data?.status ||
          "-";
        return `Status berubah: ${from} → ${to}`;
      }

      if (event.action === "PAYMENT") {
        const oldPaid = event.old_data?.amount_paid || 0;
        const newPaid = event.new_data?.amount_paid || 0;
        const paid = newPaid - oldPaid;
        const method = event.new_data?.payment_method || "tunai";
        return `Pembayaran diterima: ${fmtCurrency(paid)} (${method})`;
      }

      if (event.action === "UPDATE") {
        const old = event.old_data || {};
        const neu = event.new_data || {};
        const changes: string[] = [];

        if (old.status !== neu.status) {
          changes.push(
            `Status: ${STATUS_LABELS[old.status] || old.status} → ${STATUS_LABELS[neu.status] || neu.status}`,
          );
        }
        if (old.payment_status !== neu.payment_status) {
          changes.push(
            `Pembayaran: ${PAYMENT_LABELS[old.payment_status] || old.payment_status} → ${PAYMENT_LABELS[neu.payment_status] || neu.payment_status}`,
          );
        }
        if (old.grand_total !== neu.grand_total && neu.grand_total) {
          changes.push(
            `Total: ${fmtCurrency(old.grand_total)} → ${fmtCurrency(neu.grand_total)}`,
          );
        }
        if (old.amount_paid !== neu.amount_paid) {
          const diff = (neu.amount_paid || 0) - (old.amount_paid || 0);
          if (diff > 0) changes.push(`Pembayaran masuk: ${fmtCurrency(diff)}`);
        }
        return changes.length > 0 ? changes.join(", ") : "Faktur diperbarui";
      }

      return ACTION_LABELS[event.action] || event.action;
    } catch {
      return event.action;
    }
  };

  const buildBasicTimeline = (): TimelineEvent[] => {
    const timeline: TimelineEvent[] = [
      {
        id: "created",
        action: "CREATE",
        entity_type: "invoices",
        created_at: invoice.created_at,
        description: "Faktur dibuat",
      },
    ];

    if (invoice.status !== "draft") {
      timeline.push({
        id: "status",
        action: "STATUS_CHANGE",
        entity_type: "invoices",
        created_at: invoice.updated_at,
        description: `Status diubah ke: ${STATUS_LABELS[invoice.status] || invoice.status}`,
      });
    }

    if (invoice.payment_status === "paid") {
      timeline.push({
        id: "paid",
        action: "PAYMENT",
        entity_type: "invoices",
        created_at: invoice.updated_at,
        description: "Faktur telah dilunasi",
      });
    } else if (invoice.payment_status === "partial") {
      timeline.push({
        id: "partial",
        action: "PAYMENT",
        entity_type: "invoices",
        created_at: invoice.updated_at,
        description: `Pembayaran sebagian: ${fmtCurrency(invoice.amount_paid)}`,
      });
    }

    return timeline;
  };

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
          Riwayat & Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {timelineData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Belum ada riwayat aktivitas</p>
              </div>
            ) : (
              timelineData.map((event) => (
                <div key={event.id} className="relative pl-14">
                  <div
                    className={`absolute left-0 w-12 h-12 rounded-full border-2 flex items-center justify-center ${getEventColor(event.action)}`}
                  >
                    {getEventIcon(event.action)}
                  </div>

                  <div className="bg-card border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium">
                          {event.description || formatEventDescription(event)}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(
                            new Date(event.created_at),
                            "dd MMMM yyyy, HH:mm",
                            { locale: localeId },
                          )}
                        </div>
                        {event.employee && (
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {event.employee.name}
                          </div>
                        )}
                      </div>
                      <Badge variant="outline">
                        {ACTION_LABELS[event.action] || event.action}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
