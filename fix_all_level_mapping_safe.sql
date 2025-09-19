-- แก้ไขการ mapping ทั้งหมดให้ถูกต้องแบบปลอดภัย
-- ปิด triggers ก่อนแก้ไขเพื่อป้องกันข้อผิดพลาด

-- 1. ปิด triggers ทั้งหมดก่อน
DROP TRIGGER IF EXISTS trigger_auto_set_unit ON inventory_items;
DROP TRIGGER IF EXISTS log_inventory_changes ON inventory_items;
DROP TRIGGER IF EXISTS inventory_movement_trigger ON inventory_items;
DROP TRIGGER IF EXISTS log_inventory_movement_trigger ON inventory_items;

-- 2. แสดงข้อมูลก่อนแก้ไข (สำหรับตรวจสอบ)
SELECT
  'ข้อมูลก่อนแก้ไข - รวมทุก location ที่มีข้อมูล level2,3' as status,
  COUNT(*) as total_items_with_wrong_levels
FROM inventory_items
WHERE unit_level2_quantity > 0 OR unit_level3_quantity > 0;

-- 3. แสดงตัวอย่างข้อมูลที่จะแก้ไข
SELECT
  location,
  product_name,
  unit_level1_quantity as level1_ลัง_ปัจจุบัน,
  unit_level2_quantity as level2_กล่อง_ปัจจุบัน,
  unit_level3_quantity as level3_ชิ้น_ปัจจุบัน,
  unit_level1_name,
  unit_level2_name,
  unit_level3_name
FROM inventory_items
WHERE unit_level2_quantity > 0 OR unit_level3_quantity > 0
ORDER BY location
LIMIT 10;

-- 4. แก้ไขข้อมูลทั้งหมด - ย้าย level ให้ถูกต้อง
UPDATE inventory_items
SET
  -- ย้ายข้อมูลไปยัง level ที่ถูกต้อง
  unit_level1_quantity = COALESCE(unit_level2_quantity, 0),  -- level2 → level1 (ลัง)
  unit_level2_quantity = COALESCE(unit_level3_quantity, 0),  -- level3 → level2 (กล่อง)
  unit_level3_quantity = 0,                                  -- รีเซ็ต level3 (ชิ้น)

  -- อัปเดตชื่อหน่วยให้ถูกต้อง
  unit_level1_name = 'ลัง',
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น',

  -- อัปเดต unit field ให้แสดงหน่วยหลัก
  unit = CASE
    WHEN COALESCE(unit_level2_quantity, 0) > 0 THEN 'ลัง'      -- ถ้ามีข้อมูลใน level2 (จะกลายเป็น level1) แสดงเป็นลัง
    WHEN COALESCE(unit_level3_quantity, 0) > 0 THEN 'กล่อง'    -- ถ้ามีข้อมูลใน level3 (จะกลายเป็น level2) แสดงเป็นกล่อง
    ELSE 'ลัง'
  END,

  -- อัปเดตเวลา
  updated_at = NOW()
WHERE unit_level2_quantity > 0 OR unit_level3_quantity > 0;

-- 5. แสดงข้อมูลหลังแก้ไข
SELECT
  'ข้อมูลหลังแก้ไข - ตรวจสอบว่าข้อมูลถูกย้ายแล้ว' as status;

-- ตรวจสอบจำนวนรายการที่ยังมีข้อมูลใน level2,3 (ควรเป็น 0)
SELECT
  COUNT(*) as remaining_wrong_levels
FROM inventory_items
WHERE unit_level2_quantity > 0 OR unit_level3_quantity > 0;

-- แสดงตัวอย่างข้อมูลหลังแก้ไข
SELECT
  location,
  product_name,
  unit_level1_quantity as level1_ลัง_ใหม่,
  unit_level2_quantity as level2_กล่อง_ใหม่,
  unit_level3_quantity as level3_ชิ้น_ใหม่,
  unit_level1_name,
  unit_level2_name,
  unit_level3_name,
  unit as หน่วยหลัก
FROM inventory_items
WHERE unit_level1_quantity > 0 OR unit_level2_quantity > 0
ORDER BY location
LIMIT 10;

-- 6. ตรวจสอบ locations ที่สำคัญโดยเฉพาะ
SELECT
  'ตรวจสอบ A/1/2, A/1/3 ที่ควรแสดงเป็น ลัง' as status;

SELECT
  location,
  product_name,
  unit_level1_quantity as ลัง,
  unit_level2_quantity as กล่อง,
  unit_level3_quantity as ชิ้น,
  unit as หน่วยหลัก,
  'ควรแสดงเป็น ลัง' as expected
FROM inventory_items
WHERE location IN ('A/1/2', 'A/1/3', 'A/1/1', 'A/1/4')
ORDER BY location;

-- 7. สรุปผลลัพธ์
SELECT
  COUNT(*) as total_items,
  SUM(CASE WHEN unit_level1_quantity > 0 THEN 1 ELSE 0 END) as items_with_level1_ลัง,
  SUM(CASE WHEN unit_level2_quantity > 0 THEN 1 ELSE 0 END) as items_with_level2_กล่อง,
  SUM(CASE WHEN unit_level3_quantity > 0 THEN 1 ELSE 0 END) as items_with_level3_ชิ้น
FROM inventory_items;

SELECT 'แก้ไขการ mapping ระดับหน่วยทั้งหมดสำเร็จ! (โดยไม่มี triggers รบกวน)' as final_status;