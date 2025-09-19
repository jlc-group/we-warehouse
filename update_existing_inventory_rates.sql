-- SQL Script เพื่ออัปเดตข้อมูล inventory_items เก่าให้มี conversion rates
-- จากตาราง product_conversion_rates

-- อัปเดต inventory_items ให้มี conversion rates จาก product_conversion_rates
UPDATE public.inventory_items
SET
  unit_level1_rate = pcr.unit_level1_rate,
  unit_level2_rate = pcr.unit_level2_rate,
  unit_level1_name = COALESCE(public.inventory_items.unit_level1_name, pcr.unit_level1_name),
  unit_level2_name = COALESCE(public.inventory_items.unit_level2_name, pcr.unit_level2_name),
  unit_level3_name = COALESCE(public.inventory_items.unit_level3_name, pcr.unit_level3_name, 'ชิ้น')
FROM public.product_conversion_rates pcr
WHERE public.inventory_items.sku = pcr.sku;

-- ตรวจสอบผลลัพธ์การอัปเดต
SELECT
  'อัปเดตข้อมูล conversion rates สำเร็จ!' as status,
  COUNT(*) as updated_items_count
FROM public.inventory_items
WHERE unit_level1_rate > 0 OR unit_level2_rate > 0;

-- แสดงข้อมูลตัวอย่างหลังอัปเดต
SELECT
  sku,
  product_name,
  unit_level1_quantity,
  unit_level1_name,
  unit_level1_rate,
  unit_level2_quantity,
  unit_level2_name,
  unit_level2_rate,
  unit_level3_quantity,
  unit_level3_name,
  -- คำนวณจำนวนรวม
  (
    COALESCE(unit_level1_quantity, 0) * COALESCE(unit_level1_rate, 0) +
    COALESCE(unit_level2_quantity, 0) * COALESCE(unit_level2_rate, 0) +
    COALESCE(unit_level3_quantity, 0)
  ) as total_base_units
FROM public.inventory_items
WHERE sku IN ('L3-8G', 'L8A-6G', 'L8B-6G')
ORDER BY sku;