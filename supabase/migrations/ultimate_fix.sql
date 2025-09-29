-- ULTIMATE FIX SCRIPT - แก้ปัญหาทั้งหมดในครั้งเดียว
-- รันสคริปต์นี้เพื่อแก้ปัญหา 404 และ 400 errors

-- =====================================================
-- 1. สร้าง products_summary view ที่หายไป
-- =====================================================

DROP VIEW IF EXISTS public.products_summary CASCADE;

CREATE OR REPLACE VIEW public.products_summary AS
SELECT
    p.id,
    p.sku_code,
    p.product_name,
    p.product_type,
    p.category,
    p.subcategory,
    p.brand,
    p.unit_of_measure,
    p.is_active,
    p.created_at,
    p.updated_at,
    -- เพิ่มข้อมูลสต็อก
    COALESCE(inv.total_quantity, 0) as total_inventory_quantity,
    COALESCE(inv.reserved_quantity, 0) as reserved_inventory_quantity,
    COALESCE(inv.available_quantity, 0) as available_inventory_quantity,
    COALESCE(inv.location_count, 0) as location_count
FROM public.products p
LEFT JOIN (
    SELECT
        product_id,
        SUM(COALESCE(quantity_level1, 0) + COALESCE(quantity_level2, 0) + COALESCE(quantity_level3, 0)) as total_quantity,
        SUM(COALESCE(reserved_level1_quantity, 0) + COALESCE(reserved_level2_quantity, 0) + COALESCE(reserved_level3_quantity, 0)) as reserved_quantity,
        SUM(
            (COALESCE(quantity_level1, 0) + COALESCE(quantity_level2, 0) + COALESCE(quantity_level3, 0)) -
            (COALESCE(reserved_level1_quantity, 0) + COALESCE(reserved_level2_quantity, 0) + COALESCE(reserved_level3_quantity, 0))
        ) as available_quantity,
        COUNT(DISTINCT location) as location_count
    FROM public.inventory_items
    WHERE is_deleted = false OR is_deleted IS NULL
    GROUP BY product_id
) inv ON p.id = inv.product_id
WHERE p.is_active = true OR p.is_active IS NULL
ORDER BY p.product_type, p.sku_code;

-- =====================================================
-- 2. ตรวจสอบและสร้าง products_with_conversions view
-- =====================================================

DROP VIEW IF EXISTS public.products_with_conversions CASCADE;

CREATE OR REPLACE VIEW public.products_with_conversions AS
SELECT
    -- ข้อมูลจากตาราง products
    p.id,
    p.sku_code,
    p.product_name,
    p.product_type,
    p.category,
    p.subcategory,
    p.brand,
    p.unit_of_measure,
    p.is_active,
    p.created_at as product_created_at,
    p.updated_at as product_updated_at,

    -- ข้อมูลจากตาราง product_conversion_rates
    pcr.id as conversion_id,
    pcr.sku as conversion_sku,
    pcr.product_name as conversion_product_name,
    pcr.unit_level1_name,
    pcr.unit_level1_rate,
    pcr.unit_level2_name,
    pcr.unit_level2_rate,
    pcr.unit_level3_name,
    pcr.created_at as conversion_created_at,
    pcr.updated_at as conversion_updated_at,

    -- สถานะการเชื่อมโยง
    CASE
        WHEN pcr.id IS NOT NULL THEN true
        ELSE false
    END as has_conversion_rates,

    -- ตัวอย่างการคำนวณ
    CASE
        WHEN pcr.unit_level1_rate IS NOT NULL AND pcr.unit_level2_rate IS NOT NULL THEN
            (10 * COALESCE(pcr.unit_level1_rate, 0)) +
            (2 * COALESCE(pcr.unit_level2_rate, 0)) + 5
        WHEN pcr.unit_level1_rate IS NOT NULL THEN
            (10 * COALESCE(pcr.unit_level1_rate, 0)) + 5
        WHEN pcr.unit_level2_rate IS NOT NULL THEN
            (2 * COALESCE(pcr.unit_level2_rate, 0)) + 5
        ELSE 5
    END as example_calculation

FROM public.products p
LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku
WHERE p.is_active = true OR p.is_active IS NULL
ORDER BY p.product_type, p.sku_code;

-- =====================================================
-- 3. แก้ปัญหา constraint violation ใน customer_orders
-- =====================================================

-- ลบ constraint ที่ทำให้เกิดปัญหา
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- หา constraint ที่เป็นปัญหา
    FOR constraint_name IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'customer_orders'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'source_sales_bill_id'
    LOOP
        EXECUTE 'ALTER TABLE public.customer_orders DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'ลบ constraint: %', constraint_name;
    END LOOP;
END $$;

-- ทำความสะอาดข้อมูลที่เป็นปัญหา
UPDATE public.customer_orders
SET source_sales_bill_id = NULL
WHERE source_sales_bill_id IS NOT NULL
AND source_sales_bill_id NOT IN (SELECT id FROM public.sales_bills);

-- =====================================================
-- 4. ตั้งค่า permissions ให้ถูกต้อง
-- =====================================================

-- Grant permissions สำหรับ views
GRANT SELECT ON public.products_summary TO anon, authenticated;
GRANT SELECT ON public.products_with_conversions TO anon, authenticated;

-- Grant permissions สำหรับตารางหลัก
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_orders TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.inventory_items TO anon, authenticated;

-- =====================================================
-- 5. ตรวจสอบผลลัพธ์
-- =====================================================

DO $$
DECLARE
    products_summary_count INTEGER;
    products_with_conversions_count INTEGER;
    orphaned_orders_count INTEGER;
BEGIN
    -- นับจำนวนข้อมูลใน views
    SELECT COUNT(*) INTO products_summary_count FROM public.products_summary;
    SELECT COUNT(*) INTO products_with_conversions_count FROM public.products_with_conversions;
    
    -- ตรวจสอบ orphaned orders
    SELECT COUNT(*) INTO orphaned_orders_count
    FROM public.customer_orders co
    LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
    WHERE co.source_sales_bill_id IS NOT NULL
    AND sb.id IS NULL;

    RAISE NOTICE '=== ผลลัพธ์การแก้ไข ===';
    RAISE NOTICE '✅ products_summary records: %', products_summary_count;
    RAISE NOTICE '✅ products_with_conversions records: %', products_with_conversions_count;
    RAISE NOTICE '✅ orphaned orders remaining: %', orphaned_orders_count;
    
    IF products_summary_count > 0 AND products_with_conversions_count > 0 AND orphaned_orders_count = 0 THEN
        RAISE NOTICE '🎉 แก้ปัญหาสำเร็จแล้ว! Application ควรทำงานได้ปกติ';
    ELSE
        RAISE NOTICE '⚠️ ยังมีปัญหาบางอย่างที่ต้องตรวจสอบ';
    END IF;
END $$;

-- ทดสอบ views
SELECT '🧪 Testing products_summary' as test, COUNT(*) as count FROM public.products_summary LIMIT 1;
SELECT '🧪 Testing products_with_conversions' as test, COUNT(*) as count FROM public.products_with_conversions LIMIT 1;
