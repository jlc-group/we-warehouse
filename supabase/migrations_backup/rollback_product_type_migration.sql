-- ===================================================================
-- ROLLBACK SCRIPT: ย้อนกลับ Migration Product Type
-- วันที่: 2025-09-27
-- วัตถุประสงค์: ย้อนกลับการเปลี่ยนแปลงทั้งหมดจาก Migration
-- ⚠️ ใช้เฉพาะเมื่อจำเป็น! ข้อมูลที่เพิ่มหลัง Migration จะสูญหาย
-- ===================================================================

-- 🚨 คำเตือน: ตรวจสอบการสำรองข้อมูลก่อนรัน Script นี้
DO $$
DECLARE
    backup_exists BOOLEAN := FALSE;
BEGIN
    -- ตรวจสอบว่ามีตารางสำรองหรือไม่
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'backup_product_conversion_rates_20250927'
    ) INTO backup_exists;

    IF NOT backup_exists THEN
        RAISE EXCEPTION '❌ ไม่พบตารางสำรอง! กรุณารัน backup script ก่อน';
    END IF;

    RAISE NOTICE '✅ พบตารางสำรอง - สามารถดำเนินการ Rollback ได้';
END $$;

-- 📊 แสดงสถิติก่อน Rollback
DO $$
DECLARE
    current_count INTEGER;
    backup_count INTEGER;
    with_product_id INTEGER;
    with_product_type INTEGER;
BEGIN
    SELECT COUNT(*) INTO current_count FROM public.product_conversion_rates;
    SELECT COUNT(*) INTO backup_count FROM backup_product_conversion_rates_20250927;

    SELECT COUNT(*) INTO with_product_id
    FROM public.product_conversion_rates
    WHERE product_id IS NOT NULL;

    SELECT COUNT(*) INTO with_product_type
    FROM public.product_conversion_rates
    WHERE product_type IS NOT NULL;

    RAISE NOTICE '📊 สถิติก่อน Rollback:';
    RAISE NOTICE '  • ข้อมูลปัจจุบัน: % รายการ', current_count;
    RAISE NOTICE '  • ข้อมูลสำรอง: % รายการ', backup_count;
    RAISE NOTICE '  • มี product_id: % รายการ', with_product_id;
    RAISE NOTICE '  • มี product_type: % รายการ', with_product_type;
END $$;

-- ขั้นตอนที่ 1: ลบ View ที่สร้างขึ้น
-- ลบ view products_with_conversions
DROP VIEW IF EXISTS public.products_with_conversions CASCADE;
RAISE NOTICE '🗑️ ลบ view products_with_conversions แล้ว';

-- ขั้นตอนที่ 2: ลบ Triggers และ Functions
-- ลบ trigger
DROP TRIGGER IF EXISTS trigger_sync_product_conversion_type ON public.product_conversion_rates;
RAISE NOTICE '🗑️ ลบ trigger trigger_sync_product_conversion_type แล้ว';

-- ลบ function
DROP FUNCTION IF EXISTS public.sync_product_conversion_type() CASCADE;
RAISE NOTICE '🗑️ ลบ function sync_product_conversion_type แล้ว';

-- ขั้นตอนที่ 3: ลบ Indexes ที่สร้างขึ้น
-- ลบ indexes ที่เกี่ยวข้องกับคอลัมน์ใหม่
DROP INDEX IF EXISTS public.idx_product_conversion_rates_product_id;
DROP INDEX IF EXISTS public.idx_product_conversion_rates_product_type;
DROP INDEX IF EXISTS public.idx_product_conversion_rates_type_sku;
RAISE NOTICE '🗑️ ลบ indexes ที่เกี่ยวข้องแล้ว';

-- ขั้นตอนที่ 4: ลบ Foreign Key Constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_product_conversion_product_id'
        AND table_name = 'product_conversion_rates'
    ) THEN
        ALTER TABLE public.product_conversion_rates
        DROP CONSTRAINT fk_product_conversion_product_id;
        RAISE NOTICE '🗑️ ลบ Foreign Key Constraint แล้ว';
    ELSE
        RAISE NOTICE 'ℹ️ ไม่พบ Foreign Key Constraint';
    END IF;
END $$;

-- ขั้นตอนที่ 5: ลบคอลัมน์ใหม่
-- ลบคอลัมน์ product_type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_conversion_rates'
        AND column_name = 'product_type'
    ) THEN
        ALTER TABLE public.product_conversion_rates
        DROP COLUMN product_type;
        RAISE NOTICE '🗑️ ลบคอลัมน์ product_type แล้ว';
    ELSE
        RAISE NOTICE 'ℹ️ ไม่พบคอลัมน์ product_type';
    END IF;
