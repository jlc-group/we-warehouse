-- ============================================================================
-- FIX INVENTORY_MOVEMENTS TABLE SCHEMA
-- ============================================================================
-- ปัญหา: ตาราง inventory_movements ไม่มี columns ที่จำเป็นสำหรับระบบหน่วยหลายระดับ
-- เพิ่ม columns ที่หายไป: location_before, location_after, และ quantity fields
-- ============================================================================

-- 1. เพิ่ม columns สำหรับ quantity tracking (multi-level units)
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS quantity_boxes_before INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_loose_before INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_boxes_after INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_loose_after INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_boxes_change INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantity_loose_change INTEGER DEFAULT 0;

-- 2. เพิ่ม columns สำหรับ location tracking
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS location_before TEXT,
  ADD COLUMN IF NOT EXISTS location_after TEXT;

-- 3. เพิ่ม column สำหรับ notes
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. เพิ่ม column สำหรับ created_by (ถ้ายังไม่มี)
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT 'system';

-- 5. สร้าง indexes สำหรับ performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_location_before
  ON public.inventory_movements(location_before);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_location_after
  ON public.inventory_movements(location_after);

-- 6. เพิ่ม comments
COMMENT ON COLUMN public.inventory_movements.quantity_boxes_before IS 'จำนวนกล่อง/ลัง ก่อนการเปลี่ยนแปลง';
COMMENT ON COLUMN public.inventory_movements.quantity_loose_before IS 'จำนวนชิ้นหลวม ก่อนการเปลี่ยนแปลง';
COMMENT ON COLUMN public.inventory_movements.quantity_boxes_after IS 'จำนวนกล่อง/ลัง หลังการเปลี่ยนแปลง';
COMMENT ON COLUMN public.inventory_movements.quantity_loose_after IS 'จำนวนชิ้นหลวม หลังการเปลี่ยนแปลง';
COMMENT ON COLUMN public.inventory_movements.quantity_boxes_change IS 'การเปลี่ยนแปลงจำนวนกล่อง/ลัง (+/-)';
COMMENT ON COLUMN public.inventory_movements.quantity_loose_change IS 'การเปลี่ยนแปลงจำนวนชิ้นหลวม (+/-)';
COMMENT ON COLUMN public.inventory_movements.location_before IS 'ตำแหน่งก่อนการเปลี่ยนแปลง';
COMMENT ON COLUMN public.inventory_movements.location_after IS 'ตำแหน่งหลังการเปลี่ยนแปลง';
COMMENT ON COLUMN public.inventory_movements.notes IS 'หมายเหตุเพิ่มเติม';
COMMENT ON COLUMN public.inventory_movements.created_by IS 'ผู้สร้างรายการ';
