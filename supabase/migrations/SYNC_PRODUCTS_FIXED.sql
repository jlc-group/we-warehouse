-- ============================================================================
-- 🔄 SYNC ALL PRODUCTS TO CONVERSION RATES (FIXED)
-- ============================================================================
-- สร้าง conversion rate สำหรับทุก products ที่ยังไม่มี
-- ============================================================================

-- สร้าง conversion rate เริ่มต้นสำหรับทุก product ที่ยังไม่มี
INSERT INTO product_conversion_rates (
  product_id,
  sku,
  product_name,
  product_type,
  unit_level1_name,
  unit_level1_rate,
  unit_level2_name,
  unit_level2_rate,
  unit_level3_name
)
SELECT
  p.id as product_id,
  p.sku_code as sku,
  p.product_name,
  p.product_type,
  'ลัง' as unit_level1_name,
  144 as unit_level1_rate,
  'กล่อง' as unit_level2_name,
  12 as unit_level2_rate,
  'ชิ้น' as unit_level3_name
FROM products p
LEFT JOIN product_conversion_rates pcr ON p.id = pcr.product_id
WHERE p.is_active = true
  AND pcr.id IS NULL;

-- แสดงผลลัพธ์
SELECT
  COUNT(*) as total_products,
  (SELECT COUNT(*) FROM product_conversion_rates) as total_conversions,
  (SELECT COUNT(*) FROM products WHERE is_active = true) as active_products
FROM products;

-- ตรวจสอบ L19-8G และ L19-48G
SELECT
  'L19-8G' as sku,
  CASE
    WHEN EXISTS (SELECT 1 FROM product_conversion_rates WHERE sku = 'L19-8G')
    THEN 'Found in conversion_rates'
    ELSE 'NOT FOUND'
  END as status
UNION ALL
SELECT
  'L19-48G' as sku,
  CASE
    WHEN EXISTS (SELECT 1 FROM product_conversion_rates WHERE sku = 'L19-48G')
    THEN 'Found in conversion_rates'
    ELSE 'NOT FOUND'
  END as status;

-- แสดง 10 รายการล่าสุดที่สร้าง
SELECT
  sku,
  product_name,
  product_type,
  unit_level1_rate,
  unit_level2_rate,
  created_at
FROM product_conversion_rates
ORDER BY created_at DESC
LIMIT 10;
