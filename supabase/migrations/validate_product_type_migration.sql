-- ===================================================================
-- VALIDATION SCRIPT: ตรวจสอบผลลัพธ์ Migration Product Type
-- วันที่: 2025-09-27
-- วัตถุประสงค์: ตรวจสอบว่า Migration ทำงานถูกต้องครบถ้วน
-- ===================================================================

-- 🔍 ตรวจสอบโครงสร้างตาราง
SELECT
    '📋 ตรวจสอบโครงสร้างตาราง product_conversion_rates' as check_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'product_conversion_rates'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ✅ ตรวจสอบว่าคอลัมน์ใหม่ถูกสร้างแล้ว
DO $$
DECLARE
    has_product_id BOOLEAN := FALSE;
    has_product_type BOOLEAN := FALSE;
BEGIN
    -- ตรวจสอบคอลัมน์ product_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_conversion_rates'
        AND column_name = 'product_id'
    ) INTO has_product_id;

    -- ตรวจสอบคอลัมน์ product_type
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_conversion_rates'
        AND column_name = 'product_type'
    ) INTO has_product_type;

    RAISE NOTICE '🔍 การตรวจสอบคอลัมน์:';
    IF has_product_id THEN
        RAISE NOTICE '  ✅ คอลัมน์ product_id มีอยู่แล้ว';
    ELSE
        RAISE NOTICE '  ❌ คอลัมน์ product_id ไม่พบ!';
    END IF;

    IF has_product_type THEN
        RAISE NOTICE '  ✅ คอลัมน์ product_type มีอยู่แล้ว';
    ELSE
        RAISE NOTICE '  ❌ คอลัมน์ product_type ไม่พบ!';
    END IF;
END $$;

-- 🔗 ตรวจสอบ Foreign Key Constraints
SELECT
    '🔗 ตรวจสอบ Foreign Key Constraints' as check_name,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'product_conversion_rates';

-- 📊 ตรวจสอบ Indexes
SELECT
    '📊 ตรวจสอบ Indexes' as check_name,
    indexname,
    tablename,
    schemaname
FROM pg_indexes
WHERE tablename = 'product_conversion_rates'
AND (indexname LIKE '%product_id%' OR indexname LIKE '%product_type%')
ORDER BY indexname;

-- ⚡ ตรวจสอบ Functions และ Triggers
SELECT
    '⚡ ตรวจสอบ Functions' as check_name,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%product_conversion%';

SELECT
    '⚡ ตรวจสอบ Triggers' as check_name,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'product_conversion_rates';

-- 👁️ ตรวจสอบ Views
SELECT
    '👁️ ตรวจสอบ Views' as check_name,
    table_name as view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'products_with_conversions';

-- 📈 ตรวจสอบการเชื่อมโยงข้อมูล
WITH link_analysis AS (
    SELECT
        pcr.sku,
        pcr.product_name,
        pcr.product_id,
        pcr.product_type,
        p.id as linked_product_id,
        p.product_type as linked_product_type,
        p.product_name as linked_product_name,
        CASE
            WHEN pcr.product_id IS NOT NULL AND p.id IS NOT NULL THEN 'เชื่อมโยงสำเร็จ'
            WHEN pcr.product_id IS NOT NULL AND p.id IS NULL THEN 'product_id ไม่ตรงกับ products'
            WHEN pcr.product_id IS NULL THEN 'ยังไม่ได้เชื่อมโยง'
            ELSE 'ไม่ทราบสถานะ'
        END as link_status,
        CASE
            WHEN pcr.product_type = p.product_type THEN 'ตรงกัน'
            WHEN pcr.product_type IS NULL THEN 'ไม่มี product_type'
            WHEN p.product_type IS NULL THEN 'ไม่มี product_type ใน products'
            ELSE 'ไม่ตรงกัน'
        END as type_sync_status
    FROM public.product_conversion_rates pcr
    LEFT JOIN public.products p ON pcr.product_id = p.id
)
SELECT
    '📈 สถิติการเชื่อมโยงข้อมูล' as analysis,
    COUNT(*) as total_conversions,
    COUNT(CASE WHEN link_status = 'เชื่อมโยงสำเร็จ' THEN 1 END) as successfully_linked,
    COUNT(CASE WHEN link_status = 'ยังไม่ได้เชื่อมโยง' THEN 1 END) as not_linked,
    COUNT(CASE WHEN link_status = 'product_id ไม่ตรงกับ products' THEN 1 END) as broken_links,
    COUNT(CASE WHEN type_sync_status = 'ตรงกัน' THEN 1 END) as type_synced,
    COUNT(CASE WHEN type_sync_status = 'ไม่มี product_type' THEN 1 END) as missing_type,
    ROUND(
        COUNT(CASE WHEN link_status = 'เชื่อมโยงสำเร็จ' THEN 1 END) * 100.0 / COUNT(*),
        2
    ) as link_success_percentage
