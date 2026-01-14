-- Add superadmin to the employee_role enum
ALTER TYPE public.employee_role ADD VALUE IF NOT EXISTS 'superadmin';