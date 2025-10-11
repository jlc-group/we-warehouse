-- ============================================================================
-- APPLY FULFILLMENT SYSTEM TO DATABASE
-- Run this in Supabase SQL Editor
-- ============================================================================

-- PART 1: Create fulfillment_tasks table
CREATE TABLE IF NOT EXISTS public.fulfillment_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) NOT NULL,
  po_date DATE,
  delivery_date DATE,
  customer_code VARCHAR(50),
  warehouse_name VARCHAR(100),
  total_amount DECIMAL(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 0,
  notes TEXT,
  assigned_to UUID,
  source_type VARCHAR(20) DEFAULT 'api' CHECK (source_type IN ('api', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,
  CONSTRAINT fulfillment_tasks_status_check CHECK (status IN ('pending', 'in_progress', 'shipped', 'cancelled'))
);

-- PART 2: Create fulfillment_items table
CREATE TABLE IF NOT EXISTS public.fulfillment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_task_id UUID NOT NULL REFERENCES public.fulfillment_tasks(id) ON DELETE CASCADE,
  product_code VARCHAR(100),
  product_name VARCHAR(255) NOT NULL,
  quantity_requested INTEGER NOT NULL,
  quantity_picked INTEGER DEFAULT 0,
  unit VARCHAR(50),
  location VARCHAR(100),
  inventory_item_id UUID,
  available_stock INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  picked_at TIMESTAMP WITH TIME ZONE,
  picked_by UUID,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fulfillment_items_status_check CHECK (status IN ('pending', 'picked', 'partial', 'completed', 'cancelled'))
);

-- PART 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_po_number ON public.fulfillment_tasks(po_number);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_status ON public.fulfillment_tasks(status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_delivery_date ON public.fulfillment_tasks(delivery_date);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_source_type ON public.fulfillment_tasks(source_type);
CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_user_id ON public.fulfillment_tasks(user_id);

CREATE INDEX IF NOT EXISTS idx_fulfillment_items_task_id ON public.fulfillment_items(fulfillment_task_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_product_code ON public.fulfillment_items(product_code);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_status ON public.fulfillment_items(status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_inventory_item_id ON public.fulfillment_items(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_picked_at ON public.fulfillment_items(picked_at);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_cancelled_at ON public.fulfillment_items(cancelled_at);

-- PART 4: Add comments
COMMENT ON TABLE public.fulfillment_tasks IS 'งานจัดสินค้า - รายการงานที่ต้องดำเนินการ';
COMMENT ON TABLE public.fulfillment_items IS 'รายการสินค้าในแต่ละงานจัดสินค้า';
COMMENT ON COLUMN public.fulfillment_tasks.source_type IS 'แหล่งที่มาของงาน: api = จาก PO API, manual = สร้างเอง';
COMMENT ON COLUMN public.fulfillment_items.picked_at IS 'วันที่จัดสินค้าเสร็จ';
COMMENT ON COLUMN public.fulfillment_items.picked_by IS 'ผู้จัดสินค้า (user_id)';
COMMENT ON COLUMN public.fulfillment_items.cancelled_at IS 'วันที่ยกเลิก';
COMMENT ON COLUMN public.fulfillment_items.cancelled_by IS 'ผู้ยกเลิก (user_id)';

-- PART 5: Enable RLS (Row Level Security)
ALTER TABLE public.fulfillment_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_items ENABLE ROW LEVEL SECURITY;

-- PART 6: Create RLS policies
-- Policy for fulfillment_tasks
DROP POLICY IF EXISTS "Enable all access for fulfillment_tasks" ON public.fulfillment_tasks;
CREATE POLICY "Enable all access for fulfillment_tasks"
  ON public.fulfillment_tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy for fulfillment_items
DROP POLICY IF EXISTS "Enable all access for fulfillment_items" ON public.fulfillment_items;
CREATE POLICY "Enable all access for fulfillment_items"
  ON public.fulfillment_items
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- PART 7: Add updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_fulfillment_tasks_updated_at ON public.fulfillment_tasks;
CREATE TRIGGER update_fulfillment_tasks_updated_at
  BEFORE UPDATE ON public.fulfillment_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_fulfillment_items_updated_at ON public.fulfillment_items;
CREATE TRIGGER update_fulfillment_items_updated_at
  BEFORE UPDATE ON public.fulfillment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Done!
SELECT 'Fulfillment system tables created successfully!' AS result;
