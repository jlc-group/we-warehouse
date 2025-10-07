-- ============================================================================
-- COMPLETE FULFILLMENT SYSTEM SETUP
-- รวม: สร้างตาราง + Enhance features ในไฟล์เดียว
-- รันใน Supabase SQL Editor
--
-- 🔧 SAFE TO RE-RUN: ใช้ IF NOT EXISTS และ DROP CONSTRAINT/TRIGGER IF EXISTS
-- ============================================================================

-- ============================================================================
-- PART 1: สร้างตารางพื้นฐาน (จาก 20250930_create_fulfillment_tables.sql)
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
  status VARCHAR(20) DEFAULT 'pending',
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
  status VARCHAR(20) DEFAULT 'pending',
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
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_status ON public.fulfillment_items(status);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_inventory_item ON public.fulfillment_items(inventory_item_id);

-- Enable Row Level Security
ALTER TABLE public.fulfillment_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow read fulfillment_tasks" ON public.fulfillment_tasks;
CREATE POLICY "Allow read fulfillment_tasks"
  ON public.fulfillment_tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert fulfillment_tasks" ON public.fulfillment_tasks;
CREATE POLICY "Allow insert fulfillment_tasks"
  ON public.fulfillment_tasks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update fulfillment_tasks" ON public.fulfillment_tasks;
CREATE POLICY "Allow update fulfillment_tasks"
  ON public.fulfillment_tasks FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow read fulfillment_items" ON public.fulfillment_items;
CREATE POLICY "Allow read fulfillment_items"
  ON public.fulfillment_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert fulfillment_items" ON public.fulfillment_items;
CREATE POLICY "Allow insert fulfillment_items"
  ON public.fulfillment_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update fulfillment_items" ON public.fulfillment_items;
CREATE POLICY "Allow update fulfillment_items"
  ON public.fulfillment_items FOR UPDATE USING (true);

-- ============================================================================
-- PART 2: Enhance Fulfillment System (จาก 20250930_enhance_fulfillment_system.sql)
-- ============================================================================

-- เพิ่มฟิลด์ใหม่ใน fulfillment_tasks
ALTER TABLE public.fulfillment_tasks
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'api'
    CHECK (source_type IN ('api', 'manual'));

ALTER TABLE public.fulfillment_tasks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

ALTER TABLE public.fulfillment_tasks
  ADD COLUMN IF NOT EXISTS customer_id UUID;

-- แก้ไข status constraint
ALTER TABLE public.fulfillment_tasks
  DROP CONSTRAINT IF EXISTS fulfillment_tasks_status_check;

ALTER TABLE public.fulfillment_tasks
  ADD CONSTRAINT fulfillment_tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'packed', 'shipped', 'delivered', 'cancelled'));

-- เพิ่ม unique constraint สำหรับ PO Number
DROP INDEX IF EXISTS idx_fulfillment_tasks_po_unique;
CREATE UNIQUE INDEX idx_fulfillment_tasks_po_unique
  ON public.fulfillment_tasks(po_number)
  WHERE status != 'cancelled';

-- เพิ่มฟิลด์ tracking ใน fulfillment_items
ALTER TABLE public.fulfillment_items
  ADD COLUMN IF NOT EXISTS picked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.fulfillment_items
  ADD COLUMN IF NOT EXISTS picked_by UUID REFERENCES public.users(id);

ALTER TABLE public.fulfillment_items
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.fulfillment_items
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.users(id);

-- แก้ไข status constraint
ALTER TABLE public.fulfillment_items
  DROP CONSTRAINT IF EXISTS fulfillment_items_status_check;

ALTER TABLE public.fulfillment_items
  ADD CONSTRAINT fulfillment_items_status_check
  CHECK (status IN ('pending', 'picked', 'completed', 'cancelled'));

