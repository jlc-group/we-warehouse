-- วิเคราะห์ข้อมูลทั้งระบบแบบครบถ้วน
-- เพื่อให้เห็นภาพรวมจริงของข้อมูลทั้งหมด

-- 1. สถิติพื้นฐานของตาราง
SELECT
  'สถิติพื้นฐาน' as analysis_type,
  COUNT(*) as รายการทั้งหมด,
  COUNT(DISTINCT location) as จำนวน_location_ที่แตกต่าง,
  COUNT(DISTINCT product_name) as จำนวนสินค้าที่แตกต่าง,
  COUNT(DISTINCT sku) as จำนวน_sku_ที่แตกต่าง
FROM inventory_items;

-- 2. การกระจายของข้อมูลใน unit_level columns
SELECT
  'การกระจายข้อมูล unit_level' as analysis_type,
  SUM(CASE WHEN unit_level1_quantity > 0 THEN 1 ELSE 0 END) as มีข้อมูล_level1,
  SUM(CASE WHEN unit_level2_quantity > 0 THEN 1 ELSE 0 END) as มีข้อมูล_level2,
  SUM(CASE WHEN unit_level3_quantity > 0 THEN 1 ELSE 0 END) as มีข้อมูล_level3,
  SUM(CASE WHEN unit_level1_quantity = 0 AND unit_level2_quantity = 0 AND unit_level3_quantity = 0 THEN 1 ELSE 0 END) as ไม่มีข้อมูล_level
FROM inventory_items;

-- 3. ข้อมูลใน legacy columns
SELECT
  'ข้อมูล legacy columns' as analysis_type,
  SUM(CASE WHEN carton_quantity_legacy > 0 THEN 1 ELSE 0 END) as มีข้อมูล_carton_legacy,
  SUM(CASE WHEN box_quantity_legacy > 0 THEN 1 ELSE 0 END) as มีข้อมูล_box_legacy,
  SUM(CASE WHEN pieces_quantity_legacy > 0 THEN 1 ELSE 0 END) as มีข้อมูล_pieces_legacy,
  SUM(carton_quantity_legacy) as รวม_carton_legacy,
  SUM(box_quantity_legacy) as รวม_box_legacy,
  SUM(pieces_quantity_legacy) as รวม_pieces_legacy
FROM inventory_items;

-- 4. ความสัมพันธ์ระหว่าง legacy และ unit_level
SELECT
  'ความสัมพันธ์ legacy vs unit_level' as analysis_type,
  SUM(CASE WHEN carton_quantity_legacy > 0 AND unit_level1_quantity > 0 THEN 1 ELSE 0 END) as มีทั้ง_carton_และ_level1,
  SUM(CASE WHEN box_quantity_legacy > 0 AND unit_level2_quantity > 0 THEN 1 ELSE 0 END) as มีทั้ง_box_และ_level2,
  SUM(CASE WHEN carton_quantity_legacy > 0 AND unit_level1_quantity = 0 THEN 1 ELSE 0 END) as มี_carton_แต่ไม่มี_level1,
  SUM(CASE WHEN unit_level1_quantity > 0 AND carton_quantity_legacy = 0 THEN 1 ELSE 0 END) as มี_level1_แต่ไม่มี_carton
FROM inventory_items;

-- 5. แสดงตัวอย่างข้อมูลที่ไม่สมเหตุสมผล
SELECT
  'ข้อมูลที่ไม่สมเหตุสมผล' as analysis_type,
  location,
  product_name,
  unit_level1_quantity,
  unit_level2_quantity,
  unit_level3_quantity,
  carton_quantity_legacy,
  box_quantity_legacy,
  pieces_quantity_legacy,
  unit,
  'มี level2/3 แต่ไม่มี level1' as ปัญหา
FROM inventory_items
WHERE (unit_level2_quantity > 0 OR unit_level3_quantity > 0)
  AND unit_level1_quantity = 0
ORDER BY location
LIMIT 10;

-- 6. สถิติตาม unit field
SELECT
  'สถิติตาม unit field' as analysis_type,
  unit,
  COUNT(*) as จำนวน,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM inventory_items), 2) as เปอร์เซ็นต์
FROM inventory_items
GROUP BY unit
ORDER BY จำนวน DESC;

-- 7. ข้อมูลที่มีปัญหาการ mapping
SELECT
  'ข้อมูลที่มีปัญหา mapping' as analysis_type,
  COUNT(*) as จำนวน_รายการที่มีปัญหา
FROM inventory_items
WHERE
  -- กรณีที่มี legacy data แต่ไม่มี unit_level data
  (carton_quantity_legacy > 0 AND unit_level1_quantity = 0) OR
  (box_quantity_legacy > 0 AND unit_level2_quantity = 0) OR
  -- กรณีที่ unit field ไม่ตรงกับข้อมูล
  (unit = 'ลัง' AND unit_level1_quantity = 0) OR
  (unit = 'กล่อง' AND unit_level2_quantity = 0) OR
  (unit = 'ชิ้น' AND unit_level3_quantity = 0);

-- 8. แสดงตัวอย่างข้อมูลที่มีทั้ง legacy และ unit_level
SELECT
  'ตัวอย่างข้อมูลที่มีทั้ง legacy และ unit_level' as analysis_type,
  location,
  product_name,
  unit_level1_quantity as lv1,
  unit_level2_quantity as lv2,
  unit_level3_quantity as lv3,
  carton_quantity_legacy as legacy_carton,
  box_quantity_legacy as legacy_box,
  pieces_quantity_legacy as legacy_pieces,
  unit
FROM inventory_items
WHERE (carton_quantity_legacy > 0 OR box_quantity_legacy > 0 OR pieces_quantity_legacy > 0)
  AND (unit_level1_quantity > 0 OR unit_level2_quantity > 0 OR unit_level3_quantity > 0)
ORDER BY location
LIMIT 15;

-- 9. สรุปภาพรวมสุดท้าย
SELECT
  'สรุปภาพรวม' as analysis_type,
  'รายการทั้งหมด: ' || COUNT(*) as สถิติ
FROM inventory_items
UNION ALL
SELECT
  'สรุปภาพรวม',
  'มีข้อมูล unit_level: ' || SUM(CASE WHEN unit_level1_quantity > 0 OR unit_level2_quantity > 0 OR unit_level3_quantity > 0 THEN 1 ELSE 0 END)
FROM inventory_items
UNION ALL
SELECT
  'สรุปภาพรวม',
  'มีข้อมูล legacy: ' || SUM(CASE WHEN carton_quantity_legacy > 0 OR box_quantity_legacy > 0 OR pieces_quantity_legacy > 0 THEN 1 ELSE 0 END)
FROM inventory_items
UNION ALL
SELECT
  'สรุปภาพรวม',
  'ไม่มีข้อมูลเลย: ' || SUM(CASE WHEN
    unit_level1_quantity = 0 AND unit_level2_quantity = 0 AND unit_level3_quantity = 0 AND
    carton_quantity_legacy = 0 AND box_quantity_legacy = 0 AND pieces_quantity_legacy = 0
    THEN 1 ELSE 0 END)
FROM inventory_items;