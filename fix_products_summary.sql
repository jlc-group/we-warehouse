-- 🚨 แก้ไข Products Summary View ด่วน
-- แก้ปัญหา column "product_id" does not exist

-- ลบ view เก่าที่เสีย
DROP VIEW IF EXISTS public.products_summary;

-- สร้าง products_summary view ใหม่ด้วย relationship ที่ถูกต้อง
-- inventory_items.sku <-> products.sku_code
-- ใช้ FULL OUTER JOIN เพื่อแสดงข้อมูลครบถ้วน
CREATE OR REPLACE VIEW public.products_summary AS
SELECT DISTINCT
    COALESCE(p.id, 'missing-' || inv.sku) as product_id,
    COALESCE(p.sku_code, inv.sku) as sku,
    COALESCE(p.product_name, 'ไม่มีข้อมูล - ' || inv.sku) as product_name,
    COALESCE(p.product_type, 'FG') as product_type,
    p.category,
    p.subcategory,
    p.brand,
    COALESCE(p.unit_of_measure, 'ชิ้น') as unit_of_measure,
    COALESCE(p.is_active, true) as is_active,
    COALESCE(p.created_at, NOW()) as created_at,
    COALESCE(p.updated_at, NOW()) as updated_at,
    -- รวมสต็อกจาก inventory_items ผ่าน sku
    COALESCE(inv.total_level1_quantity, 0) as total_level1_quantity,
    COALESCE(inv.total_level2_quantity, 0) as total_level2_quantity,
    COALESCE(inv.total_level3_quantity, 0) as total_level3_quantity,
    COALESCE(inv.location_count, 0) as location_count,
    -- หน่วยการแปลง
    COALESCE(inv.unit_level1_name, COALESCE(p.unit_of_measure, 'ลัง')) as unit_level1_name,
    COALESCE(inv.unit_level1_rate, 24) as unit_level1_rate,
    COALESCE(inv.unit_level2_name, COALESCE(p.unit_of_measure, 'กล่อง')) as unit_level2_name,
    COALESCE(inv.unit_level2_rate, 1) as unit_level2_rate,
    COALESCE(inv.unit_level3_name, COALESCE(p.unit_of_measure, 'ชิ้น')) as unit_level3_name,
    -- คำนวณจำนวนรวมหลังแปลงหน่วย (total_pieces)
    COALESCE(
        (inv.total_level1_quantity * COALESCE(inv.unit_level1_rate, 24)) +
        (inv.total_level2_quantity * COALESCE(inv.unit_level2_rate, 1)) +
        inv.total_level3_quantity,
        0
    ) as total_pieces,
    -- กำหนดสถานะสต็อก (stock_status)
    CASE
        WHEN COALESCE(
            (inv.total_level1_quantity * COALESCE(inv.unit_level1_rate, 24)) +
            (inv.total_level2_quantity * COALESCE(inv.unit_level2_rate, 1)) +
            inv.total_level3_quantity,
            0
        ) = 0 THEN 'out_of_stock'
        WHEN COALESCE(
            (inv.total_level1_quantity * COALESCE(inv.unit_level1_rate, 24)) +
            (inv.total_level2_quantity * COALESCE(inv.unit_level2_rate, 1)) +
            inv.total_level3_quantity,
            0
        ) < 10 THEN 'low_stock'
        WHEN COALESCE(
            (inv.total_level1_quantity * COALESCE(inv.unit_level1_rate, 24)) +
            (inv.total_level2_quantity * COALESCE(inv.unit_level2_rate, 1)) +
            inv.total_level3_quantity,
            0
        ) < 50 THEN 'medium_stock'
        ELSE 'high_stock'
    END as stock_status
FROM public.products p
FULL OUTER JOIN (
    SELECT
        sku,
        SUM(COALESCE(unit_level1_quantity, 0)) as total_level1_quantity,
        SUM(COALESCE(unit_level2_quantity, 0)) as total_level2_quantity,
        SUM(COALESCE(unit_level3_quantity, 0)) as total_level3_quantity,
        COUNT(DISTINCT location) as location_count,
        -- ใช้ค่าแรกที่พบสำหรับหน่วย
        MAX(unit_level1_name) as unit_level1_name,
        MAX(unit_level1_rate) as unit_level1_rate,
        MAX(unit_level2_name) as unit_level2_name,
        MAX(unit_level2_rate) as unit_level2_rate,
        MAX(unit_level3_name) as unit_level3_name
    FROM public.inventory_items
    WHERE sku IS NOT NULL
    GROUP BY sku
) inv ON p.sku_code = inv.sku
WHERE COALESCE(p.is_active, true) = true;

-- ให้สิทธิ์เข้าถึง view
GRANT SELECT ON public.products_summary TO anon, authenticated;

-- ตรวจสอบว่า view ทำงาน
SELECT COUNT(*) as total_products FROM public.products_summary;