-- สร้าง fulfillment_stock_movements table
CREATE TABLE IF NOT EXISTS public.fulfillment_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_item_id UUID NOT NULL REFERENCES public.fulfillment_items(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('pick', 'cancel', 'adjust')),
  quantity DECIMAL(10,2) NOT NULL,
  previous_stock DECIMAL(10,2) NOT NULL,
  new_stock DECIMAL(10,2) NOT NULL,
  location VARCHAR(50),
  performed_by UUID REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_stock_movements_item
  ON public.fulfillment_stock_movements(fulfillment_item_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_stock_movements_inventory
  ON public.fulfillment_stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_stock_movements_type
  ON public.fulfillment_stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_fulfillment_stock_movements_created
  ON public.fulfillment_stock_movements(created_at DESC);

-- สร้าง fulfillment_item_locations table
CREATE TABLE IF NOT EXISTS public.fulfillment_item_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_item_id UUID NOT NULL REFERENCES public.fulfillment_items(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  location VARCHAR(50) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  available_stock DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'picked', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fulfillment_item_locations_item
  ON public.fulfillment_item_locations(fulfillment_item_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_item_locations_inventory
  ON public.fulfillment_item_locations(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_fulfillment_item_locations_location
  ON public.fulfillment_item_locations(location);

-- Enable RLS
ALTER TABLE public.fulfillment_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_item_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow read fulfillment_stock_movements" ON public.fulfillment_stock_movements;
CREATE POLICY "Allow read fulfillment_stock_movements"
  ON public.fulfillment_stock_movements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert fulfillment_stock_movements" ON public.fulfillment_stock_movements;
CREATE POLICY "Allow insert fulfillment_stock_movements"
  ON public.fulfillment_stock_movements FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read fulfillment_item_locations" ON public.fulfillment_item_locations;
CREATE POLICY "Allow read fulfillment_item_locations"
  ON public.fulfillment_item_locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert fulfillment_item_locations" ON public.fulfillment_item_locations;
CREATE POLICY "Allow insert fulfillment_item_locations"
  ON public.fulfillment_item_locations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update fulfillment_item_locations" ON public.fulfillment_item_locations;
CREATE POLICY "Allow update fulfillment_item_locations"
  ON public.fulfillment_item_locations FOR UPDATE USING (true);

-- ============================================================================
-- PART 3: Helper Functions และ Triggers
-- ============================================================================

-- Function: บันทึก stock movement อัตโนมัติ
CREATE OR REPLACE FUNCTION public.log_fulfillment_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND
      (OLD.fulfilled_quantity != NEW.fulfilled_quantity OR OLD.status != NEW.status)) THEN

    IF (OLD.status = 'pending' AND NEW.status = 'picked' AND NEW.fulfilled_quantity > 0) THEN
      INSERT INTO public.fulfillment_stock_movements (
        fulfillment_item_id,
        inventory_item_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        location,
        performed_by
      )
      SELECT
        NEW.id,
        NEW.inventory_item_id,
        'pick',
        NEW.fulfilled_quantity,
        NEW.available_stock + NEW.fulfilled_quantity,
        NEW.available_stock,
        NEW.location,
        NEW.picked_by;
    END IF;

    IF (OLD.status = 'picked' AND NEW.status = 'cancelled' AND OLD.fulfilled_quantity > 0) THEN
      INSERT INTO public.fulfillment_stock_movements (
        fulfillment_item_id,
        inventory_item_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        location,
        performed_by
      )
      SELECT
        NEW.id,
        NEW.inventory_item_id,
        'cancel',
        OLD.fulfilled_quantity,
        NEW.available_stock - OLD.fulfilled_quantity,
        NEW.available_stock,
        NEW.location,
        NEW.cancelled_by;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger
DROP TRIGGER IF EXISTS trigger_log_fulfillment_stock_movement ON public.fulfillment_items;
CREATE TRIGGER trigger_log_fulfillment_stock_movement
  AFTER UPDATE ON public.fulfillment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_fulfillment_stock_movement();

-- ============================================================================
-- PART 4: Views สำหรับการค้นหาง่าย
-- ============================================================================

CREATE OR REPLACE VIEW public.recent_stock_movements AS
SELECT
  sm.id,
  sm.movement_type,
  sm.quantity,
  sm.previous_stock,
  sm.new_stock,
  sm.location,
  sm.created_at,
  fi.product_name,
  fi.product_code,
  ft.po_number,
  u.full_name AS performed_by_name
FROM public.fulfillment_stock_movements sm
LEFT JOIN public.fulfillment_items fi ON sm.fulfillment_item_id = fi.id
LEFT JOIN public.fulfillment_tasks ft ON fi.fulfillment_task_id = ft.id
LEFT JOIN public.users u ON sm.performed_by = u.id
ORDER BY sm.created_at DESC
LIMIT 100;

CREATE OR REPLACE VIEW public.fulfillment_items_multi_location AS
SELECT
  fi.id AS fulfillment_item_id,
  fi.product_name,
  fi.product_code,
  fi.requested_quantity,
  fi.fulfilled_quantity,
  fi.status,
  COUNT(fil.id) AS location_count,
  STRING_AGG(fil.location || ' (' || fil.quantity || ')', ', ') AS locations_summary
FROM public.fulfillment_items fi
LEFT JOIN public.fulfillment_item_locations fil ON fi.id = fil.fulfillment_item_id
GROUP BY fi.id, fi.product_name, fi.product_code, fi.requested_quantity, fi.fulfilled_quantity, fi.status;

-- ============================================================================
-- เสร็จสิ้น
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Complete Fulfillment System Setup Finished!';
  RAISE NOTICE '📦 Tables: fulfillment_tasks, fulfillment_items, fulfillment_stock_movements, fulfillment_item_locations';
  RAISE NOTICE '🔧 Functions: log_fulfillment_stock_movement()';
  RAISE NOTICE '👁️ Views: recent_stock_movements, fulfillment_items_multi_location';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Step: Refresh your application to start using the new features!';
END $$;