-- แก้ไขแบบเรียบง่าย: ไม่ยุ่งกับ triggers เลย
-- เฉพาะ UPDATE ข้อมูลใน inventory_items

-- 1. ตรวจสอบข้อมูลก่อนแก้ไข
SELECT 'ข้อมูลก่อนแก้ไข' as status;
SELECT
  location,
  unit_level1_quantity as ลัง_เดิม,
  unit_level2_quantity as กล่อง_เดิม,
  unit_level3_quantity as ชิ้น_เดิม
FROM inventory_items
WHERE location IN ('A/1/2', 'A/1/3', 'A/1/1', 'A/1/4')
ORDER BY location;

-- 2. แก้ไขข้อมูลทีละ location เพื่อไม่ให้ trigger งง
-- A/1/2
UPDATE inventory_items
SET
  unit_level1_quantity = unit_level2_quantity,
  unit_level2_quantity = 0,
  unit_level3_quantity = 0,
  unit_level1_name = 'ลัง',
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น'
WHERE location = 'A/1/2' AND unit_level2_quantity > 0;

-- A/1/3
UPDATE inventory_items
SET
  unit_level1_quantity = unit_level2_quantity,
  unit_level2_quantity = 0,
  unit_level3_quantity = 0,
  unit_level1_name = 'ลัง',
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น'
WHERE location = 'A/1/3' AND unit_level2_quantity > 0;

-- แก้ไขทั้งหมดที่เหลือ
UPDATE inventory_items
SET
  unit_level1_quantity = unit_level2_quantity,
  unit_level2_quantity = unit_level3_quantity,
  unit_level3_quantity = 0,
  unit_level1_name = 'ลัง',
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น'
WHERE (unit_level2_quantity > 0 OR unit_level3_quantity > 0)
  AND location NOT IN ('A/1/2', 'A/1/3');

-- 3. ตรวจสอบข้อมูลหลังแก้ไข
SELECT 'ข้อมูลหลังแก้ไข' as status;
SELECT
  location,
  unit_level1_quantity as ลัง_ใหม่,
  unit_level2_quantity as กล่อง_ใหม่,
  unit_level3_quantity as ชิ้น_ใหม่
FROM inventory_items
WHERE location IN ('A/1/2', 'A/1/3', 'A/1/1', 'A/1/4')
ORDER BY location;

SELECT 'แก้ไข level mapping สำเร็จ (ไม่ยุ่งกับ triggers)!' as final_status;