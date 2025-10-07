-- Migration: Add product_type and product_id columns to product_conversion_rates
-- Date: 2025-09-27
-- Purpose: Enable complete relationship between products and conversion_rates tables
-- Author: Claude Code Assistant

-- ขั้นตอนที่ 1: เพิ่มคอลัมน์ product_id และ product_type
-- ใช้ IF NOT EXISTS เพื่อความปลอดภัยในกรณีที่คอลัมน์มีอยู่แล้ว

DO $$
BEGIN
    -- เพิ่มคอลัมน์ product_id (UUID) เพื่อเชื่อมโยงกับตาราง products
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_conversion_rates'
        AND column_name = 'product_id'
    ) THEN
        ALTER TABLE public.product_conversion_rates
        ADD COLUMN product_id UUID;

        RAISE NOTICE 'เพิ่มคอลัมน์ product_id เรียบร้อยแล้ว';
    ELSE
        RAISE NOTICE 'คอลัมน์ product_id มีอยู่แล้ว';
    END IF;

    -- เพิ่มคอลัมน์ product_type (TEXT) เพื่อเก็บประเภทสินค้า
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'product_conversion_rates'
        AND column_name = 'product_type'
    ) THEN
        ALTER TABLE public.product_conversion_rates
        ADD COLUMN product_type TEXT;

        RAISE NOTICE 'เพิ่มคอลัมน์ product_type เรียบร้อยแล้ว';
    ELSE
        RAISE NOTICE 'คอลัมน์ product_type มีอยู่แล้ว';
    END IF;
END $$;

-- ขั้นตอนที่ 2: เพิ่ม Foreign Key Constraint
-- ตรวจสอบว่ามี constraint อยู่แล้วหรือไม่ก่อนสร้างใหม่

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_product_conversion_product_id'
        AND table_name = 'product_conversion_rates'
    ) THEN
        ALTER TABLE public.product_conversion_rates
        ADD CONSTRAINT fk_product_conversion_product_id
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

        RAISE NOTICE 'สร้าง Foreign Key Constraint เรียบร้อยแล้ว';
    ELSE
        RAISE NOTICE 'Foreign Key Constraint มีอยู่แล้ว';
    END IF;
END $$;

-- ขั้นตอนที่ 3: สร้าง Indexes เพื่อประสิทธิภาพ

-- Index สำหรับ product_id
CREATE INDEX IF NOT EXISTS idx_product_conversion_rates_product_id
ON public.product_conversion_rates(product_id);

-- Index สำหรับ product_type
CREATE INDEX IF NOT EXISTS idx_product_conversion_rates_product_type
ON public.product_conversion_rates(product_type);

-- Index แบบ compound สำหรับการค้นหาที่รวดเร็ว
CREATE INDEX IF NOT EXISTS idx_product_conversion_rates_type_sku
ON public.product_conversion_rates(product_type, sku);

-- ขั้นตอนที่ 4: อัพเดตข้อมูลที่มีอยู่ให้เชื่อมโยงกับตาราง products
-- จับคู่ SKU ใน conversion_rates กับ sku_code ใน products

UPDATE public.product_conversion_rates
SET
    product_id = p.id,
    product_type = p.product_type
FROM public.products p
WHERE
    product_conversion_rates.sku = p.sku_code
    AND product_conversion_rates.product_id IS NULL;

-- แสดงผลลัพธ์การอัพเดต
DO $$
DECLARE
    updated_count INTEGER;
    total_conversions INTEGER;
    unlinked_count INTEGER;
BEGIN
    -- นับจำนวนรายการที่อัพเดตเรียบร้อยแล้ว
    SELECT COUNT(*) INTO updated_count
    FROM public.product_conversion_rates
    WHERE product_id IS NOT NULL;

    -- นับจำนวนรายการทั้งหมด
    SELECT COUNT(*) INTO total_conversions
    FROM public.product_conversion_rates;

    -- นับจำนวนรายการที่ยังไม่ได้เชื่อมโยง
    SELECT COUNT(*) INTO unlinked_count
    FROM public.product_conversion_rates
    WHERE product_id IS NULL;

    RAISE NOTICE '📊 สถิติการเชื่อมโยงข้อมูล:';
    RAISE NOTICE 'รายการที่เชื่อมโยงสำเร็จ: % / %', updated_count, total_conversions;
    RAISE NOTICE 'รายการที่ยังไม่ได้เชื่อมโยง: %', unlinked_count;

    IF unlinked_count > 0 THEN
        RAISE WARNING 'มีรายการ % รายการที่ยังไม่สามารถเชื่อมโยงได้ - ตรวจสอบ SKU', unlinked_count;
    END IF;
