-- ============================================================================
-- ENHANCE FULFILLMENT SYSTEM - เพิ่มฟีเจอร์ 2 โหมดจัดสินค้า + ยกเลิกและคืนสต็อก
-- รันใน Supabase SQL Editor
--
-- 🔧 SAFE TO RE-RUN: ใช้ IF NOT EXISTS และ DROP CONSTRAINT IF EXISTS
-- ============================================================================

-- ============================================================================
-- 1. แก้ไข fulfillment_tasks table
-- ============================================================================

-- เพิ่มฟิลด์ใหม่
ALTER TABLE public.fulfillment_tasks
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'api'
    CHECK (source_type IN ('api', 'manual'));

ALTER TABLE public.fulfillment_tasks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id);

ALTER TABLE public.fulfillment_tasks
  ADD COLUMN IF NOT EXISTS customer_id UUID;

-- แก้ไข status constraint (เพิ่ม packed, delivered)
ALTER TABLE public.fulfillment_tasks
  DROP CONSTRAINT IF EXISTS fulfillment_tasks_status_check;

ALTER TABLE public.fulfillment_tasks
  ADD CONSTRAINT fulfillment_tasks_status_check
  CHECK (status IN ('pending', 'in_progress', 'packed', 'shipped', 'delivered', 'cancelled'));

-- เพิ่ม unique constraint สำหรับ PO Number (ไม่ให้ซ้ำ ยกเว้นที่ถูกยกเลิก)
DROP INDEX IF EXISTS idx_fulfillment_tasks_po_unique;
CREATE UNIQUE INDEX idx_fulfillment_tasks_po_unique
  ON public.fulfillment_tasks(po_number)
  WHERE status != 'cancelled';

-- เพิ่ม comment
COMMENT ON COLUMN public.fulfillment_tasks.source_type IS 'แหล่งที่มาของงาน: api = จาก PO API, manual = สร้างเอง';
COMMENT ON COLUMN public.fulfillment_tasks.created_by IS 'ผู้สร้างงาน (User ID)';
COMMENT ON COLUMN public.fulfillment_tasks.customer_id IS 'รหัสลูกค้า (สำหรับ manual mode)';

-- ============================================================================
-- 2. แก้ไข fulfillment_items table
-- ============================================================================

-- แก้ไข status constraint (เพิ่ม picked)
ALTER TABLE public.fulfillment_items
  DROP CONSTRAINT IF EXISTS fulfillment_items_status_check;

ALTER TABLE public.fulfillment_items
  ADD CONSTRAINT fulfillment_items_status_check
  CHECK (status IN ('pending', 'picked', 'completed', 'cancelled'));

-- เพิ่มฟิลด์ tracking
ALTER TABLE public.fulfillment_items
  ADD COLUMN IF NOT EXISTS picked_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.fulfillment_items
  ADD COLUMN IF NOT EXISTS picked_by UUID REFERENCES public.users(id);

ALTER TABLE public.fulfillment_items
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.fulfillment_items
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.users(id);

-- เพิ่ม comment
COMMENT ON COLUMN public.fulfillment_items.picked_at IS 'เวลาที่จัดสินค้า';
COMMENT ON COLUMN public.fulfillment_items.picked_by IS 'ผู้จัดสินค้า (User ID)';
COMMENT ON COLUMN public.fulfillment_items.cancelled_at IS 'เวลาที่ยกเลิก';
COMMENT ON COLUMN public.fulfillment_items.cancelled_by IS 'ผู้ยกเลิก (User ID)';

-- ============================================================================
-- 3. สร้าง fulfillment_stock_movements table (Log การตัด/คืนสต็อก)
-- ============================================================================

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

-- สร้าง indexes
CREATE INDEX IF NOT EXISTS idx_fulfillment_stock_movements_item
  ON public.fulfillment_stock_movements(fulfillment_item_id);

