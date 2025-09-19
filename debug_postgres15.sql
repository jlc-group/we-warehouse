-- Debug script สำหรับ PostgreSQL 15+ (Supabase)
-- แก้ไข syntax ให้เข้ากันได้

-- 1. ตรวจสอบข้อมูลปัจจุบันใน locations ที่สำคัญ
SELECT
  'ข้อมูลปัจจุบัน' as status,
  location,
  product_name,
  unit_level1_quantity as ลัง,
  unit_level2_quantity as กล่อง,
  unit_level3_quantity as ชิ้น,
  unit_level1_name,
  unit_level2_name,
  unit_level3_name,
  unit as หน่วยหลัก
FROM inventory_items
WHERE location IN ('A/1/1', 'A/1/2', 'A/1/3', 'A/1/4', 'A/7/1', 'A/7/4')
ORDER BY location;

-- 2. นับจำนวนรายการที่มีข้อมูลใน level 2,3
SELECT
  'สถิติข้อมูล' as status,
  COUNT(*) as รายการทั้งหมด,
  SUM(CASE WHEN unit_level1_quantity > 0 THEN 1 ELSE 0 END) as มี_level1,
  SUM(CASE WHEN unit_level2_quantity > 0 THEN 1 ELSE 0 END) as มี_level2,
  SUM(CASE WHEN unit_level3_quantity > 0 THEN 1 ELSE 0 END) as มี_level3
FROM inventory_items;

-- 3. แสดงรายการที่มีข้อมูลใน level 2 หรือ 3 (ที่ต้องย้าย)
SELECT
  'รายการที่ต้องแก้ไข' as status,
  location,
  product_name,
  unit_level1_quantity,
  unit_level2_quantity,
  unit_level3_quantity
FROM inventory_items
WHERE unit_level2_quantity > 0 OR unit_level3_quantity > 0
ORDER BY location
LIMIT 10;

-- 4. ตรวจสอบ constraints แบบใหม่ (PostgreSQL 15+)
SELECT
  'ตรวจสอบ constraints' as status,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'inventory_items'::regclass
  AND contype = 'c';  -- check constraints

-- 5. ตรวจสอบ RLS (Row Level Security)
SELECT
  'ตรวจสอบ RLS' as status,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'inventory_items';

-- 6. ตรวจสอบ triggers ปัจจุบัน
SELECT
  'ตรวจสอบ triggers' as status,
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgrelid = 'inventory_items'::regclass
  AND NOT tgisinternal;  -- ไม่รวม system triggers

-- 7. ทดสอบ UPDATE แถวเดียวก่อน (ถ้ามีข้อมูล)
-- จะรันเฉพาะถ้ามีข้อมูลใน level2 หรือ level3
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM inventory_items WHERE unit_level2_quantity > 0 OR unit_level3_quantity > 0 LIMIT 1) THEN
    RAISE NOTICE 'พบข้อมูลที่ต้องย้าย - จะทำการ UPDATE ทดสอบ';

    -- ทดสอบ UPDATE แถวแรกที่มีข้อมูลใน level2 หรือ level3
    UPDATE inventory_items
    SET
      unit_level1_quantity = COALESCE(unit_level1_quantity, 0) + COALESCE(unit_level2_quantity, 0),
      unit_level2_quantity = COALESCE(unit_level3_quantity, 0),
      unit_level3_quantity = 0,
      unit_level1_name = 'ลัง',
      unit_level2_name = 'กล่อง',
      unit_level3_name = 'ชิ้น',
      updated_at = NOW()
    WHERE id = (
      SELECT id FROM inventory_items
      WHERE unit_level2_quantity > 0 OR unit_level3_quantity > 0
      LIMIT 1
    );

    RAISE NOTICE 'UPDATE ทดสอบสำเร็จ';
  ELSE
    RAISE NOTICE 'ไม่พบข้อมูลที่ต้องย้าย - อาจแก้ไขเรียบร้อยแล้ว';
  END IF;
END $$;

-- 8. แสดงผลลัพธ์หลัง UPDATE ทดสอบ
SELECT
  'ผลลัพธ์หลัง UPDATE ทดสอบ' as status,
  location,
  product_name,
  unit_level1_quantity as ลัง,
  unit_level2_quantity as กล่อง,
  unit_level3_quantity as ชิ้น,
  updated_at
FROM inventory_items
WHERE location IN ('A/1/1', 'A/1/2', 'A/1/3', 'A/1/4', 'A/7/1', 'A/7/4')
ORDER BY location;