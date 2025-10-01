-- ============================================================================
-- CREATE FULFILLMENT TABLES FOR PO TO WAREHOUSE INTEGRATION
-- ============================================================================

-- Create fulfillment_tasks table
CREATE TABLE IF NOT EXISTS public.fulfillment_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) NOT NULL,
  po_date DATE,
  delivery_date DATE,
  customer_code VARCHAR(50),
  warehouse_name VARCHAR(100),
  total_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'shipped', 'cancelled')),
  priority INTEGER DEFAULT 0,
  notes TEXT,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid
);

-- Create fulfillment_items table
CREATE TABLE IF NOT EXISTS public.fulfillment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_task_id UUID NOT NULL REFERENCES public.fulfillment_tasks(id) ON DELETE CASCADE,
  product_name VARCHAR(200) NOT NULL,
  product_code VARCHAR(100),
  requested_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  fulfilled_quantity DECIMAL(10,2) DEFAULT 0,
  unit_price DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'completed', 'cancelled')),
  location VARCHAR(50),
  inventory_item_id UUID REFERENCES public.inventory_items(id),
  available_stock DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_po_number ON public.fulfillment_tasks(po_number);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_status ON public.fulfillment_tasks(status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_created_at ON public.fulfillment_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_delivery_date ON public.fulfillment_tasks(delivery_date);

CREATE INDEX IF NOT EXISTS idx_fulfillment_items_task_id ON public.fulfillment_items(fulfillment_task_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_product_code ON public.fulfillment_items(product_code);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_status ON public.fulfillment_items(status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_inventory_id ON public.fulfillment_items(inventory_item_id);

-- Enable RLS (Row Level Security) - disabled for development
ALTER TABLE public.fulfillment_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_items DISABLE ROW LEVEL SECURITY;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_fulfillment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fulfillment_tasks_updated_at
  BEFORE UPDATE ON public.fulfillment_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fulfillment_updated_at();

CREATE TRIGGER update_fulfillment_items_updated_at
  BEFORE UPDATE ON public.fulfillment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_fulfillment_updated_at();

-- Create a view for easy querying of fulfillment tasks with items
CREATE OR REPLACE VIEW public.fulfillment_tasks_with_items AS
SELECT
  ft.id,
  ft.po_number,
  ft.po_date,
  ft.delivery_date,
  ft.customer_code,
  ft.warehouse_name,
  ft.total_amount,
  ft.status,
  ft.priority,
  ft.notes,
  ft.assigned_to,
  ft.created_at,
  ft.updated_at,
  ft.user_id,
  COALESCE(item_stats.total_items, 0) as total_items,
  COALESCE(item_stats.completed_items, 0) as completed_items,
  COALESCE(item_stats.pending_items, 0) as pending_items,
  CASE
    WHEN COALESCE(item_stats.total_items, 0) = 0 THEN 0
    ELSE ROUND((COALESCE(item_stats.completed_items, 0)::decimal / item_stats.total_items) * 100, 2)
  END as completion_percentage
FROM public.fulfillment_tasks ft
LEFT JOIN (
  SELECT
    fulfillment_task_id,
    COUNT(*) as total_items,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_items,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_items
  FROM public.fulfillment_items
  GROUP BY fulfillment_task_id
) item_stats ON ft.id = item_stats.fulfillment_task_id;

-- Insert sample data for testing
INSERT INTO public.fulfillment_tasks (
  po_number,
  po_date,
  delivery_date,
  customer_code,
  warehouse_name,
  total_amount,
  status,
  notes
) VALUES
  ('PO-2024-001', '2024-09-30', '2024-10-05', 'CUST001', 'คลังสินค้าหลัก', 25000.00, 'pending', 'ใบสั่งซื้อสำหรับลูกค้า ABC'),
  ('PO-2024-002', '2024-09-29', '2024-10-03', 'CUST002', 'คลังสินค้าหลัก', 15000.00, 'in_progress', 'ใบสั่งซื้อด่วน'),
  ('PO-2024-003', '2024-09-28', '2024-10-02', 'CUST003', 'คลังสินค้าหลัก', 8500.00, 'completed', 'ใบสั่งซื้อเสร็จสิ้นแล้ว')
ON CONFLICT (po_number) DO NOTHING;

-- Insert sample fulfillment items
INSERT INTO public.fulfillment_items (
  fulfillment_task_id,
  product_name,
  product_code,
  requested_quantity,
  fulfilled_quantity,
  unit_price,
  total_amount,
  status
) SELECT
  ft.id,
  'สินค้าทดสอบ ' || ft.po_number,
  'PRD-' || SUBSTRING(ft.po_number FROM -3),
  10.00,
  CASE ft.status
    WHEN 'completed' THEN 10.00
    WHEN 'in_progress' THEN 5.00
    ELSE 0.00
  END,
  100.00,
  1000.00,
  CASE ft.status
    WHEN 'completed' THEN 'completed'
    WHEN 'in_progress' THEN 'partial'
    ELSE 'pending'
  END
FROM public.fulfillment_tasks ft
WHERE NOT EXISTS (
  SELECT 1 FROM public.fulfillment_items fi
  WHERE fi.fulfillment_task_id = ft.id
);

COMMENT ON TABLE public.fulfillment_tasks IS 'งานจัดสินค้าจาก Purchase Orders';
COMMENT ON TABLE public.fulfillment_items IS 'รายการสินค้าในงานจัดสินค้า';
COMMENT ON VIEW public.fulfillment_tasks_with_items IS 'มุมมองงานจัดสินค้าพร้อมสถิติรายการสินค้า';