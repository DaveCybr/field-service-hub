-- Fix function search path warnings
CREATE OR REPLACE FUNCTION public.recalculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_services_total NUMERIC(12,2);
  v_items_total NUMERIC(12,2);
  v_invoice_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'invoice_services' THEN
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  ELSIF TG_TABLE_NAME = 'invoice_items' THEN
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  END IF;
  
  SELECT COALESCE(SUM(total_cost), 0) INTO v_services_total
  FROM public.invoice_services
  WHERE invoice_id = v_invoice_id;
  
  SELECT COALESCE(SUM(total_price), 0) INTO v_items_total
  FROM public.invoice_items
  WHERE invoice_id = v_invoice_id;
  
  UPDATE public.invoices
  SET 
    services_total = v_services_total,
    items_total = v_items_total,
    grand_total = v_services_total + v_items_total - discount + tax,
    updated_at = now()
  WHERE id = v_invoice_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
  
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'in_progress')
  INTO v_total_services, v_completed_services, v_in_progress_services
  FROM public.invoice_services
  WHERE invoice_id = v_invoice_id;
  
  SELECT payment_status INTO v_payment_status
  FROM public.invoices
  WHERE id = v_invoice_id;
  
  IF v_total_services = 0 THEN
    SELECT 
      CASE 
        WHEN v_payment_status = 'paid' THEN 'paid'
        ELSE 'pending'
      END INTO v_current_status;
  ELSIF v_completed_services = v_total_services THEN
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
  
  UPDATE public.invoices
  SET status = v_current_status, updated_at = now()
  WHERE id = v_invoice_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.register_sold_unit()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_product RECORD;
  v_new_unit_id UUID;
  v_qr_code TEXT;
BEGIN
  IF NEW.register_as_unit = true AND NEW.registered_unit_id IS NULL THEN
    SELECT customer_id INTO v_customer_id
    FROM public.invoices
    WHERE id = NEW.invoice_id;
    
    SELECT * INTO v_product
    FROM public.products
    WHERE id = NEW.product_id;
    
    v_qr_code := 'UNIT-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                 LPAD((FLOOR(RANDOM() * 10000))::TEXT, 4, '0');
    
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
    
    NEW.registered_unit_id := v_new_unit_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;