-- Create technician_availability table to store weekly availability schedules
CREATE TABLE public.technician_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '17:00',
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(technician_id, day_of_week)
);

-- Create technician_time_off table for specific dates off
CREATE TABLE public.technician_time_off (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  technician_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technician_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_time_off ENABLE ROW LEVEL SECURITY;

-- RLS policies for technician_availability
CREATE POLICY "Authenticated users can view all availability"
ON public.technician_availability FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert availability"
ON public.technician_availability FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update availability"
ON public.technician_availability FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete availability"
ON public.technician_availability FOR DELETE
USING (auth.uid() IS NOT NULL);

-- RLS policies for technician_time_off
CREATE POLICY "Authenticated users can view all time off"
ON public.technician_time_off FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert time off"
ON public.technician_time_off FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update time off"
ON public.technician_time_off FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete time off"
ON public.technician_time_off FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add updated_at triggers
CREATE TRIGGER update_technician_availability_updated_at
BEFORE UPDATE ON public.technician_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_technician_time_off_updated_at
BEFORE UPDATE ON public.technician_time_off
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();