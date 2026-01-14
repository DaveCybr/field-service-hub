-- Products/Inventory Table for REKAMTEKNIK

-- 1. Create product category enum
CREATE TYPE public.product_category AS ENUM (
  'spare_parts',
  'consumables', 
  'equipment',
  'accessories',
  'service_labor'
);

-- 2. Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category product_category NOT NULL DEFAULT 'spare_parts',
  unit TEXT NOT NULL DEFAULT 'pcs',
  cost_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  sell_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock_threshold INTEGER NOT NULL DEFAULT 5,
  is_service_item BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create inventory transactions table for stock movements
CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL, -- sale, service_usage, purchase, adjustment
  quantity INTEGER NOT NULL, -- negative for out, positive for in
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reference_id UUID, -- can link to service_job_id or transaction_id
  notes TEXT,
  created_by UUID REFERENCES public.employees(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create stock alerts table
CREATE TABLE public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'low_stock', -- low_stock, out_of_stock
  current_stock INTEGER NOT NULL,
  threshold INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, acknowledged, resolved
  acknowledged_by UUID REFERENCES public.employees(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for products
CREATE POLICY "Authenticated users can view all products"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins and managers can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'manager')
  );

-- 7. RLS Policies for inventory_transactions
CREATE POLICY "Authenticated users can view inventory transactions"
  ON public.inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert inventory transactions"
  ON public.inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 8. RLS Policies for stock_alerts
CREATE POLICY "Authenticated users can view stock alerts"
  ON public.stock_alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage stock alerts"
  ON public.stock_alerts FOR ALL
  TO authenticated
  USING (true);

-- 9. Create trigger for products updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Create function to check and create stock alerts
CREATE OR REPLACE FUNCTION public.check_stock_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Check if stock is at or below threshold
  IF NEW.stock <= NEW.min_stock_threshold THEN
    -- Check if there's already an active alert
    IF NOT EXISTS (
      SELECT 1 FROM public.stock_alerts 
      WHERE product_id = NEW.id AND status = 'active'
    ) THEN
      INSERT INTO public.stock_alerts (product_id, alert_type, current_stock, threshold)
      VALUES (
        NEW.id,
        CASE WHEN NEW.stock = 0 THEN 'out_of_stock' ELSE 'low_stock' END,
        NEW.stock,
        NEW.min_stock_threshold
      );
    END IF;
  ELSE
    -- Resolve any active alerts if stock is back above threshold
    UPDATE public.stock_alerts 
    SET status = 'resolved'
    WHERE product_id = NEW.id AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_stock_alert
  AFTER UPDATE OF stock ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_stock_alert();

-- 11. Create function to generate SKU
CREATE OR REPLACE FUNCTION public.generate_sku(category_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  sku_count INTEGER;
  new_sku TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO sku_count FROM public.products;
  new_sku := category_prefix || '-' || LPAD(sku_count::TEXT, 5, '0');
  RETURN new_sku;
END;
$$;

-- 12. Create indexes for performance
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_stock ON public.products(stock);
CREATE INDEX idx_inventory_transactions_product ON public.inventory_transactions(product_id);
CREATE INDEX idx_stock_alerts_product ON public.stock_alerts(product_id);
CREATE INDEX idx_stock_alerts_status ON public.stock_alerts(status);