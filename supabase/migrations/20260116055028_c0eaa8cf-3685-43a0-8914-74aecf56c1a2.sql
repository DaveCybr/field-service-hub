-- =============================================
-- DROP OLD STRUCTURE (as requested - start fresh)
-- =============================================

-- Drop old service_jobs related triggers and functions first
DROP TRIGGER IF EXISTS on_service_job_created ON public.service_jobs;
DROP FUNCTION IF EXISTS public.notify_job_assignment();

-- Drop old service_jobs table (cascade will remove related constraints)
DROP TABLE IF EXISTS public.service_jobs CASCADE;

-- =============================================
-- CREATE NEW INVOICE STRUCTURE
-- =============================================

-- Main Invoices table (replaces service_jobs as the main transaction)
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  
  -- Dates
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'in_progress', 'completed', 'paid', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  
  -- Costs (calculated from services + items)
  services_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  items_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  admin_notes TEXT,
  created_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invoice Services table (multiple services per invoice)
CREATE TABLE public.invoice_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  
  -- Service details
  title TEXT NOT NULL,
  description TEXT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  
  -- Assignment
  assigned_technician_id UUID REFERENCES public.employees(id),
  required_skills TEXT[],
  
  -- Scheduling
  scheduled_date TIMESTAMP WITH TIME ZONE,
  estimated_duration_minutes INTEGER,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Work tracking
  actual_checkin_at TIMESTAMP WITH TIME ZONE,
  actual_checkout_at TIMESTAMP WITH TIME ZONE,
  actual_duration_minutes INTEGER,
  
  -- GPS validation
  service_address TEXT,
  service_latitude NUMERIC(10,7),
  service_longitude NUMERIC(10,7),
  checkin_gps_valid BOOLEAN,
  checkout_gps_valid BOOLEAN,
  gps_violation_detected BOOLEAN DEFAULT false,
  
  -- Photos
  before_photos TEXT[],
  after_photos TEXT[],
  
  -- Notes
  technician_notes TEXT,
  admin_notes TEXT,
  
  -- Costs
  service_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  parts_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Invoice Items table (products purchased in invoice)
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  
  -- Item details (snapshot at time of sale)
  product_name TEXT NOT NULL,
  product_sku TEXT,
  description TEXT,
  
  -- Quantity and pricing
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(12,2) NOT NULL,
  
  -- For appliance sales that become units
  register_as_unit BOOLEAN DEFAULT false,
  registered_unit_id UUID REFERENCES public.units(id),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_payment_status ON public.invoices(payment_status);
CREATE INDEX idx_invoices_invoice_date ON public.invoices(invoice_date);
CREATE INDEX idx_invoices_created_by ON public.invoices(created_by);

CREATE INDEX idx_invoice_services_invoice_id ON public.invoice_services(invoice_id);
CREATE INDEX idx_invoice_services_technician ON public.invoice_services(assigned_technician_id);
CREATE INDEX idx_invoice_services_status ON public.invoice_services(status);
CREATE INDEX idx_invoice_services_scheduled_date ON public.invoice_services(scheduled_date);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product_id ON public.invoice_items(product_id);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - Invoices
-- =============================================
CREATE POLICY "Admin/Manager can do everything on invoices"
  ON public.invoices FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Cashier can view and create invoices"
  ON public.invoices FOR SELECT
  USING (public.is_cashier(auth.uid()));

CREATE POLICY "Cashier can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (public.is_cashier(auth.uid()));

CREATE POLICY "Cashier can update invoices"
  ON public.invoices FOR UPDATE
  USING (public.is_cashier(auth.uid()));

CREATE POLICY "Technician can view related invoices"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice_services 
      WHERE invoice_id = invoices.id 
      AND assigned_technician_id = public.get_employee_id(auth.uid())
    )
  );

-- =============================================
-- RLS POLICIES - Invoice Services
-- =============================================
CREATE POLICY "Admin/Manager can do everything on invoice_services"
  ON public.invoice_services FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Cashier can manage invoice_services"
  ON public.invoice_services FOR ALL
  USING (public.is_cashier(auth.uid()));

CREATE POLICY "Technician can view assigned services"
  ON public.invoice_services FOR SELECT
  USING (assigned_technician_id = public.get_employee_id(auth.uid()));

CREATE POLICY "Technician can update assigned services"
  ON public.invoice_services FOR UPDATE
  USING (assigned_technician_id = public.get_employee_id(auth.uid()));

-- =============================================
-- RLS POLICIES - Invoice Items
-- =============================================
CREATE POLICY "Admin/Manager can do everything on invoice_items"
  ON public.invoice_items FOR ALL
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Cashier can manage invoice_items"
  ON public.invoice_items FOR ALL
  USING (public.is_cashier(auth.uid()));

