-- Drop existing policies for service_jobs
DROP POLICY IF EXISTS "Authenticated users can view all jobs" ON public.service_jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.service_jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON public.service_jobs;

-- Create a function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('superadmin', 'admin', 'manager')
  )
$$;

-- Create a function to check if user is cashier
CREATE OR REPLACE FUNCTION public.is_cashier(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'cashier'
  )
$$;

-- Technicians can only view jobs assigned to them
-- Admins, managers, superadmins can view all jobs
-- Cashiers can view jobs for payment processing (completed status)
CREATE POLICY "Role-based job view access"
ON public.service_jobs
FOR SELECT
TO authenticated
USING (
  -- Superadmin, admin, manager can see all jobs
  is_admin_or_manager(auth.uid())
  OR
  -- Technicians can only see jobs assigned to them
  (has_role(auth.uid(), 'technician') AND assigned_technician_id = get_employee_id(auth.uid()))
  OR
  -- Cashiers can see completed jobs for payment processing
  (is_cashier(auth.uid()) AND status IN ('completed', 'completed_paid'))
  OR
  -- Customers can view their own jobs
  customer_id IN (SELECT customer_id FROM customer_users WHERE user_id = auth.uid())
);

-- Only admin, manager can insert jobs
-- Technicians cannot create jobs
CREATE POLICY "Admin and manager can create jobs"
ON public.service_jobs
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin_or_manager(auth.uid())
);

-- Technicians can only update their own jobs (for checkin/checkout, notes, photos)
-- Cashiers can update payment status on completed jobs
-- Admins and managers can update all jobs
CREATE POLICY "Role-based job update access"
ON public.service_jobs
FOR UPDATE
TO authenticated
USING (
  -- Superadmin, admin, manager can update all jobs
  is_admin_or_manager(auth.uid())
  OR
  -- Technicians can only update jobs assigned to them
  (has_role(auth.uid(), 'technician') AND assigned_technician_id = get_employee_id(auth.uid()))
  OR
  -- Cashiers can update completed jobs for payment processing
  (is_cashier(auth.uid()) AND status IN ('completed', 'completed_paid'))
);