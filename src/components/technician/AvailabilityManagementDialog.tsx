import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { Clock, CalendarOff, Trash2, Plus } from 'lucide-react';
import { format, addDays, isSameDay, isWithinInterval, parseISO } from 'date-fns';

interface AvailabilityManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicianId: string;
  technicianName: string;
  onAvailabilityUpdated: () => void;
}

interface DayAvailability {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface TimeOff {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

export default function AvailabilityManagementDialog({
  open,
  onOpenChange,
  technicianId,
  technicianName,
  onAvailabilityUpdated,
}: AvailabilityManagementDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [timeOffReason, setTimeOffReason] = useState('');
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  useEffect(() => {
    if (open && technicianId) {
      fetchAvailability();
      fetchTimeOffs();
    }
  }, [open, technicianId]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('technician_availability')
        .select('*')
        .eq('technician_id', technicianId)
        .order('day_of_week');

      if (error) throw error;

      // Initialize all 7 days with defaults if not present
      const availabilityMap = new Map(data?.map(a => [a.day_of_week, a]) || []);
      const fullAvailability: DayAvailability[] = DAYS_OF_WEEK.map(day => {
        const existing = availabilityMap.get(day.value);
        return existing || {
          day_of_week: day.value,
          start_time: '08:00',
          end_time: '17:00',
          is_available: day.value !== 0 && day.value !== 6, // Default off on weekends
        };
      });

      setAvailability(fullAvailability);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load availability.',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeOffs = async () => {
    try {
      const { data, error } = await supabase
        .from('technician_time_off')
        .select('*')
        .eq('technician_id', technicianId)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('start_date');

      if (error) throw error;
      setTimeOffs(data || []);
    } catch (error) {
      console.error('Error fetching time off:', error);
    }
  };

  const handleDayToggle = (dayIndex: number) => {
    setAvailability(prev =>
      prev.map(day =>
        day.day_of_week === dayIndex
          ? { ...day, is_available: !day.is_available }
          : day
      )
    );
  };

  const handleTimeChange = (dayIndex: number, field: 'start_time' | 'end_time', value: string) => {
    setAvailability(prev =>
      prev.map(day =>
        day.day_of_week === dayIndex ? { ...day, [field]: value } : day
      )
    );
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      // Delete existing availability for this technician
      await supabase
        .from('technician_availability')
        .delete()
        .eq('technician_id', technicianId);

      // Insert new availability
      const { error } = await supabase
        .from('technician_availability')
        .insert(
          availability.map(day => ({
            technician_id: technicianId,
            day_of_week: day.day_of_week,
            start_time: day.start_time,
            end_time: day.end_time,
            is_available: day.is_available,
          }))
        );

      if (error) throw error;

      toast({
        title: 'Availability Saved',
        description: 'Weekly schedule has been updated.',
      });

      onAvailabilityUpdated();
    } catch (error) {
      console.error('Error saving availability:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save availability.',
      });
    } finally {
      setSaving(false);
    }
  };

