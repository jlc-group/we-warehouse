-- Fix Level Mapping แบบ Final Version
-- ใช้ PostgreSQL 15+ syntax และหลีกเลี่ยงปัญหา triggers

-- 1. ตรวจสอบข้อมูลก่อนแก้ไข
SELECT
  'ข้อมูลก่อนแก้ไข' as status,
  location,
  unit_level1_quantity as ลัง_เดิม,
  unit_level2_quantity as กล่อง_เดิม,
  unit_level3_quantity as ชิ้น_เดิม
FROM inventory_items
WHERE location IN ('A/1/1', 'A/1/2', 'A/1/3', 'A/1/4', 'A/7/1', 'A/7/4')
ORDER BY location;

-- 2. แก้ไขทีละ batch เพื่อหลีกเลี่ยง trigger conflicts
-- Batch 1: ย้าย level2 → level1 (สำหรับที่มีเฉพาะ level2)
UPDATE inventory_items
SET
  unit_level1_quantity = COALESCE(unit_level1_quantity, 0) + COALESCE(unit_level2_quantity, 0),
  unit_level2_quantity = 0,
  unit_level1_name = 'ลัง',
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น'
WHERE unit_level2_quantity > 0 AND unit_level3_quantity = 0;

-- แสดงผลลัพธ์ Batch 1
SELECT
  'หลัง Batch 1: ย้าย level2→level1' as status,
  COUNT(*) as จำนวนที่แก้ไข
FROM inventory_items
WHERE unit_level2_quantity = 0 AND unit_level1_quantity > 0;

-- Batch 2: ย้าย level3 → level2 (สำหรับที่มีเฉพาะ level3)
UPDATE inventory_items
SET
  unit_level2_quantity = COALESCE(unit_level2_quantity, 0) + COALESCE(unit_level3_quantity, 0),
  unit_level3_quantity = 0,
  unit_level1_name = 'ลัง',
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น'
WHERE unit_level3_quantity > 0 AND unit_level2_quantity = 0;

-- แสดงผลลัพธ์ Batch 2
SELECT
  'หลัง Batch 2: ย้าย level3→level2' as status,
  COUNT(*) as จำนวนที่แก้ไข
FROM inventory_items
WHERE unit_level3_quantity = 0 AND unit_level2_quantity > 0;

-- Batch 3: จัดการกรณีที่มีทั้ง level2 และ level3
UPDATE inventory_items
SET
  unit_level1_quantity = COALESCE(unit_level1_quantity, 0) + COALESCE(unit_level2_quantity, 0),
  unit_level2_quantity = COALESCE(unit_level3_quantity, 0),
  unit_level3_quantity = 0,
  unit_level1_name = 'ลัง',
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น'
WHERE unit_level2_quantity > 0 AND unit_level3_quantity > 0;

-- 3. อัปเดต unit field ให้ตรงกับข้อมูลใหม่
UPDATE inventory_items
SET
  unit = CASE
    WHEN unit_level1_quantity > 0 THEN 'ลัง'
    WHEN unit_level2_quantity > 0 THEN 'กล่อง'
    WHEN unit_level3_quantity > 0 THEN 'ชิ้น'
    ELSE 'ลัง'
  END
WHERE unit_level1_quantity > 0 OR unit_level2_quantity > 0 OR unit_level3_quantity > 0;

-- 4. ตรวจสอบข้อมูลหลังแก้ไข
SELECT
  'ข้อมูลหลังแก้ไข' as status,
  location,
  unit_level1_quantity as ลัง_ใหม่,
  unit_level2_quantity as กล่อง_ใหม่,
  unit_level3_quantity as ชิ้น_ใหม่,
  unit as หน่วยหลัก
FROM inventory_items
WHERE location IN ('A/1/1', 'A/1/2', 'A/1/3', 'A/1/4', 'A/7/1', 'A/7/4')
ORDER BY location;

-- 5. สถิติสุดท้าย
SELECT
  'สถิติสุดท้าย' as status,
  COUNT(*) as รายการทั้งหมด,
  SUM(CASE WHEN unit_level1_quantity > 0 THEN 1 ELSE 0 END) as มี_ลัง,
  SUM(CASE WHEN unit_level2_quantity > 0 THEN 1 ELSE 0 END) as มี_กล่อง,
  SUM(CASE WHEN unit_level3_quantity > 0 THEN 1 ELSE 0 END) as มี_ชิ้น
FROM inventory_items;

-- 6. ตรวจสอบว่ายังมีข้อมูลใน level ผิดหรือไม่
SELECT
  'ตรวจสอบข้อมูลที่เหลือใน level ผิด' as status,
  COUNT(*) as จำนวนที่ยังต้องแก้ไข
FROM inventory_items
WHERE unit_level2_quantity > 0 OR unit_level3_quantity > 0;

SELECT 'แก้ไข Level Mapping สำเร็จแล้ว!' as final_status;