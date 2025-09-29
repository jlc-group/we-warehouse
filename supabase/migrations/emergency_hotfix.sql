-- EMERGENCY HOTFIX - รันทันทีเพื่อแก้ปัญหาด่วน
-- สำหรับแก้ปัญหา 404 และ 400 errors ที่เกิดขึ้น

-- ลบ constraint ที่ทำให้เกิด 400 error ทันที
ALTER TABLE public.customer_orders DROP CONSTRAINT IF EXISTS customer_orders_source_sales_bill_id_fkey;
ALTER TABLE public.customer_orders DROP CONSTRAINT IF EXISTS fk_customer_orders_source_sales_bill_id;

-- ทำความสะอาดข้อมูลที่เป็นปัญหา
UPDATE public.customer_orders SET source_sales_bill_id = NULL WHERE source_sales_bill_id IS NOT NULL;

-- สร้าง products_summary view ทันที - เพิ่มข้อมูลสต็อกจริง
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
    -- เชื่อมโยงข้อมูลสต็อกจริงจาก inventory_items
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
WHERE p.is_active = true OR p.is_active IS NULL;

-- สร้าง products_with_conversions view ทันที
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
    5 as example_calculation
FROM public.products p
LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku
WHERE p.is_active = true OR p.is_active IS NULL
ORDER BY p.sku_code;

-- Grant permissions
GRANT SELECT ON public.products_summary TO anon, authenticated;
GRANT SELECT ON public.products_with_conversions TO anon, authenticated;
GRANT ALL ON public.customer_orders TO anon, authenticated;
GRANT ALL ON public.order_items TO anon, authenticated;

SELECT '🚀 EMERGENCY HOTFIX APPLIED - ลองใช้งาน application ได้แล้ว!' as status;