CREATE POLICY "Technician can view items from assigned invoices"
  ON public.invoice_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice_services 
      WHERE invoice_id = invoice_items.invoice_id 
      AND assigned_technician_id = public.get_employee_id(auth.uid())
    )
  );

-- =============================================
-- FUNCTIONS
-- =============================================

-- Generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  today_prefix TEXT;
  seq_num INTEGER;
BEGIN
  today_prefix := 'INV-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-';
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM LENGTH(today_prefix) + 1) AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM public.invoices
  WHERE invoice_number LIKE today_prefix || '%';
  
  new_number := today_prefix || LPAD(seq_num::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recalculate invoice totals
CREATE OR REPLACE FUNCTION public.recalculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_services_total NUMERIC(12,2);
  v_items_total NUMERIC(12,2);
  v_invoice_id UUID;
BEGIN
  -- Determine which invoice to update
  IF TG_TABLE_NAME = 'invoice_services' THEN
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  ELSIF TG_TABLE_NAME = 'invoice_items' THEN
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  END IF;
  
  -- Calculate services total
  SELECT COALESCE(SUM(total_cost), 0) INTO v_services_total
  FROM public.invoice_services
  WHERE invoice_id = v_invoice_id;
  
  -- Calculate items total
  SELECT COALESCE(SUM(total_price), 0) INTO v_items_total
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;
  
  -- Update invoice
  UPDATE public.invoices
  SET 
    services_total = v_services_total,
    items_total = v_items_total,
    grand_total = v_services_total + v_items_total - discount + tax,
    updated_at = now()
  WHERE id = v_invoice_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Update invoice status based on services
CREATE OR REPLACE FUNCTION public.update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_total_services INTEGER;
  v_completed_services INTEGER;
  v_in_progress_services INTEGER;
  v_current_status TEXT;
  v_payment_status TEXT;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- Count services by status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'in_progress')
  INTO v_total_services, v_completed_services, v_in_progress_services
  FROM public.invoice_services
  WHERE invoice_id = v_invoice_id;
  
  -- Get current payment status
  SELECT payment_status INTO v_payment_status
  FROM public.invoices
  WHERE id = v_invoice_id;
  
  -- Determine new status
  IF v_total_services = 0 THEN
    -- No services, check if there are items
    SELECT 
      CASE 
        WHEN v_payment_status = 'paid' THEN 'paid'
        ELSE 'pending'
      END INTO v_current_status;
  ELSIF v_completed_services = v_total_services THEN
    -- All services completed
    IF v_payment_status = 'paid' THEN
      v_current_status := 'paid';
    ELSE
      v_current_status := 'completed';
    END IF;
  ELSIF v_in_progress_services > 0 OR v_completed_services > 0 THEN
    v_current_status := 'in_progress';
  ELSE
    v_current_status := 'pending';
  END IF;
  
  -- Update invoice status
  UPDATE public.invoices
  SET status = v_current_status, updated_at = now()
  WHERE id = v_invoice_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-register unit when appliance is sold
CREATE OR REPLACE FUNCTION public.register_sold_unit()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_product RECORD;
  v_new_unit_id UUID;
  v_qr_code TEXT;
BEGIN
  IF NEW.register_as_unit = true AND NEW.registered_unit_id IS NULL THEN
    -- Get customer from invoice
    SELECT customer_id INTO v_customer_id
    FROM public.invoices
    WHERE id = NEW.invoice_id;
    
    -- Get product details
    SELECT * INTO v_product
    FROM public.products
    WHERE id = NEW.product_id;
    
    -- Generate QR code
    v_qr_code := 'UNIT-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                 LPAD((FLOOR(RANDOM() * 10000))::TEXT, 4, '0');
    
    -- Create new unit
    INSERT INTO public.units (
      customer_id,
      unit_type,
      brand,
      model,
      qr_code,
      purchase_date,
      notes
    ) VALUES (
      v_customer_id,
      COALESCE(v_product.name, NEW.product_name),
      COALESCE(v_product.description, ''),
      v_product.sku,
      v_qr_code,
      now(),
      'Purchased via Invoice'
    )
    RETURNING id INTO v_new_unit_id;
    
    -- Link unit to invoice item
    NEW.registered_unit_id := v_new_unit_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- TRIGGERS
-- =============================================

-- Recalculate totals on services change
CREATE TRIGGER recalc_invoice_on_services_change
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_services
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_invoice_totals();

-- Recalculate totals on items change
CREATE TRIGGER recalc_invoice_on_items_change
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_invoice_totals();

-- Update invoice status on service status change
CREATE TRIGGER update_invoice_status_trigger
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.invoice_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoice_status();

-- Auto-register unit when appliance sold
CREATE TRIGGER register_sold_unit_trigger
  BEFORE INSERT OR UPDATE OF register_as_unit ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.register_sold_unit();

-- Update timestamps
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_services_updated_at
  BEFORE UPDATE ON public.invoice_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_items_updated_at
  BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoice_services;