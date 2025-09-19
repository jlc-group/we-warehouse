-- กู้ข้อมูลฉุกเฉิน - คืนข้อมูลจาก legacy columns
-- ถ้าข้อมูลในระบบมั่วแล้ว ให้ใช้ script นี้

-- 1. ตรวจสอบข้อมูลปัจจุบันที่อาจมั่วแล้ว
SELECT
  'ข้อมูลปัจจุบันที่อาจมั่ว' as status,
  location,
  unit_level1_quantity,
  unit_level2_quantity,
  unit_level3_quantity,
  carton_quantity_legacy,
  box_quantity_legacy,
  pieces_quantity_legacy
FROM inventory_items
WHERE location IN ('A/1/1', 'A/1/2', 'A/1/3', 'A/1/4', 'A/7/1', 'A/7/4')
ORDER BY location;

-- 2. ตรวจสอบว่ายังมีข้อมูล legacy หรือไม่
SELECT
  'ข้อมูล legacy ที่เหลือ' as status,
  COUNT(*) as total_legacy_items,
  SUM(carton_quantity_legacy) as total_cartons,
  SUM(box_quantity_legacy) as total_boxes,
  SUM(pieces_quantity_legacy) as total_pieces
FROM inventory_items
WHERE carton_quantity_legacy > 0 OR box_quantity_legacy > 0 OR pieces_quantity_legacy > 0;

-- 3. กู้ข้อมูลจาก legacy columns (ถ้ายังมี)
-- รีเซ็ต unit_level columns และคืนค่าจาก legacy
UPDATE inventory_items
SET
  -- รีเซ็ต unit_level ทั้งหมดก่อน
  unit_level1_quantity = 0,
  unit_level2_quantity = 0,
  unit_level3_quantity = 0,

  -- แล้วจึงคืนค่าจาก legacy อย่างถูกต้อง
  unit_level1_quantity = COALESCE(carton_quantity_legacy, 0),  -- ลัง
  unit_level2_quantity = COALESCE(box_quantity_legacy, 0),     -- กล่อง
  unit_level3_quantity = COALESCE(pieces_quantity_legacy, 0),  -- ชิ้น

  -- ตั้งชื่อหน่วยให้ถูกต้อง
  unit_level1_name = 'ลัง',
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น',

  -- ตั้ง unit หลักตามข้อมูลที่มี
  unit = CASE
    WHEN COALESCE(carton_quantity_legacy, 0) > 0 THEN 'ลัง'
    WHEN COALESCE(box_quantity_legacy, 0) > 0 THEN 'กล่อง'
    WHEN COALESCE(pieces_quantity_legacy, 0) > 0 THEN 'ชิ้น'
    ELSE 'ลัง'
  END,

  updated_at = NOW()
WHERE carton_quantity_legacy > 0 OR box_quantity_legacy > 0 OR pieces_quantity_legacy > 0;

-- 4. ตรวจสอบข้อมูลหลังกู้คืน
SELECT
  'ข้อมูลหลังกู้คืน' as status,
  location,
  unit_level1_quantity as ลัง,
  unit_level2_quantity as กล่อง,
  unit_level3_quantity as ชิ้น,
  unit as หน่วยหลัก,
  carton_quantity_legacy,
  box_quantity_legacy,
  pieces_quantity_legacy
FROM inventory_items
WHERE location IN ('A/1/1', 'A/1/2', 'A/1/3', 'A/1/4', 'A/7/1', 'A/7/4')
ORDER BY location;

-- 5. สถิติหลังกู้คืน
SELECT
  'สถิติหลังกู้คืน' as status,
  COUNT(*) as รายการทั้งหมด,
  SUM(CASE WHEN unit_level1_quantity > 0 THEN 1 ELSE 0 END) as มี_ลัง,
  SUM(CASE WHEN unit_level2_quantity > 0 THEN 1 ELSE 0 END) as มี_กล่อง,
  SUM(CASE WHEN unit_level3_quantity > 0 THEN 1 ELSE 0 END) as มี_ชิ้น
FROM inventory_items;

SELECT 'กู้ข้อมูลฉุกเฉินสำเร็จ! ข้อมูลควรกลับมาเป็นปกติแล้ว' as final_status;