FROM link_analysis;

-- 🚨 ตรวจสอบปัญหาที่อาจเกิดขึ้น
SELECT
    '🚨 ตรวจสอบข้อมูลที่มีปัญหา' as issue_check,
    'รายการที่มี product_id แต่ไม่พบใน products table' as issue_type,
    pcr.sku,
    pcr.product_name,
    pcr.product_id
FROM public.product_conversion_rates pcr
LEFT JOIN public.products p ON pcr.product_id = p.id
WHERE pcr.product_id IS NOT NULL AND p.id IS NULL
LIMIT 10;

-- ประเภทสินค้าที่ไม่ตรงกัน
SELECT
    '🚨 ตรวจสอบ product_type ที่ไม่ตรงกัน' as issue_check,
    pcr.sku,
    pcr.product_name,
    pcr.product_type as conversion_type,
    p.product_type as products_type
FROM public.product_conversion_rates pcr
JOIN public.products p ON pcr.product_id = p.id
WHERE pcr.product_type != p.product_type
LIMIT 10;

-- 📊 ตรวจสอบการทำงานของ View
SELECT
    '📊 ทดสอบ View products_with_conversions' as test_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN has_conversion_rates = true THEN 1 END) as with_conversions,
    COUNT(CASE WHEN has_conversion_rates = false THEN 1 END) as without_conversions,
    COUNT(DISTINCT product_type) as unique_product_types
FROM public.products_with_conversions;

-- แสดงตัวอย่างข้อมูลจาก View
SELECT
    '📋 ตัวอย่างข้อมูลจาก View' as sample_data,
    sku_code,
    product_name,
    product_type,
    has_conversion_rates,
    unit_level1_name,
    unit_level1_rate
FROM public.products_with_conversions
WHERE has_conversion_rates = true
LIMIT 5;

-- 🧪 ทดสอบ Trigger Function
-- สร้างข้อมูลทดสอบชั่วคราว (จะลบหลังทดสอบ)
DO $$
DECLARE
    test_product_id UUID;
    test_sku TEXT := 'TEST_TRIGGER_' || EXTRACT(EPOCH FROM NOW())::TEXT;
BEGIN
    -- หา product_id สำหรับทดสอบ
    SELECT id INTO test_product_id FROM public.products LIMIT 1;

    IF test_product_id IS NOT NULL THEN
        -- สร้างข้อมูลทดสอบ
        INSERT INTO public.product_conversion_rates (
            sku, product_name, product_id,
            unit_level1_name, unit_level1_rate,
            unit_level2_name, unit_level2_rate,
            unit_level3_name
        ) VALUES (
            test_sku, 'Test Product for Trigger',
            test_product_id, 'ลัง', 100, 'กล่อง', 10, 'ชิ้น'
        );

        -- ตรวจสอบว่า trigger ทำงาน
        IF EXISTS (
            SELECT 1 FROM public.product_conversion_rates
            WHERE sku = test_sku AND product_type IS NOT NULL
        ) THEN
            RAISE NOTICE '✅ Trigger ทำงานถูกต้อง - product_type ถูก sync อัตโนมัติ';
        ELSE
            RAISE NOTICE '❌ Trigger ไม่ทำงาน - product_type ไม่ถูก sync';
        END IF;

        -- ลบข้อมูลทดสอบ
        DELETE FROM public.product_conversion_rates WHERE sku = test_sku;
        RAISE NOTICE '🧹 ลบข้อมูลทดสอบแล้ว';
    ELSE
        RAISE NOTICE '⚠️ ไม่สามารถทดสอบ Trigger ได้ - ไม่มีข้อมูล products';
    END IF;
