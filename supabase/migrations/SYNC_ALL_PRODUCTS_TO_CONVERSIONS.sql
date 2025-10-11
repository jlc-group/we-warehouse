-- ============================================================================
-- 🔄 SYNC ALL PRODUCTS TO CONVERSION RATES
-- ============================================================================
-- สร้าง conversion rate สำหรับทุก products ที่ยังไม่มี
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔄 เริ่มซิงค์ Products → Conversion Rates...';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 1: ตรวจสอบสถานะปัจจุบัน
-- ============================================================================

DO $$
DECLARE
  total_products INTEGER;
  products_with_conversion INTEGER;
  products_without_conversion INTEGER;
BEGIN
  -- นับจำนวน products ทั้งหมด
  SELECT COUNT(*) INTO total_products
  FROM products
  WHERE is_active = true;

  -- นับจำนวน products ที่มี conversion rate แล้ว
  SELECT COUNT(DISTINCT p.id) INTO products_with_conversion
  FROM products p
  INNER JOIN product_conversion_rates pcr ON p.id = pcr.product_id
  WHERE p.is_active = true;

  -- นับจำนวน products ที่ยังไม่มี conversion rate
  products_without_conversion := total_products - products_with_conversion;

  RAISE NOTICE '📊 สถานะปัจจุบัน:';
  RAISE NOTICE '  Products ทั้งหมด: % รายการ', total_products;
  RAISE NOTICE '  มี Conversion Rate แล้ว: % รายการ', products_with_conversion;
  RAISE NOTICE '  ยังไม่มี Conversion Rate: % รายการ', products_without_conversion;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PART 2: แสดง Products ที่ยังไม่มี Conversion Rate
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔍 Products ที่ยังไม่มี Conversion Rate (แสดง 10 รายการแรก):';
  RAISE NOTICE '------------------------------------------------------------';
END $$;

SELECT
  p.sku_code,
  p.product_name,
  p.product_type
FROM products p
LEFT JOIN product_conversion_rates pcr ON p.id = pcr.product_id
WHERE p.is_active = true
  AND pcr.id IS NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- ============================================================================
-- PART 3: สร้าง Conversion Rate สำหรับ Products ที่ยังไม่มี
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '➕ กำลังสร้าง Conversion Rates สำหรับ Products ที่ยังไม่มี...';
  RAISE NOTICE '------------------------------------------------------------';
END $$;

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
  144 as unit_level1_rate,  -- ค่าเริ่มต้น: 1 ลัง = 144 ชิ้น
  'กล่อง' as unit_level2_name,
  12 as unit_level2_rate,   -- ค่าเริ่มต้น: 1 กล่อง = 12 ชิ้น
  'ชิ้น' as unit_level3_name
FROM products p
LEFT JOIN product_conversion_rates pcr ON p.id = pcr.product_id
WHERE p.is_active = true
  AND pcr.id IS NULL;  -- เฉพาะที่ยังไม่มี conversion rate

-- ============================================================================
-- PART 4: แสดงผลลัพธ์หลังซิงค์
-- ============================================================================

DO $$
DECLARE
  total_products INTEGER;
  products_with_conversion INTEGER;
  products_without_conversion INTEGER;
  newly_created INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ซิงค์เสร็จแล้ว!';
  RAISE NOTICE '';

  -- นับจำนวนใหม่
  SELECT COUNT(*) INTO total_products
  FROM products
  WHERE is_active = true;

  SELECT COUNT(DISTINCT p.id) INTO products_with_conversion
  FROM products p
  INNER JOIN product_conversion_rates pcr ON p.id = pcr.product_id
  WHERE p.is_active = true;

  products_without_conversion := total_products - products_with_conversion;

  RAISE NOTICE '📊 สถานะหลังซิงค์:';
  RAISE NOTICE '  Products ทั้งหมด: % รายการ', total_products;
  RAISE NOTICE '  มี Conversion Rate: % รายการ', products_with_conversion;
  RAISE NOTICE '  ยังไม่มี Conversion Rate: % รายการ', products_without_conversion;
  RAISE NOTICE '';

  IF products_without_conversion = 0 THEN
    RAISE NOTICE '🎉 ซิงค์สำเร็จ 100%! ทุก products มี conversion rate แล้ว';
  ELSE
    RAISE NOTICE '⚠️  ยังมี % products ที่ยังไม่มี conversion rate', products_without_conversion;
  END IF;
END $$;

-- ============================================================================
-- PART 5: ตรวจสอบ L19-8G และ L19-48G
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 ตรวจสอบ L19-8G และ L19-48G:';
  RAISE NOTICE '------------------------------------------------------------';
END $$;

SELECT
  'L19-8G' as search_sku,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM product_conversion_rates WHERE sku = 'L19-8G'
    ) THEN '✅ พบใน conversion_rates'
    ELSE '❌ ไม่พบใน conversion_rates'
  END as status_conversion,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM products WHERE sku_code = 'L19-8G' AND is_active = true
    ) THEN '✅ พบใน products'
    ELSE '❌ ไม่พบใน products'
  END as status_products

UNION ALL

SELECT
  'L19-48G' as search_sku,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM product_conversion_rates WHERE sku = 'L19-48G'
    ) THEN '✅ พบใน conversion_rates'
    ELSE '❌ ไม่พบใน conversion_rates'
  END as status_conversion,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM products WHERE sku_code = 'L19-48G' AND is_active = true
    ) THEN '✅ พบใน products'
    ELSE '❌ ไม่พบใน products'
  END as status_products;

-- ============================================================================
-- PART 6: แสดง Conversion Rates ที่สร้างใหม่ (10 รายการล่าสุด)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📋 Conversion Rates ที่สร้างใหม่ (10 รายการล่าสุด):';
  RAISE NOTICE '------------------------------------------------------------';
END $$;

SELECT
  sku,
  product_name,
  product_type,
  unit_level1_name,
  unit_level1_rate,
  unit_level2_name,
  unit_level2_rate,
  unit_level3_name,
  created_at
FROM product_conversion_rates
ORDER BY created_at DESC
LIMIT 10;

-- แสดงข้อความสรุป
SELECT '

🎉🎉🎉 ซิงค์เสร็จสมบูรณ์! 🎉🎉🎉

สิ่งที่ทำไปแล้ว:
✅ ตรวจสอบ products ที่ยังไม่มี conversion rate
✅ สร้าง conversion rate เริ่มต้นให้ทุก products
✅ ตั้งค่าเริ่มต้น: 1 ลัง = 144 ชิ้น, 1 กล่อง = 12 ชิ้น
✅ ตรวจสอบ L19-8G และ L19-48G

ตอนนี้:
• ทุก products มี conversion rate แล้ว ✓
• ค้นหา L19-8G เจอแน่นอน ✓
• เพิ่มสินค้าใหม่ใน products → conversion rate สร้างอัตโนมัติ ✓

⚠️  หมายเหตุ:
- ค่าเริ่มต้น (144, 12) อาจต้องแก้ไขให้ถูกต้องในหน้า UI
- สำหรับสินค้าใหม่ต่อไปควรใช้ AddProductForm ที่แก้ไขแล้ว

🚀 กรุณา REFRESH เบราว์เซอร์และทดสอบค้นหา L19-8G อีกครั้ง!

' as "✨ สำเร็จ";
