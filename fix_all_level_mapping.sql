-- แก้ไขการ mapping ทั้งหมดให้ถูกต้อง
-- ย้ายข้อมูลจาก level ที่ผิดไปยัง level ที่ถูก: level3→level2, level2→level1

-- 1. แสดงข้อมูลก่อนแก้ไข (สำหรับตรวจสอบ)
SELECT
  'ข้อมูลก่อนแก้ไข - รวมทุก location ที่มีข้อมูล level2,3' as status,
  COUNT(*) as total_items_with_wrong_levels
FROM inventory_items
WHERE unit_level2_quantity > 0 OR unit_level3_quantity > 0;

-- 2. แสดงตัวอย่างข้อมูลที่จะแก้ไข
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

-- 3. แก้ไขข้อมูลทั้งหมด - ย้าย level ให้ถูกต้อง
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

-- 4. แสดงข้อมูลหลังแก้ไข
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

-- 5. สรุปผลลัพธ์
SELECT
  COUNT(*) as total_items,
  SUM(CASE WHEN unit_level1_quantity > 0 THEN 1 ELSE 0 END) as items_with_level1_ลัง,
  SUM(CASE WHEN unit_level2_quantity > 0 THEN 1 ELSE 0 END) as items_with_level2_กล่อง,
  SUM(CASE WHEN unit_level3_quantity > 0 THEN 1 ELSE 0 END) as items_with_level3_ชิ้น
FROM inventory_items;

SELECT 'แก้ไขการ mapping ระดับหน่วยทั้งหมดสำเร็จ!' as final_status;