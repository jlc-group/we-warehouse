-- ============================================================================
-- FIX FULFILLMENT SYSTEM - Complete Migration
-- ============================================================================
-- ปัญหาที่แก้:
-- 1. เพิ่ม source_type column ใน fulfillment_tasks
-- 2. เพิ่ม picked_at, picked_by, cancelled_at, cancelled_by ใน fulfillment_items
-- 3. แก้ field names ที่ถูกต้อง
-- ============================================================================

-- 1. เพิ่ม columns ที่หายไปใน fulfillment_tasks
ALTER TABLE public.fulfillment_tasks
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) DEFAULT 'api'
    CHECK (source_type IN ('api', 'manual'));

COMMENT ON COLUMN public.fulfillment_tasks.source_type IS 'แหล่งที่มาของงาน: api = จาก PO API, manual = สร้างเอง';

-- 2. เพิ่ม columns ที่หายไปใน fulfillment_items
ALTER TABLE public.fulfillment_items
  ADD COLUMN IF NOT EXISTS picked_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS picked_by UUID,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID;

-- 3. Update status check constraint ใน fulfillment_items ให้รองรับ 'picked'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fulfillment_items_status_check'
  ) THEN
    ALTER TABLE public.fulfillment_items
      DROP CONSTRAINT fulfillment_items_status_check;
  END IF;
END $$;

ALTER TABLE public.fulfillment_items
  ADD CONSTRAINT fulfillment_items_status_check
  CHECK (status IN ('pending', 'picked', 'partial', 'completed', 'cancelled'));

-- 4. สร้าง indexes
CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_source_type ON public.fulfillment_tasks(source_type);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_picked_at ON public.fulfillment_items(picked_at);
CREATE INDEX IF NOT EXISTS idx_fulfillment_items_cancelled_at ON public.fulfillment_items(cancelled_at);

-- 5. อัปเดตข้อมูลเดิมให้มี source_type
UPDATE public.fulfillment_tasks
SET source_type = 'api'
WHERE source_type IS NULL;

COMMENT ON COLUMN public.fulfillment_items.picked_at IS 'วันที่จัดสินค้าเสร็จ';
COMMENT ON COLUMN public.fulfillment_items.picked_by IS 'ผู้จัดสินค้า (user_id)';
COMMENT ON COLUMN public.fulfillment_items.cancelled_at IS 'วันที่ยกเลิก';
COMMENT ON COLUMN public.fulfillment_items.cancelled_by IS 'ผู้ยกเลิก (user_id)';
