-- Fix Products Summary View for Sales System
-- Run this SQL in Supabase Dashboard SQL Editor

-- สร้าง view สำหรับสรุปสินค้า (รวมจากทุก location) - เวอร์ชันที่ปรับปรุงแล้ว
-- เซลจะเห็นแค่สินค้า + จำนวนรวม, ไม่เห็น location
-- ✅ ใช้ conversion rates จาก product_conversion_rates table (ไม่ใช่จาก inventory_items)
-- ✅ เพิ่ม product_type ในผลลัพธ์

-- ลบ view เก่าถ้ามี
DROP VIEW IF EXISTS public.available_products_for_sales;
DROP VIEW IF EXISTS public.products_summary;

-- สร้าง view ใหม่ที่ใช้ conversion rates อย่างถูกต้อง
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
    CASE
        WHEN p.unit_cost IS NOT NULL AND p.unit_cost > 0
        THEN p.unit_cost * 1.3
        ELSE 10.0
    END as unit_price,  -- ราคาขาย = ต้นทุน + 30% หรือ 10 บาท
    CASE
        WHEN p.unit_cost IS NOT NULL AND p.unit_cost > 0
        THEN p.unit_cost * 1.3
        ELSE 10.0
    END as selling_price,  -- ราคาขายจริง เท่ากับ unit_price
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
        WHERE inv2.sku = p.sku_code AND inv2.is_active = true AND COALESCE(inv2.is_deleted, false) = false
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
    COALESCE(MAX(inv.updated_at), p.updated_at) as last_updated,

    -- สถานะสินค้า
    p.is_active

FROM public.products p
LEFT JOIN public.inventory_items inv ON p.sku_code = inv.sku AND inv.is_active = true AND COALESCE(inv.is_deleted, false) = false
LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku  -- ✅ เชื่อมโยงกับ conversion rates table
WHERE p.is_active = true
GROUP BY
    p.id, p.sku_code, p.product_name, p.category, p.subcategory,
    p.brand, p.product_type, p.unit_of_measure, p.unit_cost,  -- ✅ เพิ่ม product_type ใน GROUP BY
    p.description, p.is_active, p.updated_at,
    pcr.unit_level1_name, pcr.unit_level2_name, pcr.unit_level3_name,
    pcr.unit_level1_rate, pcr.unit_level2_rate
ORDER BY p.product_type, p.product_name;  -- ✅ เรียงตาม product_type ก่อน แล้วค่อยเรียงตามชื่อ

-- เพิ่ม comment ที่อัปเดตแล้ว
COMMENT ON VIEW public.products_summary IS 'สรุปสินค้าสำหรับ Sales - ✅ ใช้ conversion rates จาก product_conversion_rates table ✅ มี product_type ครบถ้วน ✅ มีราคาขาย';

-- สร้าง view เพิ่มเติมสำหรับการใช้งานง่าย (ปรับปรุงแล้ว)
CREATE OR REPLACE VIEW public.available_products_for_sales AS
SELECT
    *
FROM public.products_summary
WHERE is_active = true  -- แสดงสินค้าที่ active ทั้งหมด (ไม่ว่าจะมีสต็อกหรือไม่)
ORDER BY
    CASE WHEN total_pieces > 0 THEN 0 ELSE 1 END,  -- สินค้าที่มีสต็อกขึ้นก่อน
    product_type,
    stock_status DESC,
    product_name;

COMMENT ON VIEW public.available_products_for_sales IS 'สินค้าทั้งหมดสำหรับการขาย - ✅ ใช้ conversion rates ที่ถูกต้อง ✅ มี product_type ✅ มีราคาขาย';

-- ตรวจสอบข้อมูล
SELECT
    'Products Summary View Created Successfully!' as status,
    COUNT(*) as total_products,
    COUNT(CASE WHEN total_pieces > 0 THEN 1 END) as products_with_stock,
    COUNT(CASE WHEN total_pieces = 0 THEN 1 END) as products_without_stock
FROM public.products_summary;

-- แสดงตัวอย่างข้อมูล
SELECT
    product_name,
    sku,
    product_type,
    total_pieces,
    unit_price,
    selling_price,
    stock_status
FROM public.products_summary
ORDER BY product_type, product_name
LIMIT 10;