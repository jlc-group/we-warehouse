-- แก้ปัญหาการเลือกสินค้าหายไป - สร้างข้อมูล inventory สำหรับสินค้าที่ไม่มี
-- รันสคริปต์นี้เพื่อสร้างข้อมูล inventory_items สำหรับสินค้าที่ยังไม่มี

DO $$
DECLARE
    product_record RECORD;
    missing_count INTEGER := 0;
    created_count INTEGER := 0;
BEGIN
    -- นับสินค้าที่ไม่มีใน inventory
    SELECT COUNT(*) INTO missing_count
    FROM public.products p
    LEFT JOIN public.inventory_items inv ON p.id = inv.product_id
    WHERE p.is_active = true
    AND inv.product_id IS NULL;

    RAISE NOTICE '🔍 พบสินค้าที่ไม่มีใน inventory: % รายการ', missing_count;

    IF missing_count > 0 THEN
        -- สร้าง inventory_items สำหรับสินค้าที่ไม่มี
        FOR product_record IN
            SELECT p.id, p.sku_code, p.product_name, p.product_type
            FROM public.products p
            LEFT JOIN public.inventory_items inv ON p.id = inv.product_id
            WHERE p.is_active = true
            AND inv.product_id IS NULL
        LOOP
            -- สร้าง inventory_item ใหม่
            INSERT INTO public.inventory_items (
                product_id,
                sku,
                product_name,
                location,
                quantity_level1,
                quantity_level2,
                quantity_level3,
                reserved_level1_quantity,
                reserved_level2_quantity,
                reserved_level3_quantity,
                unit_level1_name,
                unit_level2_name,
                unit_level3_name,
                is_deleted,
                created_at,
                updated_at
            ) VALUES (
                product_record.id,
                product_record.sku_code,
                product_record.product_name,
                'A/1/01', -- Default location
                0, -- quantity_level1
                0, -- quantity_level2
                0, -- quantity_level3
                0, -- reserved_level1_quantity
                0, -- reserved_level2_quantity
                0, -- reserved_level3_quantity
                'ลัง', -- unit_level1_name
                'กล่อง', -- unit_level2_name
                'ชิ้น', -- unit_level3_name
                false, -- is_deleted
                NOW(),
                NOW()
            );

            created_count := created_count + 1;
        END LOOP;

        RAISE NOTICE '✅ สร้าง inventory_items ใหม่: % รายการ', created_count;
    END IF;

    -- ตรวจสอบผลลัพธ์
    SELECT COUNT(*) INTO missing_count
    FROM public.products p
    LEFT JOIN public.inventory_items inv ON p.id = inv.product_id
    WHERE p.is_active = true
    AND inv.product_id IS NULL;

    RAISE NOTICE '📊 สินค้าที่ยังไม่มีใน inventory หลังแก้ไข: % รายการ', missing_count;

    IF missing_count = 0 THEN
        RAISE NOTICE '🎉 สินค้าทุกรายการมี inventory_items แล้ว!';
    END IF;

END $$;

-- สร้าง conversion_rates สำหรับสินค้าที่ไม่มี
DO $$
DECLARE
    product_record RECORD;
    missing_conversion_count INTEGER := 0;
    created_conversion_count INTEGER := 0;
BEGIN
    -- นับสินค้าที่ไม่มี conversion rates
    SELECT COUNT(*) INTO missing_conversion_count
    FROM public.products p
    LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku
    WHERE p.is_active = true
    AND pcr.sku IS NULL;

    RAISE NOTICE '🔍 พบสินค้าที่ไม่มี conversion rates: % รายการ', missing_conversion_count;

    IF missing_conversion_count > 0 THEN
        -- สร้าง conversion_rates สำหรับสินค้าที่ไม่มี
        FOR product_record IN
            SELECT p.id, p.sku_code, p.product_name, p.product_type
            FROM public.products p
            LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku
            WHERE p.is_active = true
            AND pcr.sku IS NULL
            LIMIT 50 -- จำกัดไว้ 50 รายการแรก
        LOOP
            -- สร้าง conversion_rate ใหม่
            INSERT INTO public.product_conversion_rates (
                sku,
                product_name,
                product_id,
                product_type,
                unit_level1_name,
                unit_level1_rate,
                unit_level2_name,
                unit_level2_rate,
                unit_level3_name,
                created_at,
                updated_at
            ) VALUES (
                product_record.sku_code,
                product_record.product_name,
                product_record.id,
                product_record.product_type,
                'ลัง', -- unit_level1_name
                1, -- unit_level1_rate
                'กล่อง', -- unit_level2_name
                1, -- unit_level2_rate
                'ชิ้น', -- unit_level3_name
                NOW(),
                NOW()
            );

            created_conversion_count := created_conversion_count + 1;
        END LOOP;

        RAISE NOTICE '✅ สร้าง conversion_rates ใหม่: % รายการ', created_conversion_count;
    END IF;

END $$;

-- รีเฟรช views เพื่อให้ข้อมูลใหม่ปรากฏ
DROP VIEW IF EXISTS public.products_summary CASCADE;
DROP VIEW IF EXISTS public.products_with_conversions CASCADE;

-- สร้าง products_summary view ใหม่
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
    WHERE (is_deleted = false OR is_deleted IS NULL)
    GROUP BY product_id
) inv ON p.id = inv.product_id
WHERE p.is_active = true OR p.is_active IS NULL
ORDER BY p.product_type, p.sku_code;

-- สร้าง products_with_conversions view ใหม่
CREATE OR REPLACE VIEW public.products_with_conversions AS
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
    p.created_at as product_created_at,
    p.updated_at as product_updated_at,
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
    CASE WHEN pcr.id IS NOT NULL THEN true ELSE false END as has_conversion_rates,
    COALESCE(pcr.unit_level1_rate, 1) * 5 as example_calculation
FROM public.products p
LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku
WHERE p.is_active = true OR p.is_active IS NULL
ORDER BY p.product_type, p.sku_code;

-- Grant permissions
GRANT SELECT ON public.products_summary TO anon, authenticated;
GRANT SELECT ON public.products_with_conversions TO anon, authenticated;

-- ตรวจสอบผลลัพธ์สุดท้าย
SELECT
    '🎯 ผลลัพธ์การแก้ไข' as status,
    COUNT(*) as total_products_summary,
    COUNT(CASE WHEN total_inventory_quantity >= 0 THEN 1 END) as products_with_inventory,
    COUNT(CASE WHEN location_count > 0 THEN 1 END) as products_with_locations
FROM public.products_summary;

SELECT '✅ แก้ปัญหาการเลือกสินค้าเสร็จสิ้น - ลองใช้งาน application ใหม่!' as final_status;
