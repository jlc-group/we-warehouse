-- ==========================================
-- MANUAL MIGRATION: Fix products_summary View
-- ==========================================
-- วันที่: 2025-09-27
-- วัตถุประสงค์: สร้าง products_summary view ที่ใช้ conversion rates ถูกต้อง
--
-- วิธีการ Apply:
-- 1. Copy SQL ข้างล่างนี้ทั้งหมด
-- 2. เปิด Supabase Dashboard → SQL Editor
-- 3. Paste และ Run
-- 4. Verify ด้วย: SELECT * FROM products_summary LIMIT 5;

-- ==========================================
-- ขั้นตอนที่ 1: ลบ Views เก่า
-- ==========================================

DROP VIEW IF EXISTS public.available_products_for_sales;
DROP VIEW IF EXISTS public.products_summary;

-- ==========================================
-- ขั้นตอนที่ 2: สร้าง products_summary View ใหม่
-- ==========================================

CREATE OR REPLACE VIEW public.products_summary AS
SELECT
    p.id as product_id,
    p.sku_code as sku,
    p.product_name,
    p.category,
    p.subcategory,
    p.brand,
    p.product_type,  -- ✅ เพิ่ม product_type
    p.unit_of_measure,
    p.unit_cost,
    p.description,

    -- รวมจำนวนสต็อกจากทุก location
    COALESCE(SUM(inv.unit_level1_quantity), 0) as total_level1_quantity,
    COALESCE(SUM(inv.unit_level2_quantity), 0) as total_level2_quantity,
    COALESCE(SUM(inv.unit_level3_quantity), 0) as total_level3_quantity,

    -- ✅ คำนวณจำนวนรวมทั้งหมด (เป็น pieces) โดยใช้ conversion rates จาก product_conversion_rates
    COALESCE(
        SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +  -- ใช้จาก pcr ไม่ใช่ inv
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +   -- ใช้จาก pcr ไม่ใช่ inv
            inv.unit_level3_quantity
        ), 0
    ) as total_pieces,

    -- ✅ ข้อมูลการแปลงหน่วยจาก product_conversion_rates table (ไม่ใช่จาก inventory)
    COALESCE(pcr.unit_level1_name, 'ลัง') as unit_level1_name,
    COALESCE(pcr.unit_level2_name, 'กล่อง') as unit_level2_name,
    COALESCE(pcr.unit_level3_name, 'ชิ้น') as unit_level3_name,
    COALESCE(pcr.unit_level1_rate, 24) as unit_level1_rate,  -- ใช้ค่าเริ่มต้นที่เหมาะสม
    COALESCE(pcr.unit_level2_rate, 1) as unit_level2_rate,   -- ใช้ค่าเริ่มต้นที่เหมาะสม

    -- จำนวน location ที่มีสินค้านี้
    COUNT(DISTINCT inv.location) as location_count,

    -- ✅ location ที่มีสต็อกมากที่สุด (คำนวณด้วย conversion rates ที่ถูกต้อง)
    (
        SELECT inv2.location
        FROM inventory_items inv2
        LEFT JOIN product_conversion_rates pcr2 ON inv2.sku = pcr2.sku
        WHERE inv2.sku = p.sku_code
        ORDER BY (
            (inv2.unit_level1_quantity * COALESCE(pcr2.unit_level1_rate, 24)) +
            (inv2.unit_level2_quantity * COALESCE(pcr2.unit_level2_rate, 1)) +
            inv2.unit_level3_quantity
        ) DESC
        LIMIT 1
    ) as primary_location,

    -- ✅ สถานะสต็อก (คำนวณด้วย conversion rates ที่ถูกต้อง)
    CASE
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) < 10 THEN 'low_stock'
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) < 50 THEN 'medium_stock'
        ELSE 'high_stock'
    END as stock_status,

    -- เวลาอัปเดตล่าสุด
    MAX(inv.updated_at) as last_updated,

    -- สถานะสินค้า
    p.is_active

FROM public.products p
LEFT JOIN public.inventory_items inv ON p.sku_code = inv.sku
LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku  -- ✅ เชื่อมโยงกับ conversion rates table
WHERE p.is_active = true
GROUP BY
    p.id, p.sku_code, p.product_name, p.category, p.subcategory,
    p.brand, p.product_type, p.unit_of_measure, p.unit_cost,  -- ✅ เพิ่ม product_type ใน GROUP BY
    p.description, p.is_active,
    pcr.unit_level1_name, pcr.unit_level2_name, pcr.unit_level3_name,
    pcr.unit_level1_rate, pcr.unit_level2_rate
ORDER BY p.product_type, p.product_name;  -- ✅ เรียงตาม product_type ก่อน แล้วค่อยเรียงตามชื่อ

-- ==========================================
-- ขั้นตอนที่ 3: สร้าง available_products_for_sales View
-- ==========================================

CREATE OR REPLACE VIEW public.available_products_for_sales AS
SELECT
    *
FROM public.products_summary
WHERE total_pieces > 0  -- มีสต็อก
ORDER BY product_type, stock_status DESC, product_name;  -- ✅ เรียงตาม product_type ก่อน

-- ==========================================
-- ขั้นตอนที่ 4: เพิ่ม Comments
-- ==========================================

COMMENT ON VIEW public.products_summary IS 'สรุปสินค้าสำหรับ Sales - ✅ ใช้ conversion rates จาก product_conversion_rates table ✅ มี product_type ครบถ้วน';

COMMENT ON VIEW public.available_products_for_sales IS 'สินค้าที่มีสต็อกสำหรับการขาย - ✅ ใช้ conversion rates ที่ถูกต้อง ✅ มี product_type';

-- ==========================================
-- ขั้นตอนที่ 5: ทดสอบการทำงาน
-- ==========================================

-- ทดสอบ 1: ตรวจสอบว่า View ถูกสร้างแล้ว
SELECT '✅ products_summary view created successfully!' as status;

-- ทดสอบ 2: ตรวจสอบข้อมูลตัวอย่าง
SELECT
    sku,
    product_name,
    product_type,
    total_pieces,
    unit_level1_rate,
    unit_level2_rate,
    stock_status,
    location_count
FROM public.products_summary
LIMIT 3;

-- ทดสอบ 3: ตรวจสอบสินค้าที่มีสต็อก
SELECT
    COUNT(*) as total_products,
    COUNT(CASE WHEN product_type = 'FG' THEN 1 END) as fg_count,
    COUNT(CASE WHEN product_type = 'PK' THEN 1 END) as pk_count,
    COUNT(CASE WHEN total_pieces > 0 THEN 1 END) as with_stock
FROM public.products_summary;

-- ==========================================
-- เสร็จสิ้น!
-- ==========================================
-- หลังจาก Apply Migration นี้แล้ว:
-- 1. Frontend จะใช้ Database View แทน fallback mode
-- 2. การคำนวณ total_pieces จะใช้ conversion rates ที่ถูกต้อง
-- 3. มี product_type ครบถ้วนในผลลัพธ์
-- 4. เรียงลำดับตาม product_type และชื่อสินค้า