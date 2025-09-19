-- แก้ไขง่ายๆ: ย้าย level2→level1, level3→level2 เฉพาะใน inventory_items
-- ปิด triggers ก่อนเพื่อไม่ให้ไปยุ่งกับตารางอื่น

-- 1. ปิด triggers ทั้งหมดก่อน (ชั่วคราว)
ALTER TABLE inventory_items DISABLE TRIGGER ALL;

-- 2. ตรวจสอบข้อมูลก่อนแก้ไข
SELECT 'ตรวจสอบข้อมูลก่อนแก้ไข' as status;
SELECT
  location,
  unit_level1_quantity as ลัง_เดิม,
  unit_level2_quantity as กล่อง_เดิม,
  unit_level3_quantity as ชิ้น_เดิม
FROM inventory_items
WHERE location IN ('A/1/2', 'A/1/3', 'A/1/1', 'A/1/4')
ORDER BY location;

-- 3. แก้ไขข้อมูล - ย้าย level ให้ถูกต้อง
UPDATE inventory_items
SET
  unit_level1_quantity = COALESCE(unit_level2_quantity, 0),  -- level2 → level1 (ลัง)
  unit_level2_quantity = COALESCE(unit_level3_quantity, 0),  -- level3 → level2 (กล่อง)
  unit_level3_quantity = 0,                                  -- รีเซ็ต level3 (ชิ้น)
  unit_level1_name = 'ลัง',
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น',
  updated_at = NOW()
WHERE unit_level2_quantity > 0 OR unit_level3_quantity > 0;

-- 4. ตรวจสอบข้อมูลหลังแก้ไข
SELECT 'ตรวจสอบข้อมูลหลังแก้ไข' as status;
SELECT
  location,
  unit_level1_quantity as ลัง_ใหม่,
  unit_level2_quantity as กล่อง_ใหม่,
  unit_level3_quantity as ชิ้น_ใหม่,
  'ควรแสดงเป็นลัง' as expected
FROM inventory_items
WHERE location IN ('A/1/2', 'A/1/3', 'A/1/1', 'A/1/4')
ORDER BY location;

-- 5. เปิด triggers กลับ
ALTER TABLE inventory_items ENABLE TRIGGER ALL;

SELECT 'แก้ไข level mapping สำเร็จ!' as final_status;