  const addTimeOff = async () => {
    if (selectedDates.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Select Dates',
        description: 'Please select at least one date.',
      });
      return;
    }

    setAddingTimeOff(true);
    try {
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      const startDate = sortedDates[0];
      const endDate = sortedDates[sortedDates.length - 1];

      const { error } = await supabase
        .from('technician_time_off')
        .insert({
          technician_id: technicianId,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          reason: timeOffReason || null,
        });

      if (error) throw error;

      toast({
        title: 'Time Off Added',
        description: `Time off from ${format(startDate, 'MMM d')} to ${format(endDate, 'MMM d')} added.`,
      });

      setSelectedDates([]);
      setTimeOffReason('');
      fetchTimeOffs();
      onAvailabilityUpdated();
    } catch (error) {
      console.error('Error adding time off:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add time off.',
      });
    } finally {
      setAddingTimeOff(false);
    }
  };

  const deleteTimeOff = async (id: string) => {
    try {
      const { error } = await supabase
        .from('technician_time_off')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Time Off Removed',
        description: 'The time off entry has been deleted.',
      });

      fetchTimeOffs();
      onAvailabilityUpdated();
    } catch (error) {
      console.error('Error deleting time off:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete time off.',
      });
    }
  };

  // Get dates that are within existing time off periods for calendar highlighting
  const timeOffDates = timeOffs.flatMap(to => {
    const dates: Date[] = [];
    let current = parseISO(to.start_date);
    const end = parseISO(to.end_date);
    while (current <= end) {
      dates.push(current);
      current = addDays(current, 1);
    }
    return dates;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Manage Availability - {technicianName}
          </DialogTitle>
          <DialogDescription>
            Set weekly working hours and schedule time off.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="weekly" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekly">Weekly Schedule</TabsTrigger>
            <TabsTrigger value="timeoff">Time Off</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-4 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {DAYS_OF_WEEK.map(day => {
                    const dayAvail = availability.find(a => a.day_of_week === day.value);
                    return (
                      <div
                        key={day.value}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          dayAvail?.is_available ? 'bg-card' : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={dayAvail?.is_available || false}
                            onCheckedChange={() => handleDayToggle(day.value)}
                          />
                          <span className={`font-medium w-24 ${!dayAvail?.is_available ? 'text-muted-foreground' : ''}`}>
                            {day.label}
                          </span>
                        </div>
                        
                        {dayAvail?.is_available && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={dayAvail.start_time}
                              onChange={(e) => handleTimeChange(day.value, 'start_time', e.target.value)}
                              className="w-32"
                            />
                            <span className="text-muted-foreground">to</span>
                            <Input
                              type="time"
                              value={dayAvail.end_time}
                              onChange={(e) => handleTimeChange(day.value, 'end_time', e.target.value)}
                              className="w-32"
                            />
                          </div>
                        )}
                        
                        {!dayAvail?.is_available && (
                          <Badge variant="secondary">Not Working</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={saveAvailability} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Schedule'}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="timeoff" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="mb-2 block">Select Dates</Label>
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(dates) => setSelectedDates(dates || [])}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      modifiers={{
                        timeOff: timeOffDates,
                      }}
                      modifiersStyles={{
                        timeOff: { backgroundColor: 'hsl(var(--destructive) / 0.2)', color: 'hsl(var(--destructive))' },
                      }}
                      className="rounded-md border"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reason">Reason (Optional)</Label>
                      <Input
                        id="reason"
                        placeholder="e.g., Vacation, Medical leave"
                        value={timeOffReason}
                        onChange={(e) => setTimeOffReason(e.target.value)}
                      />
                    </div>
                    
                    {selectedDates.length > 0 && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Selected:</p>
                        <p className="font-medium">
                          {selectedDates.length === 1
                            ? format(selectedDates[0], 'MMMM d, yyyy')
                            : `${format(selectedDates.sort((a, b) => a.getTime() - b.getTime())[0], 'MMM d')} - ${format(selectedDates.sort((a, b) => a.getTime() - b.getTime())[selectedDates.length - 1], 'MMM d, yyyy')}`
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">{selectedDates.length} day(s)</p>
                      </div>
                    )}
                    
                    <Button
                      onClick={addTimeOff}
                      disabled={addingTimeOff || selectedDates.length === 0}
                      className="w-full"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {addingTimeOff ? 'Adding...' : 'Add Time Off'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {timeOffs.length > 0 && (
              <div className="space-y-2">
                <Label>Scheduled Time Off</Label>
                <div className="space-y-2">
                  {timeOffs.map((to) => (
                    <div
                      key={to.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarOff className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {format(parseISO(to.start_date), 'MMM d')} - {format(parseISO(to.end_date), 'MMM d, yyyy')}
                          </p>
                          {to.reason && (
                            <p className="text-sm text-muted-foreground">{to.reason}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTimeOff(to.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}