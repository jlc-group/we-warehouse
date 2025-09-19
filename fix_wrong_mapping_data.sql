-- แก้ไขข้อมูลที่ถูก map ผิด level แล้ว
-- สำหรับกรณีที่ข้อมูลถูกบันทึกไปผิด level

-- แสดงข้อมูลก่อนแก้ไข (เพื่อยืนยันปัญหา)
SELECT
  'ข้อมูลก่อนแก้ไข - ตรวจสอบว่าข้อมูลอยู่ผิด level' as status;

SELECT
  sku,
  product_name,
  unit_level1_quantity,  -- ลัง (ควรมีข้อมูล)
  unit_level2_quantity,  -- กล่อง (ถ้ามีข้อมูลลังอยู่ที่นี่ = ผิด)
  unit_level3_quantity,  -- ชิ้น (ถ้ามีข้อมูลกล่องอยู่ที่นี่ = ผิด)
  unit_level1_name,
  unit_level2_name,
  unit_level3_name
FROM public.inventory_items
WHERE unit_level2_quantity > 0 OR unit_level3_quantity > 0
LIMIT 10;

-- แก้ไขข้อมูลที่ map ผิด level
-- กรณี: ข้อมูลลังไปอยู่ใน level 2, ข้อมูลกล่องไปอยู่ใน level 3
UPDATE public.inventory_items
SET
  unit_level1_quantity = unit_level2_quantity,  -- ย้ายข้อมูลจาก level 2 → level 1 (ลัง)
  unit_level2_quantity = unit_level3_quantity,  -- ย้ายข้อมูลจาก level 3 → level 2 (กล่อง)
  unit_level3_quantity = 0,                     -- ล้าง level 3 (ชิ้น - ยังไม่มีข้อมูลเก่า)
  unit_level1_name = 'ลัง',
  unit_level2_name = 'กล่อง',
  unit_level3_name = 'ชิ้น'
WHERE unit_level2_quantity > 0 OR unit_level3_quantity > 0;

-- แสดงข้อมูลหลังแก้ไข
SELECT
  'ข้อมูลหลังแก้ไข - ตรวจสอบว่าข้อมูลอยู่ถูก level แล้ว' as status;

SELECT
  sku,
  product_name,
  unit_level1_quantity,  -- ลัง (ควรมีข้อมูลที่ย้ายมาจาก level 2)
  unit_level2_quantity,  -- กล่อง (ควรมีข้อมูลที่ย้ายมาจาก level 3)
  unit_level3_quantity,  -- ชิ้น (ควรเป็น 0)
  unit_level1_name,
  unit_level2_name,
  unit_level3_name
FROM public.inventory_items
WHERE unit_level1_quantity > 0 OR unit_level2_quantity > 0 OR unit_level3_quantity > 0
ORDER BY sku
LIMIT 10;

-- สรุปผลลัพธ์
SELECT
  COUNT(*) as total_items,
  SUM(CASE WHEN unit_level1_quantity > 0 THEN 1 ELSE 0 END) as items_with_level1,
  SUM(CASE WHEN unit_level2_quantity > 0 THEN 1 ELSE 0 END) as items_with_level2,
  SUM(CASE WHEN unit_level3_quantity > 0 THEN 1 ELSE 0 END) as items_with_level3
FROM public.inventory_items;

SELECT 'แก้ไขการ mapping ข้อมูลสำเร็จ!' as final_status;