END $$;

-- 📋 สรุปผลการตรวจสอบ
DO $$
DECLARE
    total_checks INTEGER := 0;
    passed_checks INTEGER := 0;
    has_product_id BOOLEAN;
    has_product_type BOOLEAN;
    has_foreign_key BOOLEAN;
    has_indexes BOOLEAN;
    has_trigger BOOLEAN;
    has_view BOOLEAN;
    link_success_rate NUMERIC;
BEGIN
    total_checks := 7; -- จำนวนการตรวจสอบทั้งหมด

    -- ตรวจสอบคอลัมน์
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_conversion_rates' AND column_name = 'product_id'
    ) INTO has_product_id;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_conversion_rates' AND column_name = 'product_type'
    ) INTO has_product_type;

    -- ตรวจสอบ foreign key
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_product_conversion_product_id'
    ) INTO has_foreign_key;

    -- ตรวจสอบ indexes
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'product_conversion_rates'
        AND indexname LIKE '%product_%'
    ) INTO has_indexes;

    -- ตรวจสอบ trigger
    SELECT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE event_object_table = 'product_conversion_rates'
        AND trigger_name = 'trigger_sync_product_conversion_type'
    ) INTO has_trigger;

    -- ตรวจสอบ view
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_name = 'products_with_conversions'
    ) INTO has_view;

    -- คำนวณอัตราความสำเร็จของการเชื่อมโยง
    SELECT COALESCE(
        (SELECT COUNT(CASE WHEN product_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)
         FROM public.product_conversion_rates), 0
    ) INTO link_success_rate;

    -- นับจำนวนการตรวจสอบที่ผ่าน
    IF has_product_id THEN passed_checks := passed_checks + 1; END IF;
    IF has_product_type THEN passed_checks := passed_checks + 1; END IF;
    IF has_foreign_key THEN passed_checks := passed_checks + 1; END IF;
    IF has_indexes THEN passed_checks := passed_checks + 1; END IF;
    IF has_trigger THEN passed_checks := passed_checks + 1; END IF;
    IF has_view THEN passed_checks := passed_checks + 1; END IF;
    IF link_success_rate > 80 THEN passed_checks := passed_checks + 1; END IF;

    RAISE NOTICE '';
    RAISE NOTICE '📊 === สรุปผลการตรวจสอบ Migration ===';
    RAISE NOTICE '✅ ผ่านการตรวจสอบ: %/% รายการ', passed_checks, total_checks;
    RAISE NOTICE '';
    RAISE NOTICE '📋 รายละเอียด:';
    RAISE NOTICE '  • คอลัมน์ product_id: %', CASE WHEN has_product_id THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  • คอลัมน์ product_type: %', CASE WHEN has_product_type THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  • Foreign Key: %', CASE WHEN has_foreign_key THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  • Indexes: %', CASE WHEN has_indexes THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  • Trigger: %', CASE WHEN has_trigger THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  • View: %', CASE WHEN has_view THEN '✅' ELSE '❌' END;
    RAISE NOTICE '  • การเชื่อมโยงข้อมูล: % %%', ROUND(link_success_rate, 1);
    RAISE NOTICE '';

    IF passed_checks = total_checks THEN
        RAISE NOTICE '🎉 Migration สำเร็จสมบูรณ์!';
    ELSE
        RAISE NOTICE '⚠️ Migration ไม่สมบูรณ์ - ตรวจสอบรายการที่ไม่ผ่าน';
    END IF;
END $$;