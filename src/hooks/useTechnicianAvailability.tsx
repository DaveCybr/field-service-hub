import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isWithinInterval, getDay } from 'date-fns';

interface TechnicianAvailability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface TechnicianTimeOff {
  start_date: string;
  end_date: string;
}

interface AvailableTechnician {
  id: string;
  name: string;
  email: string;
  status: string;
  rating: number;
  isAvailable: boolean;
  availabilityReason?: string;
  workingHours?: string;
}

export function useTechnicianAvailability() {
  const [loading, setLoading] = useState(false);

  const checkAvailabilityForDate = useCallback(async (
    technicianIds: string[],
    targetDate: Date
  ): Promise<Map<string, { isAvailable: boolean; reason?: string; workingHours?: string }>> => {
    const results = new Map<string, { isAvailable: boolean; reason?: string; workingHours?: string }>();

    if (technicianIds.length === 0) return results;

    try {
      // Fetch availability schedules
      const { data: availabilityData } = await supabase
        .from('technician_availability')
        .select('*')
        .in('technician_id', technicianIds);

      // Fetch time off
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      const { data: timeOffData } = await supabase
        .from('technician_time_off')
        .select('*')
        .in('technician_id', technicianIds)
        .lte('start_date', dateStr)
        .gte('end_date', dateStr);

      const dayOfWeek = getDay(targetDate);
      const availabilityMap = new Map<string, TechnicianAvailability[]>();
      const timeOffMap = new Map<string, TechnicianTimeOff[]>();

      // Group availability by technician
      availabilityData?.forEach(a => {
        const existing = availabilityMap.get(a.technician_id) || [];
        existing.push(a);
        availabilityMap.set(a.technician_id, existing);
      });

      // Group time off by technician
      timeOffData?.forEach(t => {
        const existing = timeOffMap.get(t.technician_id) || [];
        existing.push(t);
        timeOffMap.set(t.technician_id, existing);
      });

      // Check each technician
      for (const techId of technicianIds) {
        const techTimeOffs = timeOffMap.get(techId) || [];
        
        // Check if on time off
        if (techTimeOffs.length > 0) {
          const timeOff = techTimeOffs[0];
          results.set(techId, {
            isAvailable: false,
            reason: `On leave (${format(parseISO(timeOff.start_date), 'MMM d')} - ${format(parseISO(timeOff.end_date), 'MMM d')})`,
          });
          continue;
        }

        // Check weekly schedule
        const techAvailability = availabilityMap.get(techId) || [];
        const daySchedule = techAvailability.find(a => a.day_of_week === dayOfWeek);

        if (!daySchedule) {
          // No schedule set - assume available with default hours
          results.set(techId, {
            isAvailable: true,
            workingHours: '08:00 - 17:00',
          });
        } else if (!daySchedule.is_available) {
          results.set(techId, {
            isAvailable: false,
            reason: 'Not working this day',
          });
        } else {
          results.set(techId, {
            isAvailable: true,
            workingHours: `${daySchedule.start_time.slice(0, 5)} - ${daySchedule.end_time.slice(0, 5)}`,
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error checking availability:', error);
      // Return all as available if error
      technicianIds.forEach(id => results.set(id, { isAvailable: true }));
      return results;
    }
  }, []);

  const getAvailableTechniciansForDate = useCallback(async (
    targetDate: Date
  ): Promise<AvailableTechnician[]> => {
    setLoading(true);
    try {
      // Fetch all technicians
      const { data: technicians, error } = await supabase
        .from('employees')
        .select('id, name, email, status, rating')
        .eq('role', 'technician')
        .order('name');

      if (error) throw error;

      const techIds = technicians?.map(t => t.id) || [];
      const availabilityMap = await checkAvailabilityForDate(techIds, targetDate);

      return technicians?.map(tech => {
        const availability = availabilityMap.get(tech.id);
        return {
          ...tech,
          rating: tech.rating || 0,
          isAvailable: availability?.isAvailable ?? true,
          availabilityReason: availability?.reason,
          workingHours: availability?.workingHours,
        };
      }) || [];
    } catch (error) {
      console.error('Error fetching technicians:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [checkAvailabilityForDate]);

  return {
    loading,
    checkAvailabilityForDate,
    getAvailableTechniciansForDate,
  };
}