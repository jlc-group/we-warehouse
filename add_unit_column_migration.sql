-- 🔧 Migration: เพิ่มคอลัมน์ unit ในตาราง inventory_items
-- รันไฟล์นี้ใน Supabase SQL Editor เพื่อเพิ่มคอลัมน์หน่วยนับ

-- ==========================================
-- Phase 1: เพิ่มคอลัมน์ unit
-- ==========================================

-- เพิ่มคอลัมน์ unit ในตาราง inventory_items
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'กล่อง';

-- ==========================================
-- Phase 2: อัปเดตข้อมูลเดิมให้มีหน่วยที่เหมาะสม
-- ==========================================

-- อัปเดตหน่วยตามลักษณะของข้อมูล
UPDATE inventory_items SET unit =
CASE
    -- ถ้าชื่อสินค้ามี "ลัง" หรือ "carton"
    WHEN LOWER(product_name) LIKE '%ลัง%' OR LOWER(product_name) LIKE '%carton%' THEN 'ลัง'

    -- ถ้าชื่อสินค้ามี "ชิ้น", "piece", "pcs"
    WHEN LOWER(product_name) LIKE '%ชิ้น%' OR LOWER(product_name) LIKE '%piece%' OR LOWER(product_name) LIKE '%pcs%' THEN 'ชิ้น'

    -- ถ้ามี loose_quantity > 0 แสดงว่าเป็นของเศษ (ชิ้น)
    WHEN COALESCE(loose_quantity, 0) > 0 THEN 'ชิ้น'

    -- ถ้า box_quantity มากกว่า loose_quantity อย่างชัดเจน อาจเป็นกล่อง
    WHEN COALESCE(box_quantity, 0) > COALESCE(loose_quantity, 0) * 2 THEN 'กล่อง'

    -- กรณีอื่นๆ ให้เป็นกล่อง (default)
    ELSE 'กล่อง'
END
WHERE unit IS NULL OR unit = 'กล่อง';

-- ==========================================
-- Phase 3: สร้าง function เพื่อช่วยตั้งหน่วยอัตโนมัติ
-- ==========================================

CREATE OR REPLACE FUNCTION auto_detect_unit(
    product_name_param TEXT,
    box_qty INTEGER DEFAULT 0,
    loose_qty INTEGER DEFAULT 0
)
RETURNS TEXT AS $$
BEGIN
    -- ตรวจสอบจากชื่อสินค้าก่อน
    IF LOWER(product_name_param) LIKE '%ลัง%' OR LOWER(product_name_param) LIKE '%carton%' THEN
        RETURN 'ลัง';
    END IF;

    IF LOWER(product_name_param) LIKE '%ชิ้น%' OR LOWER(product_name_param) LIKE '%piece%' OR LOWER(product_name_param) LIKE '%pcs%' THEN
        RETURN 'ชิ้น';
    END IF;

    IF LOWER(product_name_param) LIKE '%แผง%' OR LOWER(product_name_param) LIKE '%แผ่น%' OR LOWER(product_name_param) LIKE '%sheet%' THEN
        RETURN 'แผง';
    END IF;

    IF LOWER(product_name_param) LIKE '%ขวด%' OR LOWER(product_name_param) LIKE '%bottle%' THEN
        RETURN 'ขวด';
    END IF;

    IF LOWER(product_name_param) LIKE '%ซอง%' OR LOWER(product_name_param) LIKE '%sachet%' THEN
        RETURN 'ซอง';
    END IF;

    -- ตรวจสอบจากอัตราส่วน quantity
    IF COALESCE(loose_qty, 0) > 0 AND COALESCE(loose_qty, 0) > COALESCE(box_qty, 0) THEN
        RETURN 'ชิ้น';
    END IF;

    -- default เป็นกล่อง
    RETURN 'กล่อง';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Phase 4: สร้าง trigger เพื่ออัปเดตหน่วยอัตโนมัติ
-- ==========================================

