import { useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventDropArg, EventClickArg } from '@fullcalendar/core';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Service {
  id: string;
  title: string;
  status: string;
  priority: string;
  scheduled_date: string | null;
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  technician_name: string | null;
  total_cost: number;
}

interface JobCalendarProps {
  jobs: Service[];
  onJobUpdated: () => void;
}

interface RescheduleInfo {
  serviceId: string;
  invoiceNumber: string;
  title: string;
  oldDate: Date;
  newDate: Date;
}

export default function JobCalendar({ jobs, onJobUpdated }: JobCalendarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rescheduleInfo, setRescheduleInfo] = useState<RescheduleInfo | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'hsl(var(--chart-4))',
      normal: 'hsl(var(--chart-2))',
      high: 'hsl(var(--chart-3))',
      urgent: 'hsl(var(--destructive))',
    };
    return colors[priority] || 'hsl(var(--primary))';
  };

  const getStatusBorderColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'hsl(var(--muted-foreground))',
      assigned: 'hsl(var(--chart-1))',
      in_progress: 'hsl(var(--chart-3))',
      completed: 'hsl(var(--chart-4))',
      cancelled: 'hsl(var(--destructive))',
    };
    return colors[status] || 'hsl(var(--border))';
  };

  const events = jobs
    .filter(job => job.scheduled_date)
    .map(job => ({
      id: job.id,
      title: `${job.invoice_number} - ${job.title}`,
      start: job.scheduled_date!,
      allDay: true,
      backgroundColor: getPriorityColor(job.priority),
      borderColor: getStatusBorderColor(job.status),
      extendedProps: {
        invoice_number: job.invoice_number,
        invoice_id: job.invoice_id,
        customer_name: job.customer_name,
        technician_name: job.technician_name,
        status: job.status,
        priority: job.priority,
      },
    }));

  const handleEventClick = useCallback((info: EventClickArg) => {
    const invoiceId = info.event.extendedProps.invoice_id;
    navigate(`/invoices/${invoiceId}`);
  }, [navigate]);

  const handleEventDrop = useCallback((info: EventDropArg) => {
    const job = jobs.find(j => j.id === info.event.id);
    if (!job) return;

    setRescheduleInfo({
      serviceId: info.event.id,
      invoiceNumber: job.invoice_number,
      title: job.title,
      oldDate: info.oldEvent.start!,
      newDate: info.event.start!,
    });
  }, [jobs]);

  const confirmReschedule = async () => {
    if (!rescheduleInfo) return;

    setIsRescheduling(true);
    try {
      const { error } = await supabase
        .from('invoice_services')
        .update({ scheduled_date: rescheduleInfo.newDate.toISOString() })
        .eq('id', rescheduleInfo.serviceId);

      if (error) throw error;

      toast({
        title: 'Service Rescheduled',
        description: `Service moved to ${format(rescheduleInfo.newDate, 'MMM d, yyyy')}`,
      });

      onJobUpdated();
    } catch (error) {
      console.error('Error rescheduling service:', error);
      toast({
        variant: 'destructive',
        title: 'Reschedule Failed',
        description: 'Failed to reschedule the service. Please try again.',
      });
      onJobUpdated();
    } finally {
      setIsRescheduling(false);
      setRescheduleInfo(null);
    }
  };

  const cancelReschedule = () => {
    setRescheduleInfo(null);
    onJobUpdated();
  };

  const renderEventContent = (eventInfo: any) => {
    const { extendedProps } = eventInfo.event;
    return (
      <div className="p-1 overflow-hidden cursor-pointer">
        <div className="font-medium text-xs truncate text-white">
          {extendedProps.invoice_number}
        </div>
        <div className="text-xs truncate opacity-90 text-white">
          {extendedProps.customer_name}
        </div>
        {extendedProps.technician_name && (
          <div className="text-xs truncate opacity-75 text-white">
            👤 {extendedProps.technician_name}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="fc-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
          }}
          events={events}
          editable={true}
          droppable={true}
          eventDrop={handleEventDrop}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          height="auto"
          dayMaxEvents={3}
          moreLinkClick="popover"
        />
      </div>

      <Dialog open={!!rescheduleInfo} onOpenChange={(open) => !open && cancelReschedule()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Reschedule</DialogTitle>
            <DialogDescription>
              Are you sure you want to reschedule this service?
            </DialogDescription>
          </DialogHeader>
          
          {rescheduleInfo && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Invoice:</span>
                  <p className="font-medium">{rescheduleInfo.invoiceNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Service:</span>
                  <p className="font-medium">{rescheduleInfo.title}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex-1 p-3 rounded-lg bg-muted">
                  <span className="text-xs text-muted-foreground block">From</span>
                  <span className="font-medium">
                    {format(rescheduleInfo.oldDate, 'EEEE, MMM d, yyyy')}
                  </span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex-1 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="text-xs text-primary block">To</span>
                  <span className="font-medium text-primary">
                    {format(rescheduleInfo.newDate, 'EEEE, MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={cancelReschedule} disabled={isRescheduling}>
              Cancel
            </Button>
            <Button onClick={confirmReschedule} disabled={isRescheduling}>
              {isRescheduling ? 'Rescheduling...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
