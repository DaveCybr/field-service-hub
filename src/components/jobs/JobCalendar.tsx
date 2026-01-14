import { useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventDropArg, EventClickArg } from '@fullcalendar/core';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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

interface Job {
  id: string;
  job_number: string;
  title: string;
  status: string;
  priority: string;
  scheduled_date: string | null;
  customer_name: string;
  technician_name: string | null;
  total_cost: number;
}

interface JobCalendarProps {
  jobs: Job[];
  onJobUpdated: () => void;
}

interface RescheduleInfo {
  jobId: string;
  jobNumber: string;
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
      pending_assignment: 'hsl(var(--muted-foreground))',
      pending_approval: 'hsl(var(--chart-1))',
      approved: 'hsl(var(--chart-2))',
      in_progress: 'hsl(var(--chart-3))',
      completed: 'hsl(var(--chart-4))',
      completed_paid: 'hsl(var(--chart-5))',
      cancelled: 'hsl(var(--destructive))',
    };
    return colors[status] || 'hsl(var(--border))';
  };

  const events = jobs
    .filter(job => job.scheduled_date)
    .map(job => ({
      id: job.id,
      title: `${job.job_number} - ${job.title}`,
      start: job.scheduled_date!,
      allDay: true,
      backgroundColor: getPriorityColor(job.priority),
      borderColor: getStatusBorderColor(job.status),
      extendedProps: {
        job_number: job.job_number,
        customer_name: job.customer_name,
        technician_name: job.technician_name,
        status: job.status,
        priority: job.priority,
      },
    }));

  const handleEventClick = useCallback((info: EventClickArg) => {
    navigate(`/jobs/${info.event.id}`);
  }, [navigate]);

  const handleEventDrop = useCallback((info: EventDropArg) => {
    const job = jobs.find(j => j.id === info.event.id);
    if (!job) return;

    setRescheduleInfo({
      jobId: info.event.id,
      jobNumber: job.job_number,
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
        .from('service_jobs')
        .update({ scheduled_date: rescheduleInfo.newDate.toISOString().split('T')[0] })
        .eq('id', rescheduleInfo.jobId);

      if (error) throw error;

      toast({
        title: 'Job Rescheduled',
        description: `${rescheduleInfo.jobNumber} moved to ${format(rescheduleInfo.newDate, 'MMM d, yyyy')}`,
      });

      onJobUpdated();
    } catch (error) {
      console.error('Error rescheduling job:', error);
      toast({
        variant: 'destructive',
        title: 'Reschedule Failed',
        description: 'Failed to reschedule the job. Please try again.',
      });
      onJobUpdated(); // Refresh to revert the visual change
    } finally {
      setIsRescheduling(false);
      setRescheduleInfo(null);
    }
  };

  const cancelReschedule = () => {
    setRescheduleInfo(null);
    onJobUpdated(); // Refresh to revert the visual change
  };

  const renderEventContent = (eventInfo: any) => {
    const { extendedProps } = eventInfo.event;
    return (
      <div className="p-1 overflow-hidden cursor-pointer">
        <div className="font-medium text-xs truncate text-white">
          {eventInfo.event.extendedProps.job_number}
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
              Are you sure you want to reschedule this job?
            </DialogDescription>
          </DialogHeader>
          
          {rescheduleInfo && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Job:</span>
                  <p className="font-medium">{rescheduleInfo.jobNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Title:</span>
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