CREATE INDEX IF NOT EXISTS idx_fulfillment_stock_movements_inventory
  ON public.fulfillment_stock_movements(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_fulfillment_stock_movements_type
  ON public.fulfillment_stock_movements(movement_type);

CREATE INDEX IF NOT EXISTS idx_fulfillment_stock_movements_created
  ON public.fulfillment_stock_movements(created_at DESC);

-- เพิ่ม comment
COMMENT ON TABLE public.fulfillment_stock_movements IS 'Log การเคลื่อนไหวสต็อกจากการจัดสินค้า';
COMMENT ON COLUMN public.fulfillment_stock_movements.movement_type IS 'ประเภท: pick = จัดสินค้า, cancel = ยกเลิก, adjust = ปรับปรุง';

-- ============================================================================
-- 4. สร้าง fulfillment_item_locations table (หลาย Location)
-- ============================================================================

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

-- สร้าง indexes
CREATE INDEX IF NOT EXISTS idx_fulfillment_item_locations_item
  ON public.fulfillment_item_locations(fulfillment_item_id);

CREATE INDEX IF NOT EXISTS idx_fulfillment_item_locations_inventory
  ON public.fulfillment_item_locations(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_fulfillment_item_locations_location
  ON public.fulfillment_item_locations(location);

-- เพิ่ม comment
COMMENT ON TABLE public.fulfillment_item_locations IS 'เก็บข้อมูลสินค้าที่มาจากหลาย Location';
COMMENT ON COLUMN public.fulfillment_item_locations.quantity IS 'จำนวนที่จัดจาก Location นี้';

-- ============================================================================
-- 5. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.fulfillment_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_item_locations ENABLE ROW LEVEL SECURITY;

-- Policy สำหรับ fulfillment_stock_movements (อ่านได้ทุกคน, เขียนได้เฉพาะระบบ)
DROP POLICY IF EXISTS "Allow read fulfillment_stock_movements" ON public.fulfillment_stock_movements;
CREATE POLICY "Allow read fulfillment_stock_movements"
  ON public.fulfillment_stock_movements
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert fulfillment_stock_movements" ON public.fulfillment_stock_movements;
CREATE POLICY "Allow insert fulfillment_stock_movements"
  ON public.fulfillment_stock_movements
  FOR INSERT
  WITH CHECK (true);

-- Policy สำหรับ fulfillment_item_locations (อ่านได้ทุกคน, เขียนได้เฉพาะระบบ)
DROP POLICY IF EXISTS "Allow read fulfillment_item_locations" ON public.fulfillment_item_locations;
CREATE POLICY "Allow read fulfillment_item_locations"
  ON public.fulfillment_item_locations
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert fulfillment_item_locations" ON public.fulfillment_item_locations;
CREATE POLICY "Allow insert fulfillment_item_locations"
  ON public.fulfillment_item_locations
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update fulfillment_item_locations" ON public.fulfillment_item_locations;
CREATE POLICY "Allow update fulfillment_item_locations"
  ON public.fulfillment_item_locations
  FOR UPDATE
  USING (true);

-- ============================================================================
-- 6. สร้าง Helper Functions
-- ============================================================================

-- Function: บันทึก stock movement อัตโนมัติ
CREATE OR REPLACE FUNCTION public.log_fulfillment_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- เมื่อมีการเปลี่ยน fulfilled_quantity หรือ status
  IF (TG_OP = 'UPDATE' AND
      (OLD.fulfilled_quantity != NEW.fulfilled_quantity OR OLD.status != NEW.status)) THEN

    -- ถ้าเปลี่ยนจาก pending → picked (จัดสินค้า)
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

    -- ถ้าเปลี่ยนจาก picked → cancelled (ยกเลิก)
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
-- 7. สร้าง Views สำหรับการค้นหาง่าย
-- ============================================================================

-- View: รายการ stock movements ล่าสุด
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

-- View: สรุปการจัดสินค้าจากหลาย location
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
-- เสร็จสิ้น Migration
-- ============================================================================

-- แสดงสรุป
DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced Fulfillment System Migration Completed!';
  RAISE NOTICE '📊 Tables updated: fulfillment_tasks, fulfillment_items';
  RAISE NOTICE '📦 New tables: fulfillment_stock_movements, fulfillment_item_locations';
  RAISE NOTICE '🔧 New functions: log_fulfillment_stock_movement()';
  RAISE NOTICE '👁️ New views: recent_stock_movements, fulfillment_items_multi_location';
END $$;