-- ⚡ รัน SQL นี้ใน Supabase SQL Editor
-- https://supabase.com/dashboard/project/ogrcpzzmmudztwjfwjvu/sql

-- ========================================
-- แก้ไข RLS Policies สำหรับ warehouses
-- ========================================

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Allow public read access to warehouses" ON warehouses;
DROP POLICY IF EXISTS "Allow authenticated read access to warehouses" ON warehouses;
DROP POLICY IF EXISTS "Allow admin full access to warehouses" ON warehouses;
DROP POLICY IF EXISTS "Enable read access for all users" ON warehouses;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON warehouses;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON warehouses;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON warehouses;

-- 2. Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;

-- 3. Policy: ทุกคนอ่านได้ (รวม anon)
CREATE POLICY "warehouses_select_public"
ON warehouses
FOR SELECT
USING (true);

-- 4. Policy: Authenticated users สร้างได้
CREATE POLICY "warehouses_insert_authenticated"
ON warehouses
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. Policy: Authenticated users แก้ไขได้
CREATE POLICY "warehouses_update_authenticated"
ON warehouses
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Policy: Authenticated users ลบได้
CREATE POLICY "warehouses_delete_authenticated"
ON warehouses
FOR DELETE
TO authenticated
USING (true);

-- ========================================
-- เชื่อมโยง inventory_items ที่ไม่มี warehouse_id
-- ========================================

-- เชื่อมโยงกับคลัง LLK-D (c6f43c5a-3949-46fd-9165-a3cd6e0b7509)
UPDATE inventory_items
SET warehouse_id = 'c6f43c5a-3949-46fd-9165-a3cd6e0b7509'
WHERE warehouse_id IS NULL;

-- ========================================
-- แสดงสรุปผล
-- ========================================

SELECT
  '✅ สรุปผลลัพธ์' as status,
  (SELECT count(*) FROM warehouses WHERE is_active = true) as active_warehouses,
  (SELECT count(*) FROM inventory_items WHERE warehouse_id IS NOT NULL) as items_with_warehouse,
  (SELECT count(*) FROM inventory_items WHERE warehouse_id IS NULL) as items_without_warehouse,
  (SELECT count(*) FROM warehouse_locations WHERE warehouse_id IS NOT NULL) as locations_linked;

-- แสดงรายการคลังทั้งหมด
SELECT
  name,
  code,
  location_prefix_start || '-' || location_prefix_end as location_range,
  (SELECT count(*) FROM inventory_items WHERE warehouse_id = warehouses.id) as inventory_count,
  (SELECT count(*) FROM warehouse_locations WHERE warehouse_id = warehouses.id) as locations_count,
  is_active
FROM warehouses
ORDER BY name;
