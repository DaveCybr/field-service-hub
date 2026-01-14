-- Create customer_users table to link auth.users to customers
CREATE TABLE public.customer_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_users
CREATE POLICY "Users can view their own customer link"
ON public.customer_users FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Authenticated staff can manage customer users"
ON public.customer_users FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.employees 
    WHERE user_id = auth.uid()
  )
);

-- Allow customers to view their own jobs
CREATE POLICY "Customers can view their own jobs"
ON public.service_jobs FOR SELECT
USING (
  customer_id IN (
    SELECT customer_id FROM public.customer_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow customers to view their own units
CREATE POLICY "Customers can view their own units"
ON public.units FOR SELECT
USING (
  customer_id IN (
    SELECT customer_id FROM public.customer_users 
    WHERE user_id = auth.uid()
  )
);

-- Allow customers to view their own customer record
CREATE POLICY "Customers can view their own customer record"
ON public.customers FOR SELECT
USING (
  id IN (
    SELECT customer_id FROM public.customer_users 
    WHERE user_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_customer_users_updated_at
BEFORE UPDATE ON public.customer_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();