CREATE OR REPLACE FUNCTION trigger_auto_set_unit()
RETURNS TRIGGER AS $$
BEGIN
    -- ถ้ายังไม่มีหน่วย หรือเป็นค่า default ให้ตั้งอัตโนมัติ
    IF NEW.unit IS NULL OR NEW.unit = 'กล่อง' THEN
        NEW.unit := auto_detect_unit(
            NEW.product_name,
            COALESCE(NEW.box_quantity, 0),
            COALESCE(NEW.loose_quantity, 0)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger สำหรับ INSERT และ UPDATE
DROP TRIGGER IF EXISTS auto_set_unit_trigger ON inventory_items;
CREATE TRIGGER auto_set_unit_trigger
    BEFORE INSERT OR UPDATE ON inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_set_unit();

-- ==========================================
-- Phase 5: อัปเดต view ให้ใช้คอลัมน์ unit จริง
-- ==========================================

-- ลบ view เดิมก่อน
DROP VIEW IF EXISTS warehouse_locations_with_inventory CASCADE;

-- สร้าง view ใหม่ที่ใช้คอลัมน์ unit จริง
CREATE VIEW warehouse_locations_with_inventory AS
SELECT
    wl.*,
    COALESCE(inv.inventory_count, 0) as inventory_count,
    COALESCE(inv.total_boxes, 0) as total_boxes,
    COALESCE(inv.total_loose, 0) as total_loose,
    COALESCE(inv.total_cartons, 0) as total_cartons,
    COALESCE(inv.total_pieces, 0) as total_pieces,
    COALESCE(inv.total_sheets, 0) as total_sheets,
    COALESCE(inv.total_bottles, 0) as total_bottles,
    COALESCE(inv.total_sachets, 0) as total_sachets,
    COALESCE(inv.total_quantity_sum, 0) as total_quantity_sum,
    inv.product_list,
    inv.detailed_inventory,
    CASE
        WHEN wl.capacity_boxes > 0 AND wl.capacity_loose > 0 THEN
            GREATEST(
                (COALESCE(inv.total_boxes, 0)::NUMERIC / wl.capacity_boxes * 100),
                (COALESCE(inv.total_loose, 0)::NUMERIC / wl.capacity_loose * 100)
            )
        WHEN wl.capacity_boxes > 0 THEN
            (COALESCE(inv.total_boxes, 0)::NUMERIC / wl.capacity_boxes * 100)
        WHEN wl.capacity_loose > 0 THEN
            (COALESCE(inv.total_loose, 0)::NUMERIC / wl.capacity_loose * 100)
        ELSE 0
    END as utilization_percentage,
    wl.updated_at as last_sync
FROM warehouse_locations wl
LEFT JOIN (
    SELECT
        normalize_location_format(location) as normalized_location,
        COUNT(*) as inventory_count,
        SUM(COALESCE(box_quantity, 0)) as total_boxes,
        SUM(COALESCE(loose_quantity, 0)) as total_loose,
        -- นับตามหน่วยจริงจากคอลัมน์ unit
        SUM(CASE WHEN unit = 'ลัง' THEN COALESCE(box_quantity, 0) + COALESCE(loose_quantity, 0) ELSE 0 END) as total_cartons,
        SUM(CASE WHEN unit = 'ชิ้น' THEN COALESCE(box_quantity, 0) + COALESCE(loose_quantity, 0) ELSE 0 END) as total_pieces,
        SUM(CASE WHEN unit = 'แผง' OR unit = 'แผ่น' THEN COALESCE(box_quantity, 0) + COALESCE(loose_quantity, 0) ELSE 0 END) as total_sheets,
        SUM(CASE WHEN unit = 'ขวด' THEN COALESCE(box_quantity, 0) + COALESCE(loose_quantity, 0) ELSE 0 END) as total_bottles,
        SUM(CASE WHEN unit = 'ซอง' THEN COALESCE(box_quantity, 0) + COALESCE(loose_quantity, 0) ELSE 0 END) as total_sachets,
        SUM(COALESCE(box_quantity, 0) + COALESCE(loose_quantity, 0)) as total_quantity_sum,
        -- รายการสินค้าทั้งหมดในตำแหน่ง
        STRING_AGG(DISTINCT
            COALESCE(product_name, sku, 'ไม่ระบุชื่อ'),
            ', ' ORDER BY COALESCE(product_name, sku, 'ไม่ระบุชื่อ')
        ) as product_list,
        -- ข้อมูลรายละเอียดแต่ละสินค้า
        JSONB_AGG(
            JSONB_BUILD_OBJECT(
                'sku_code', sku,
                'product_name', COALESCE(product_name, 'ไม่ระบุชื่อ'),
                'unit', COALESCE(unit, 'กล่อง'),
                'box_quantity', COALESCE(box_quantity, 0),
                'loose_quantity', COALESCE(loose_quantity, 0),
                'total_quantity', COALESCE(box_quantity, 0) + COALESCE(loose_quantity, 0),
                'unit_display', COALESCE(unit, 'กล่อง')
            ) ORDER BY product_name, sku
        ) FILTER (WHERE sku IS NOT NULL) as detailed_inventory
    FROM inventory_items
    WHERE location IS NOT NULL AND location != '' AND TRIM(location) != ''
    GROUP BY normalize_location_format(location)
) inv ON wl.location_code = inv.normalized_location;

-- ==========================================
-- Phase 6: Grant permissions
-- ==========================================

GRANT EXECUTE ON FUNCTION auto_detect_unit(TEXT, INTEGER, INTEGER) TO public;

-- ==========================================
-- Phase 7: ทดสอบและแสดงผลลัพธ์
-- ==========================================

-- ดูการกระจายหน่วยในข้อมูลปัจจุบัน
SELECT
    unit,
    COUNT(*) as จำนวนรายการ,
    SUM(COALESCE(box_quantity, 0)) as รวม_box_quantity,
    SUM(COALESCE(loose_quantity, 0)) as รวม_loose_quantity
FROM inventory_items
GROUP BY unit
ORDER BY COUNT(*) DESC;

-- ดูตัวอย่างข้อมูลที่อัปเดตแล้ว
SELECT
    product_name,
    unit,
    box_quantity,
    loose_quantity,
    location
FROM inventory_items
WHERE location IS NOT NULL
LIMIT 10;

SELECT 'Migration completed! Unit column added and populated automatically.' as status;