END $$;

-- ลบคอลัมน์ product_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_conversion_rates'
        AND column_name = 'product_id'
    ) THEN
        ALTER TABLE public.product_conversion_rates
        DROP COLUMN product_id;
        RAISE NOTICE '🗑️ ลบคอลัมน์ product_id แล้ว';
    ELSE
        RAISE NOTICE 'ℹ️ ไม่พบคอลัมน์ product_id';
    END IF;
END $$;

-- ขั้นตอนที่ 6: ทางเลือกการคืนค่าข้อมูล (ถ้าต้องการ)
-- วิธีที่ 1: คืนข้อมูลจากตารางสำรอง (ข้อมูลใหม่จะหายไป)
/*
-- ⚠️ ระวัง: จะลบข้อมูลที่เพิ่มหลัง Migration!
TRUNCATE TABLE public.product_conversion_rates;
INSERT INTO public.product_conversion_rates
SELECT * FROM backup_product_conversion_rates_20250927;
*/

-- วิธีที่ 2: แสดงคำแนะนำสำหรับการคืนข้อมูลแบบ Manual
SELECT
    '💡 คำแนะนำสำหรับการคืนข้อมูล' as guide,
    'หากต้องการคืนข้อมูลเดิมทั้งหมด ให้ใช้คำสั่ง:' as instruction,
    'TRUNCATE TABLE public.product_conversion_rates; INSERT INTO public.product_conversion_rates SELECT * FROM backup_product_conversion_rates_20250927;' as command,
    '⚠️ ข้อมูลที่เพิ่มหลัง Migration จะสูญหาย!' as warning;

-- ขั้นตอนที่ 7: ตรวจสอบผลลัพธ์หลัง Rollback
DO $$
DECLARE
    current_columns TEXT[];
    current_count INTEGER;
BEGIN
    -- ตรวจสอบคอลัมน์ที่เหลือ
    SELECT ARRAY_AGG(column_name ORDER BY column_name) INTO current_columns
    FROM information_schema.columns
    WHERE table_name = 'product_conversion_rates'
    AND table_schema = 'public';

    SELECT COUNT(*) INTO current_count FROM public.product_conversion_rates;

    RAISE NOTICE '📋 สถิติหลัง Rollback:';
    RAISE NOTICE '  • จำนวนข้อมูล: % รายการ', current_count;
    RAISE NOTICE '  • คอลัมน์ที่เหลือ: %', array_to_string(current_columns, ', ');

    -- ตรวจสอบว่าคอลัมน์ที่เพิ่มถูกลบหมดแล้ว
    IF 'product_id' = ANY(current_columns) OR 'product_type' = ANY(current_columns) THEN
        RAISE WARNING '⚠️ ยังมีคอลัมน์ที่ควรจะถูกลบอยู่!';
    ELSE
        RAISE NOTICE '✅ ลบคอลัมน์ใหม่ทั้งหมดแล้ว';
    END IF;
END $$;

-- ขั้นตอนที่ 8: บันทึก Rollback Log
INSERT INTO migration_backup_log (
    migration_name,
    tables_backed_up,
    record_counts,
    notes
) VALUES (
    'ROLLBACK_add_product_type_to_conversion_rates',
    ARRAY['product_conversion_rates'],
    jsonb_build_object(
        'records_after_rollback', (SELECT COUNT(*) FROM public.product_conversion_rates)
    ),
    'ย้อนกลับการเพิ่มคอลัมน์ product_type และ product_id - ลบ views, triggers, functions, indexes, constraints และคอลัมน์ใหม่'
);

-- ขั้นตอนที่ 9: แสดงคำแนะนำหลัง Rollback
SELECT
    '✅ การ Rollback เสร็จสิ้น!' as status,
    NOW() as completed_at,
    'ระบบกลับสู่สถานะก่อน Migration' as result,
    'ควรทดสอบ Application เพื่อให้แน่ใจว่าทำงานปกติ' as recommendation;

-- แสดงคำสั่งสำหรับการทำความสะอาด (ถ้าต้องการ)
SELECT
    '🧹 การทำความสะอาดเพิ่มเติม (ทางเลือก)' as cleanup_info,
    'DROP TABLE backup_product_conversion_rates_20250927;' as drop_backup_conversion,
    'DROP TABLE backup_products_20250927;' as drop_backup_products,
    'DELETE FROM migration_backup_log WHERE migration_name LIKE ''%product_type%'';' as clear_log,
    '⚠️ รันคำสั่งเหล่านี้เฉพาะเมื่อแน่ใจว่าไม่ต้องการข้อมูลสำรอง' as warning;