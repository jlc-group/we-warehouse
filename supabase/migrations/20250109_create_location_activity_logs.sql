-- ========================================
-- Migration: Location Activity Logs
-- ========================================
-- Purpose: บันทึกประวัติการเคลื่อนไหวของสินค้าใน Location
-- Date: 2025-01-09

-- สร้างตาราง location_activity_logs
CREATE TABLE IF NOT EXISTS public.location_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'MOVE_IN', 'MOVE_OUT', 'TRANSFER', 'ADJUST', 'SCAN'
  product_sku TEXT,
  product_name TEXT,
  quantity DECIMAL(10, 2),
  unit TEXT,
  from_location TEXT,
  to_location TEXT,
  user_id UUID,
  user_name TEXT,
  notes TEXT,
  metadata JSONB, -- เก็บข้อมูลเพิ่มเติม
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง indexes
CREATE INDEX IF NOT EXISTS idx_location_activity_logs_location 
ON public.location_activity_logs(location);

CREATE INDEX IF NOT EXISTS idx_location_activity_logs_product_sku 
ON public.location_activity_logs(product_sku);

CREATE INDEX IF NOT EXISTS idx_location_activity_logs_created_at 
ON public.location_activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_location_activity_logs_activity_type 
ON public.location_activity_logs(activity_type);

-- Enable RLS
ALTER TABLE public.location_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy - อนุญาตทุกคน (สำหรับ development)
DROP POLICY IF EXISTS "Allow full access to location_activity_logs" ON public.location_activity_logs;
CREATE POLICY "Allow full access to location_activity_logs" 
ON public.location_activity_logs
FOR ALL USING (true);

-- Comments
COMMENT ON TABLE public.location_activity_logs IS 'บันทึกประวัติการเคลื่อนไหวของสินค้าใน Location';
COMMENT ON COLUMN public.location_activity_logs.activity_type IS 'ประเภทกิจกรรม: MOVE_IN (รับเข้า), MOVE_OUT (ส่งออก), TRANSFER (ย้าย), ADJUST (แก้ไข), SCAN (สแกน)';
COMMENT ON COLUMN public.location_activity_logs.quantity IS 'จำนวน (+ = เพิ่ม, - = ลด)';
COMMENT ON COLUMN public.location_activity_logs.metadata IS 'ข้อมูลเพิ่มเติม เช่น reference_doc, reason';

-- สร้าง View สำหรับดูประวัติล่าสุด
CREATE OR REPLACE VIEW location_activity_recent AS
SELECT 
  id,
  location,
  activity_type,
  product_sku,
  product_name,
  quantity,
  unit,
  from_location,
  to_location,
  user_name,
  notes,
  created_at,
  ROW_NUMBER() OVER (PARTITION BY location ORDER BY created_at DESC) as row_num
FROM public.location_activity_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

COMMENT ON VIEW location_activity_recent IS 'แสดงกิจกรรมล่าสุด 30 วัน พร้อม row_number';

-- สร้าง View สรุปการเคลื่อนไหวต่อ Location
CREATE OR REPLACE VIEW location_activity_summary AS
SELECT 
  location,
  COUNT(*) as total_activities,
  COUNT(DISTINCT product_sku) as unique_products,
  COUNT(*) FILTER (WHERE activity_type = 'MOVE_IN') as move_in_count,
  COUNT(*) FILTER (WHERE activity_type = 'MOVE_OUT') as move_out_count,
  COUNT(*) FILTER (WHERE activity_type = 'TRANSFER') as transfer_count,
  COUNT(*) FILTER (WHERE activity_type = 'SCAN') as scan_count,
  MAX(created_at) as last_activity_at
FROM public.location_activity_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY location
ORDER BY last_activity_at DESC;

COMMENT ON VIEW location_activity_summary IS 'สรุปกิจกรรมต่อ Location ใน 30 วันล่าสุด';

-- Function สำหรับบันทึก activity อัตโนมัติ
CREATE OR REPLACE FUNCTION log_location_activity(
  p_location TEXT,
  p_activity_type TEXT,
  p_product_sku TEXT DEFAULT NULL,
  p_product_name TEXT DEFAULT NULL,
  p_quantity DECIMAL DEFAULT NULL,
  p_unit TEXT DEFAULT NULL,
  p_from_location TEXT DEFAULT NULL,
  p_to_location TEXT DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.location_activity_logs (
    location,
    activity_type,
    product_sku,
    product_name,
    quantity,
    unit,
    from_location,
    to_location,
    user_name,
    notes,
    metadata
  ) VALUES (
    p_location,
    p_activity_type,
    p_product_sku,
    p_product_name,
    p_quantity,
    p_unit,
    p_from_location,
    p_to_location,
    p_user_name,
    p_notes,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_location_activity IS 'บันทึก activity ลง location_activity_logs';

-- ตัวอย่างข้อมูล (optional - ลบได้ถ้าไม่ต้องการ)
DO $$
BEGIN
  -- SCAN activity
  PERFORM log_location_activity(
    'A1/1', 'SCAN', 'L3-8G', 'ผลิตภัณฑ์ทดสอบ', NULL, NULL, 
    NULL, NULL, 'System', 'Initial scan', 
    '{"device": "Mobile Scanner", "app_version": "1.0"}'::jsonb
  );
  
  -- MOVE_IN activity
  PERFORM log_location_activity(
    'A1/1', 'MOVE_IN', 'L3-8G', 'ผลิตภัณฑ์ทดสอบ', 100, 'ชิ้น',
    NULL, NULL, 'Admin', 'รับสินค้าเข้าคลัง',
    '{"po_number": "PO-2025-001", "supplier": "ABC Corp"}'::jsonb
  );
END $$;

-- ตรวจสอบผล
SELECT 
  'Total logs' as metric,
  COUNT(*) as count
FROM location_activity_logs
UNION ALL
SELECT 
  'Unique locations',
  COUNT(DISTINCT location)
FROM location_activity_logs;

-- แสดงตัวอย่าง logs
SELECT 
  location,
  activity_type,
  product_sku,
  quantity,
  user_name,
  created_at
FROM location_activity_logs
ORDER BY created_at DESC
LIMIT 5;
