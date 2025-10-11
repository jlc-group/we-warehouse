-- ============================================================================
-- CREATE FULFILLMENT TABLES FOR PO TO WAREHOUSE INTEGRATION
-- คัดลอกโค้ด SQL นี้ไปรันใน Supabase SQL Editor
--
-- 🔧 SAFE TO RE-RUN: Script ใช้ IF NOT EXISTS และ DROP TRIGGER IF EXISTS
-- เพื่อป้องกัน error "already exists" - สามารถรันซ้ำได้อย่างปลอดภัย
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

-- Drop existing triggers if they exist (to prevent "already exists" errors)
DROP TRIGGER IF EXISTS update_fulfillment_tasks_updated_at ON public.fulfillment_tasks;
DROP TRIGGER IF EXISTS update_fulfillment_items_updated_at ON public.fulfillment_items;

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

-- Insert sample data for testing (only if no data exists)
DO $$
BEGIN
  -- Check if tables exist first (safeguard against running script on incomplete database)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fulfillment_tasks' AND table_schema = 'public')
     AND NOT EXISTS (SELECT 1 FROM public.fulfillment_tasks LIMIT 1) THEN
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
      ('PO-2024-003', '2024-09-28', '2024-10-02', 'CUST003', 'คลังสินค้าหลัก', 8500.00, 'completed', 'ใบสั่งซื้อเสร็จสิ้นแล้ว');

    RAISE NOTICE 'Sample fulfillment tasks inserted successfully';
  ELSE
    RAISE NOTICE 'Fulfillment tasks already exist, skipping sample data insertion';
  END IF;
END $$;

-- Insert sample fulfillment items linked to real inventory
DO $$
BEGIN
  -- Check if both tables exist and tasks are available but no items yet
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fulfillment_items' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items' AND table_schema = 'public')
     AND EXISTS (SELECT 1 FROM public.fulfillment_tasks)
     AND NOT EXISTS (SELECT 1 FROM public.fulfillment_items) THEN

    -- Create fulfillment items from real inventory data
    INSERT INTO public.fulfillment_items (
      fulfillment_task_id,
      product_name,
      product_code,
      requested_quantity,
      fulfilled_quantity,
      unit_price,
      total_amount,
      status,
      location,
      inventory_item_id,
      available_stock
    )
    SELECT
      ft.id,
      COALESCE(ii.product_name, 'สินค้าทดสอบ ' || ft.po_number) as product_name,
      COALESCE(ii.sku, 'PRD-' || SUBSTRING(ft.po_number FROM -3)) as product_code,
      CASE
        -- Request quantity based on available stock
        WHEN ii.quantity >= 10 THEN 10.00
        WHEN ii.quantity >= 5 THEN 5.00
        WHEN ii.quantity > 0 THEN ii.quantity
        ELSE 2.00 -- Small test quantity even if no stock
      END as requested_quantity,
      CASE ft.status
        WHEN 'completed' THEN CASE
          WHEN ii.quantity >= 10 THEN 10.00
          WHEN ii.quantity >= 5 THEN 5.00
          WHEN ii.quantity > 0 THEN ii.quantity
          ELSE 0.00
        END
        WHEN 'in_progress' THEN CASE
          WHEN ii.quantity >= 5 THEN 5.00
          WHEN ii.quantity > 0 THEN ii.quantity * 0.5
          ELSE 0.00
        END
        ELSE 0.00
      END as fulfilled_quantity,
      COALESCE(ii.unit_price, 100.00) as unit_price,
      COALESCE(ii.unit_price, 100.00) * CASE
        WHEN ii.quantity >= 10 THEN 10.00
        WHEN ii.quantity >= 5 THEN 5.00
        WHEN ii.quantity > 0 THEN ii.quantity
        ELSE 2.00
      END as total_amount,
      CASE ft.status
        WHEN 'completed' THEN 'completed'
        WHEN 'in_progress' THEN 'partial'
        ELSE 'pending'
      END as status,
      COALESCE(ii.location, 'A1-01-01') as location, -- Use real location or default
      ii.id as inventory_item_id,
      COALESCE(ii.quantity, 0) as available_stock
    FROM public.fulfillment_tasks ft
    CROSS JOIN LATERAL (
      -- Select inventory items with stock > 0 first, then any items as fallback
      SELECT ii.* FROM public.inventory_items ii
      WHERE ii.quantity > 0 AND ii.location IS NOT NULL
      ORDER BY ii.quantity DESC, ii.created_at DESC
      LIMIT 1

      UNION ALL

      -- Fallback: any inventory item if no stock available
      SELECT ii.* FROM public.inventory_items ii
      WHERE NOT EXISTS (
        SELECT 1 FROM public.inventory_items ii2
        WHERE ii2.quantity > 0 AND ii2.location IS NOT NULL
      )
      ORDER BY ii.created_at DESC
      LIMIT 1
    ) ii
    LIMIT (SELECT COUNT(*) FROM public.fulfillment_tasks); -- One item per task

    RAISE NOTICE 'Sample fulfillment items with real inventory data inserted successfully';
  ELSE
    RAISE NOTICE 'Fulfillment items already exist or no tasks found, skipping sample data insertion';
  END IF;
END $$;

COMMENT ON TABLE public.fulfillment_tasks IS 'งานจัดสินค้าจาก Purchase Orders';
COMMENT ON TABLE public.fulfillment_items IS 'รายการสินค้าในงานจัดสินค้า';
COMMENT ON VIEW public.fulfillment_tasks_with_items IS 'มุมมองงานจัดสินค้าพร้อมสถิติรายการสินค้า';

-- Check results and show success message
DO $$
DECLARE
  task_count INTEGER;
  item_count INTEGER;
  view_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO task_count FROM public.fulfillment_tasks;
  SELECT COUNT(*) INTO item_count FROM public.fulfillment_items;
  SELECT COUNT(*) INTO view_count FROM public.fulfillment_tasks_with_items;

  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ FULFILLMENT TABLES CREATED SUCCESSFULLY!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'fulfillment_tasks: % records', task_count;
  RAISE NOTICE 'fulfillment_items: % records', item_count;
  RAISE NOTICE 'fulfillment_tasks_with_items view: % records', view_count;
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Ready to test PO to Warehouse integration!';
  RAISE NOTICE 'Go to: Analytics & แผนก > งานจัดสินค้า';
  RAISE NOTICE '====================================';
END $$;

-- Also show as a table for verification
SELECT
  'fulfillment_tasks' as table_name,
  COUNT(*) as record_count,
  '✅ Ready' as status
FROM public.fulfillment_tasks
UNION ALL
SELECT
  'fulfillment_items' as table_name,
  COUNT(*) as record_count,
  '✅ Ready' as status
FROM public.fulfillment_items
UNION ALL
SELECT
  'fulfillment_tasks_with_items (view)' as table_name,
  COUNT(*) as record_count,
  '✅ Ready' as status
FROM public.fulfillment_tasks_with_items;