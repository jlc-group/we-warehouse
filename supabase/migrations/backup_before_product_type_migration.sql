-- ===================================================================
-- BACKUP SCRIPT: สำรองข้อมูลก่อน Migration Product Type
-- วันที่: 2025-09-27
-- วัตถุประสงค์: สำรองข้อมูลสำคัญก่อนเพิ่มคอลัมน์ product_type
-- ===================================================================

-- 🛡️ สร้างตารางสำรอง (Backup Tables)

-- 1. สำรองตาราง product_conversion_rates
CREATE TABLE IF NOT EXISTS backup_product_conversion_rates_20250927 AS
SELECT * FROM public.product_conversion_rates;

-- 2. สำรองตาราง products (เพื่อความปลอดภัย)
CREATE TABLE IF NOT EXISTS backup_products_20250927 AS
SELECT * FROM public.products;

-- 📊 แสดงสถิติข้อมูลที่สำรอง
DO $$
DECLARE
    conversion_count INTEGER;
    products_count INTEGER;
BEGIN
    -- นับจำนวนข้อมูลในตารางสำรอง
    SELECT COUNT(*) INTO conversion_count FROM backup_product_conversion_rates_20250927;
    SELECT COUNT(*) INTO products_count FROM backup_products_20250927;

    RAISE NOTICE '🗄️ การสำรองข้อมูลเสร็จสิ้น:';
    RAISE NOTICE '📦 product_conversion_rates: % รายการ', conversion_count;
    RAISE NOTICE '📦 products: % รายการ', products_count;
    RAISE NOTICE '⏰ เวลาสำรอง: %', NOW();
END $$;

-- 🔍 ตรวจสอบข้อมูลสำคัญก่อน Migration
SELECT
    'ข้อมูลปัจจุบันก่อน Migration' as status,
    COUNT(*) as total_conversion_rates,
    COUNT(DISTINCT sku) as unique_skus,
    COUNT(CASE WHEN sku IS NULL THEN 1 END) as null_skus
FROM public.product_conversion_rates;

-- แสดงตัวอย่างข้อมูลที่จะได้รับผลกระทบ
SELECT
    'ตัวอย่างข้อมูล conversion_rates' as info,
    sku,
    product_name,
    unit_level1_name,
    unit_level1_rate,
    created_at
FROM public.product_conversion_rates
LIMIT 5;

-- ตรวจสอบข้อมูล products ที่จะใช้ในการเชื่อมโยง
SELECT
    'ข้อมูล products สำหรับการเชื่อมโยง' as info,
    COUNT(*) as total_products,
    COUNT(DISTINCT product_type) as unique_product_types,
    COUNT(CASE WHEN product_type = 'FG' THEN 1 END) as fg_products,
    COUNT(CASE WHEN product_type = 'PK' THEN 1 END) as pk_products
FROM public.products;

-- แสดง SKU ที่จะสามารถเชื่อมโยงได้
WITH linkable_data AS (
    SELECT
        pcr.sku,
        pcr.product_name as conversion_product_name,
        p.id as product_id,
        p.product_name as products_product_name,
        p.product_type,
        CASE WHEN p.id IS NOT NULL THEN 'จับคู่ได้' ELSE 'ไม่มีใน products' END as link_status
    FROM public.product_conversion_rates pcr
    LEFT JOIN public.products p ON pcr.sku = p.sku_code
)
SELECT
    'สถิติการจับคู่ข้อมูล' as analysis,
    COUNT(*) as total_conversions,
    COUNT(CASE WHEN link_status = 'จับคู่ได้' THEN 1 END) as linkable_count,
    COUNT(CASE WHEN link_status = 'ไม่มีใน products' THEN 1 END) as unlinked_count,
    ROUND(
        COUNT(CASE WHEN link_status = 'จับคู่ได้' THEN 1 END) * 100.0 / COUNT(*),
        2
    ) as link_percentage
FROM linkable_data;

-- แสดงรายการที่ไม่สามารถเชื่อมโยงได้
SELECT
    'รายการที่ไม่สามารถเชื่อมโยงได้' as warning,
    pcr.sku,
    pcr.product_name
FROM public.product_conversion_rates pcr
LEFT JOIN public.products p ON pcr.sku = p.sku_code
WHERE p.id IS NULL
LIMIT 10;

-- 💾 สร้างไฟล์ Export (คำสั่งสำหรับ manual export)
SELECT
    '💾 คำแนะนำสำหรับ Export ข้อมูล:' as instruction,
    'COPY backup_product_conversion_rates_20250927 TO ''/tmp/conversion_rates_backup.csv'' WITH CSV HEADER;' as export_conversion_command,
    'COPY backup_products_20250927 TO ''/tmp/products_backup.csv'' WITH CSV HEADER;' as export_products_command;

-- 🔒 สร้าง Permissions สำหรับตารางสำรอง
GRANT SELECT ON backup_product_conversion_rates_20250927 TO anon, authenticated;
GRANT SELECT ON backup_products_20250927 TO anon, authenticated;

-- 📝 บันทึก Metadata การสำรอง
CREATE TABLE IF NOT EXISTS migration_backup_log (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL,
    backup_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tables_backed_up TEXT[],
    record_counts JSONB,
    notes TEXT
);

INSERT INTO migration_backup_log (
    migration_name,
    tables_backed_up,
    record_counts,
    notes
) VALUES (
    'add_product_type_to_conversion_rates',
    ARRAY['product_conversion_rates', 'products'],
    jsonb_build_object(
        'product_conversion_rates', (SELECT COUNT(*) FROM backup_product_conversion_rates_20250927),
        'products', (SELECT COUNT(*) FROM backup_products_20250927)
    ),
    'สำรองข้อมูลก่อนเพิ่มคอลัมน์ product_type และ product_id'
);

-- ✅ แสดงผลสำเร็จ
SELECT
    '✅ การสำรองข้อมูลเสร็จสิ้น!' as status,
    NOW() as completed_at,
    'ข้อมูลถูกสำรองในตาราง backup_product_conversion_rates_20250927 และ backup_products_20250927' as backup_location,
    'สามารถดำเนินการ Migration ต่อได้' as next_step;