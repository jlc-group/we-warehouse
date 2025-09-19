-- แก้ไข mapping ตามที่กำหนดไว้อย่างชัดเจน
-- carton_quantity_legacy → unit_level1_quantity (ลัง)
-- box_quantity_legacy → unit_level2_quantity (กล่อง)

-- 1. ตรวจสอบข้อมูล legacy ก่อนแก้ไข
SELECT
  'ตรวจสอบข้อมูล legacy ก่อนแก้ไข' as status,
  COUNT(*) as รายการทั้งหมด,
  SUM(CASE WHEN carton_quantity_legacy > 0 THEN 1 ELSE 0 END) as มี_carton_legacy,
  SUM(CASE WHEN box_quantity_legacy > 0 THEN 1 ELSE 0 END) as มี_box_legacy,
  SUM(carton_quantity_legacy) as รวม_carton,
  SUM(box_quantity_legacy) as รวม_box
FROM inventory_items;

-- 2. แสดงตัวอย่างข้อมูลก่อนแก้ไข
SELECT
  'ตัวอย่างข้อมูลก่อนแก้ไข' as status,
  location,
  carton_quantity_legacy,
  box_quantity_legacy,
  unit_level1_quantity,
  unit_level2_quantity,
  unit_level3_quantity
FROM inventory_items
WHERE carton_quantity_legacy > 0 OR box_quantity_legacy > 0
ORDER BY location
LIMIT 10;

-- 3. แก้ไข mapping ตามที่กำหนด
UPDATE inventory_items
SET
  unit_level1_quantity = carton_quantity_legacy,  -- ลัง
  unit_level2_quantity = box_quantity_legacy,     -- กล่อง
  unit_level3_quantity = 0,                       -- รีเซ็ต ชิ้น
  unit_level1_name = 'ลัง',
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น',
  unit = CASE
    WHEN carton_quantity_legacy > 0 THEN 'ลัง'
    WHEN box_quantity_legacy > 0 THEN 'กล่อง'
    ELSE 'ลัง'
  END,
  updated_at = NOW()
WHERE carton_quantity_legacy > 0 OR box_quantity_legacy > 0;

-- 4. ตรวจสอบผลลัพธ์หลังแก้ไข
SELECT
  'ผลลัพธ์หลังแก้ไข' as status,
  COUNT(*) as รายการที่แก้ไข
FROM inventory_items
WHERE unit_level1_quantity > 0 OR unit_level2_quantity > 0;

-- 5. แสดงตัวอย่างข้อมูลหลังแก้ไข (locations เดิม)
SELECT
  'ตัวอย่างข้อมูลหลังแก้ไข' as status,
  location,
  carton_quantity_legacy as legacy_carton,
  box_quantity_legacy as legacy_box,
  unit_level1_quantity as ลัง,
  unit_level2_quantity as กล่อง,
  unit_level3_quantity as ชิ้น,
  unit as หน่วยหลัก
FROM inventory_items
WHERE location IN ('A/1/1', 'A/1/2', 'A/1/3', 'A/1/4', 'A/7/1', 'A/7/4')
ORDER BY location;

-- 6. สรุปสถิติหลังแก้ไข
SELECT
  'สรุปสถิติหลังแก้ไข' as status,
  COUNT(*) as รายการทั้งหมด,
  SUM(CASE WHEN unit_level1_quantity > 0 THEN 1 ELSE 0 END) as มี_ลัง,
  SUM(CASE WHEN unit_level2_quantity > 0 THEN 1 ELSE 0 END) as มี_กล่อง,
  SUM(CASE WHEN unit_level3_quantity > 0 THEN 1 ELSE 0 END) as มี_ชิ้น,
  SUM(unit_level1_quantity) as รวม_ลัง,
  SUM(unit_level2_quantity) as รวม_กล่อง,
  SUM(unit_level3_quantity) as รวม_ชิ้น
FROM inventory_items;

SELECT 'แก้ไข mapping legacy → unit_level สำเร็จ!' as final_status;