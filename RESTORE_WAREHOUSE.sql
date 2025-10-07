-- กู้คืน Warehouse Record ที่หายไป
-- รัน SQL นี้ใน Supabase SQL Editor

-- ปิด RLS ชั่วคราวเพื่อให้สามารถ INSERT ได้
ALTER TABLE warehouses DISABLE ROW LEVEL SECURITY;

-- สร้าง warehouse record ด้วย ID ที่มีอยู่แล้วในระบบ
INSERT INTO warehouses (
  id,
  name,
  code,
  description,
  address,
  location_prefix_start,
  location_prefix_end,
  max_levels,
  max_positions,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'c6f43c5a-3949-46fd-9165-a3cd6e0b7509'::uuid,
  'คลังสินค้าหลัก',
  'WH-MAIN',
  'คลังสินค้าหลัก รองรับทุกประเภทสินค้า (A-Z)',
  'พื้นที่จัดเก็บหลัก',
  'A',
  'Z',
  20,
  4,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  description = EXCLUDED.description,
  address = EXCLUDED.address,
  location_prefix_start = EXCLUDED.location_prefix_start,
  location_prefix_end = EXCLUDED.location_prefix_end,
  max_levels = EXCLUDED.max_levels,
  max_positions = EXCLUDED.max_positions,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- เปิด RLS กลับคืน
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- แสดงผลลัพธ์
SELECT
  id,
  name,
  code,
  location_prefix_start || '-' || location_prefix_end as location_range,
  (SELECT COUNT(*) FROM inventory_items WHERE warehouse_id = warehouses.id) as inventory_count,
  (SELECT COUNT(*) FROM warehouse_locations WHERE warehouse_id = warehouses.id) as locations_count,
  is_active
FROM warehouses
WHERE id = 'c6f43c5a-3949-46fd-9165-a3cd6e0b7509';
