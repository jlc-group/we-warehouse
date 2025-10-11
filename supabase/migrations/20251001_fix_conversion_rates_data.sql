-- Migration: Fix and populate product_conversion_rates with missing data
-- Date: 2025-10-01
-- Purpose: Ensure all conversion rates have sku, product_name, product_type, and product_id

-- ขั้นตอนที่ 1: ตรวจสอบและแสดงสถานะปัจจุบัน
DO $$
DECLARE
    total_conversions INTEGER;
    conversions_with_product_id INTEGER;
    conversions_with_sku INTEGER;
    conversions_with_product_type INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_conversions FROM product_conversion_rates;
    SELECT COUNT(*) INTO conversions_with_product_id FROM product_conversion_rates WHERE product_id IS NOT NULL;
    SELECT COUNT(*) INTO conversions_with_sku FROM product_conversion_rates WHERE sku IS NOT NULL AND sku != '';
    SELECT COUNT(*) INTO conversions_with_product_type FROM product_conversion_rates WHERE product_type IS NOT NULL;

    RAISE NOTICE '📊 สถานะปัจจุบันของตาราง product_conversion_rates:';
    RAISE NOTICE 'รายการทั้งหมด: %', total_conversions;
    RAISE NOTICE 'มี product_id: %', conversions_with_product_id;
    RAISE NOTICE 'มี sku: %', conversions_with_sku;
    RAISE NOTICE 'มี product_type: %', conversions_with_product_type;
END $$;

-- ขั้นตอนที่ 2: อัพเดตข้อมูลที่มี product_id แต่ขาด sku, product_name, product_type
UPDATE product_conversion_rates pcr
SET
    sku = p.sku_code,
    product_name = p.product_name,
    product_type = p.product_type
FROM products p
WHERE
    pcr.product_id = p.id
    AND (
        pcr.sku IS NULL OR pcr.sku = '' OR
        pcr.product_name IS NULL OR pcr.product_name = '' OR
        pcr.product_type IS NULL
    );

-- ขั้นตอนที่ 3: อัพเดตข้อมูลที่มี sku แต่ขาด product_id และข้อมูลอื่นๆ
UPDATE product_conversion_rates pcr
SET
    product_id = p.id,
    product_name = p.product_name,
    product_type = p.product_type
FROM products p
WHERE
    pcr.sku = p.sku_code
    AND pcr.product_id IS NULL;

-- ขั้นตอนที่ 4: แสดงผลลัพธ์หลังการอัพเดต
DO $$
DECLARE
    total_conversions INTEGER;
    complete_records INTEGER;
    incomplete_records INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_conversions FROM product_conversion_rates;

    SELECT COUNT(*) INTO complete_records
    FROM product_conversion_rates
    WHERE
        product_id IS NOT NULL AND
        sku IS NOT NULL AND sku != '' AND
        product_name IS NOT NULL AND product_name != '' AND
        product_type IS NOT NULL;

    SELECT COUNT(*) INTO incomplete_records
    FROM product_conversion_rates
    WHERE
        product_id IS NULL OR
        sku IS NULL OR sku = '' OR
        product_name IS NULL OR product_name = '' OR
        product_type IS NULL;

    RAISE NOTICE '';
    RAISE NOTICE '✅ ผลลัพธ์หลังการอัพเดต:';
    RAISE NOTICE 'รายการทั้งหมด: %', total_conversions;
    RAISE NOTICE 'รายการที่สมบูรณ์: %', complete_records;
    RAISE NOTICE 'รายการที่ยังไม่สมบูรณ์: %', incomplete_records;

    IF incomplete_records > 0 THEN
        RAISE WARNING '⚠️ มีรายการ % รายการที่ยังไม่สมบูรณ์', incomplete_records;
    ELSE
        RAISE NOTICE '🎉 ข้อมูลทั้งหมดสมบูรณ์แล้ว!';
    END IF;
END $$;

-- ขั้นตอนที่ 5: แสดงตัวอย่างข้อมูลที่ยังไม่สมบูรณ์ (ถ้ามี)
SELECT
    'รายการที่ยังไม่สมบูรณ์:' as info,
    id,
    sku,
    product_name,
    product_type,
    product_id,
    CASE
        WHEN product_id IS NULL THEN 'ขาด product_id'
        WHEN sku IS NULL OR sku = '' THEN 'ขาด sku'
        WHEN product_name IS NULL OR product_name = '' THEN 'ขาด product_name'
        WHEN product_type IS NULL THEN 'ขาด product_type'
        ELSE 'สมบูรณ์'
    END as status
FROM product_conversion_rates
WHERE
    product_id IS NULL OR
    sku IS NULL OR sku = '' OR
    product_name IS NULL OR product_name = '' OR
    product_type IS NULL
LIMIT 10;

-- แสดงสรุปตามประเภทสินค้า
SELECT
    '📊 สรุปตามประเภทสินค้า:' as info,
    product_type,
    COUNT(*) as count
FROM product_conversion_rates
WHERE product_type IS NOT NULL
GROUP BY product_type
ORDER BY count DESC;

SELECT '🎉 Migration เสร็จสมบูรณ์!' as status;
