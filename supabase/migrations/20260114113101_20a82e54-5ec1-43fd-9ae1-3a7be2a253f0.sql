-- REKAMTEKNIK Phase 1 MVP Database Schema

-- 1. Create role enum for employees
CREATE TYPE public.employee_role AS ENUM ('admin', 'manager', 'technician', 'cashier');

-- 2. Create employee status enum
CREATE TYPE public.employee_status AS ENUM ('available', 'on_job', 'locked', 'off_duty');

-- 3. Create customer category enum
CREATE TYPE public.customer_category AS ENUM ('retail', 'project');

-- 4. Create job status enum
CREATE TYPE public.job_status AS ENUM (
  'pending_assignment', 
  'pending_approval', 
  'approved', 
  'in_progress', 
  'completed', 
  'completed_paid', 
  'cancelled'
);

-- 5. Create priority enum
CREATE TYPE public.job_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- 6. Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'partial', 'overdue');

-- 7. Create employees table (profiles for our users)
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role employee_role NOT NULL DEFAULT 'technician',
  status employee_status NOT NULL DEFAULT 'available',
  rating DECIMAL(3,2) DEFAULT 0,
  total_jobs_completed INTEGER DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Create technician skills table
CREATE TABLE public.technician_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  skill_name TEXT NOT NULL,
  proficiency_level TEXT DEFAULT 'intermediate',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (technician_id, skill_name)
);

-- 9. Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  category customer_category NOT NULL DEFAULT 'retail',
  payment_terms_days INTEGER DEFAULT 0,
  current_outstanding DECIMAL(15,2) DEFAULT 0,
  blacklisted BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Create units (electronic devices with QR codes)
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  unit_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  capacity TEXT,
  purchase_date DATE,
  warranty_expiry_date DATE,
  last_service_date DATE,
  total_services INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. Create service jobs table
CREATE TABLE public.service_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  assigned_technician_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  required_skills TEXT[] DEFAULT '{}',
  status job_status NOT NULL DEFAULT 'pending_assignment',
  priority job_priority NOT NULL DEFAULT 'normal',
  scheduled_date DATE,
  estimated_duration_minutes INTEGER DEFAULT 60,
  actual_checkin_at TIMESTAMP WITH TIME ZONE,
  actual_checkout_at TIMESTAMP WITH TIME ZONE,
  actual_duration_minutes INTEGER,
  service_address TEXT,
  service_latitude DECIMAL(10,8),
  service_longitude DECIMAL(11,8),
  before_photos TEXT[] DEFAULT '{}',
  after_photos TEXT[] DEFAULT '{}',
  checkin_gps_valid BOOLEAN,
  checkout_gps_valid BOOLEAN,
  payment_status payment_status DEFAULT 'pending',
  checkout_without_payment_approved BOOLEAN DEFAULT false,
  flagged BOOLEAN DEFAULT false,
  gps_violation_detected BOOLEAN DEFAULT false,
  technician_notes TEXT,
  admin_notes TEXT,
  service_cost DECIMAL(15,2) DEFAULT 0,
  parts_cost DECIMAL(15,2) DEFAULT 0,
  total_cost DECIMAL(15,2) DEFAULT 0,
  created_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12. Create user roles table (separate from employees for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role employee_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 13. Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role employee_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 14. Create function to get user's employee record
CREATE OR REPLACE FUNCTION public.get_employee_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.employees WHERE user_id = _user_id LIMIT 1
$$;

-- 15. Create function to generate job number
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  today_date TEXT;
  job_count INTEGER;
  new_number TEXT;
BEGIN
  today_date := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO job_count
  FROM public.service_jobs
  WHERE DATE(created_at) = CURRENT_DATE;
  new_number := 'JOB-' || today_date || '-' || LPAD(job_count::TEXT, 4, '0');
  RETURN new_number;
END;
$$;

-- 16. Create trigger to auto-generate job number
CREATE OR REPLACE FUNCTION public.set_job_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.job_number IS NULL OR NEW.job_number = '' THEN
    NEW.job_number := public.generate_job_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_job_number
  BEFORE INSERT ON public.service_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_job_number();

-- 17. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 18. Create triggers for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_units_updated_at
  BEFORE UPDATE ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_jobs_updated_at
  BEFORE UPDATE ON public.service_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 19. Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 20. RLS Policies for employees
CREATE POLICY "Authenticated users can view all employees"
  ON public.employees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins and managers can insert employees"
  ON public.employees FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Only admins and managers can update employees"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager') OR
    user_id = auth.uid()
  );

-- 21. RLS Policies for technician_skills
CREATE POLICY "Authenticated users can view all skills"
  ON public.technician_skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage skills"
  ON public.technician_skills FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- 22. RLS Policies for customers
CREATE POLICY "Authenticated users can view all customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON public.customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (true);

-- 23. RLS Policies for units
CREATE POLICY "Authenticated users can view all units"
  ON public.units FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert units"
  ON public.units FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update units"
  ON public.units FOR UPDATE
  TO authenticated
  USING (true);

-- 24. RLS Policies for service_jobs
CREATE POLICY "Authenticated users can view all jobs"
  ON public.service_jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert jobs"
  ON public.service_jobs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs"
  ON public.service_jobs FOR UPDATE
  TO authenticated
  USING (true);

-- 25. RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 26. Create trigger to auto-create employee profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.employees (user_id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::employee_role, 'technician')
  );
  
  -- Also add to user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::employee_role, 'technician')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 27. Create indexes for performance
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employees_role ON public.employees(role);
CREATE INDEX idx_employees_status ON public.employees(status);
CREATE INDEX idx_customers_category ON public.customers(category);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_units_customer_id ON public.units(customer_id);
CREATE INDEX idx_units_qr_code ON public.units(qr_code);
CREATE INDEX idx_service_jobs_status ON public.service_jobs(status);
CREATE INDEX idx_service_jobs_customer_id ON public.service_jobs(customer_id);
CREATE INDEX idx_service_jobs_technician_id ON public.service_jobs(assigned_technician_id);
CREATE INDEX idx_service_jobs_scheduled_date ON public.service_jobs(scheduled_date);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);