END $$;

-- ขั้นตอนที่ 5: สร้าง Function และ Trigger สำหรับ Auto-sync product_type

-- Function สำหรับการ sync product_type อัตโนมัติ
CREATE OR REPLACE FUNCTION public.sync_product_conversion_type()
RETURNS TRIGGER AS $$
BEGIN
    -- เมื่อมีการอัพเดต product_id ให้ sync product_type ด้วย
    IF NEW.product_id IS DISTINCT FROM OLD.product_id AND NEW.product_id IS NOT NULL THEN
        SELECT product_type INTO NEW.product_type
        FROM public.products
        WHERE id = NEW.product_id;

        -- ถ้าไม่พบข้อมูลใน products table
        IF NOT FOUND THEN
            RAISE WARNING 'ไม่พบข้อมูลสินค้าสำหรับ product_id: %', NEW.product_id;
            NEW.product_type := NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง Trigger สำหรับ Auto-sync
DROP TRIGGER IF EXISTS trigger_sync_product_conversion_type ON public.product_conversion_rates;
CREATE TRIGGER trigger_sync_product_conversion_type
    BEFORE UPDATE ON public.product_conversion_rates
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_product_conversion_type();

-- ขั้นตอนที่ 6: สร้าง View สำหรับการ Query ที่สะดวก

-- View products_with_conversions เพื่อการ query ที่ง่ายขึ้น
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

    -- ตัวอย่างการคำนวณ (10 หน่วยระดับ 1 + 2 หน่วยระดับ 2 + 5 หน่วยระดับ 3)
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
LEFT JOIN public.product_conversion_rates pcr ON p.id = pcr.product_id
WHERE p.is_active = true
ORDER BY p.product_type, p.sku_code;

-- Grant permissions สำหรับ View
GRANT SELECT ON public.products_with_conversions TO anon, authenticated;

-- ขั้นตอนที่ 7: เพิ่ม Comments สำหรับการบันทึก

COMMENT ON COLUMN public.product_conversion_rates.product_id IS
'Foreign key เชื่อมโยงกับตาราง products - อัพเดตอัตโนมัติเมื่อมีการเปลี่ยนแปลง';

COMMENT ON COLUMN public.product_conversion_rates.product_type IS
'ประเภทสินค้า (FG, PK, RM) - sync อัตโนมัติจากตาราง products ผ่าน trigger';

COMMENT ON VIEW public.products_with_conversions IS
'View รวมข้อมูลสินค้าและอัตราแปลงหน่วย - ใช้สำหรับ UI และการรายงาน';

COMMENT ON FUNCTION public.sync_product_conversion_type() IS
'Function อัพเดต product_type อัตโนมัติเมื่อ product_id เปลี่ยนแปลง';

-- แสดงผลสำเร็จ
SELECT
    '🎉 Migration สำเร็จ! เพิ่มคอลัมน์ product_type และ product_id แล้ว' as status,
    NOW() as completed_at;

-- แสดงสรุปข้อมูลหลัง Migration
SELECT
    COUNT(*) as total_products,
    COUNT(CASE WHEN product_type = 'FG' THEN 1 END) as fg_products,
    COUNT(CASE WHEN product_type = 'PK' THEN 1 END) as pk_products,
    COUNT(CASE WHEN product_type IS NULL THEN 1 END) as untyped_products
FROM public.products_with_conversions;

-- แสดงตัวอย่างข้อมูลที่เชื่อมโยงแล้ว
SELECT
    'ตัวอย่างข้อมูลที่เชื่อมโยงแล้ว:' as info,
    sku_code,
    product_name,
    product_type,
    has_conversion_rates
FROM public.products_with_conversions
WHERE has_conversion_rates = true
LIMIT 5;