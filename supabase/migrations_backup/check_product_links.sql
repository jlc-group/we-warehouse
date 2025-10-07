-- ตรวจสอบการเชื่อมโยงข้อมูลสินค้า
-- รันสคริปต์นี้เพื่อดูว่าสินค้าเชื่อมโยงกับ inventory และ conversion rates หรือไม่

-- 1. ตรวจสอบจำนวนสินค้าในแต่ละตาราง
SELECT
    '📊 สถิติข้อมูลสินค้า' as info,
    'products' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_records
FROM public.products
UNION ALL
SELECT
    'inventory_items' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN is_deleted = false OR is_deleted IS NULL THEN 1 END) as active_records
FROM public.inventory_items
UNION ALL
SELECT
    'product_conversion_rates' as table_name,
    COUNT(*) as total_records,
    COUNT(*) as active_records
FROM public.product_conversion_rates;

-- 2. ตรวจสอบสินค้าที่ไม่มีใน inventory
SELECT
    '🔍 สินค้าที่ไม่มีใน inventory' as check_type,
    p.id,
    p.sku_code,
    p.product_name,
    p.product_type
FROM public.products p
LEFT JOIN public.inventory_items inv ON p.id = inv.product_id
WHERE p.is_active = true
AND inv.product_id IS NULL
LIMIT 10;

-- 3. ตรวจสอบสินค้าที่ไม่มี conversion rates
SELECT
    '🔍 สินค้าที่ไม่มี conversion rates' as check_type,
    p.id,
    p.sku_code,
    p.product_name,
    p.product_type
FROM public.products p
LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku
WHERE p.is_active = true
AND pcr.sku IS NULL
LIMIT 10;

-- 4. ตรวจสอบ products_summary view
SELECT
    '🧪 ทดสอบ products_summary view' as test,
    COUNT(*) as total_products,
    COUNT(CASE WHEN total_inventory_quantity > 0 THEN 1 END) as products_with_stock,
    COUNT(CASE WHEN location_count > 0 THEN 1 END) as products_with_locations
FROM public.products_summary;

-- 5. แสดงตัวอย่างข้อมูลจาก products_summary
SELECT
    '📋 ตัวอย่างข้อมูล products_summary' as sample,
    sku_code,
    product_name,
    product_type,
    total_inventory_quantity,
    available_inventory_quantity,
    location_count
FROM public.products_summary
WHERE total_inventory_quantity > 0
LIMIT 5;
