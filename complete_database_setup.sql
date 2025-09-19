-- 🚀 Complete Database Setup for Warehouse Location Management
-- รันไฟล์นี้ใน Supabase SQL Editor เพื่อติดตั้งระบบครบถ้วน

-- ==========================================
-- Phase 0: Cleanup - ลบ functions/views เดิมทั้งหมด (ลำดับสำคัญ!)
-- ==========================================

-- ลบ view ก่อน เพราะ view ขึ้นอยู่กับ functions
DROP VIEW IF EXISTS warehouse_locations_with_inventory CASCADE;

-- ลบ RPC functions ที่ไม่มี dependencies ก่อน
DROP FUNCTION IF EXISTS get_warehouse_locations_optimized(TEXT, INTEGER, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_location_statistics() CASCADE;
DROP FUNCTION IF EXISTS get_locations_by_row(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_location_inventory_details(TEXT) CASCADE;

-- ลบ sync function (อาจมี dependency)
DROP FUNCTION IF EXISTS sync_inventory_to_warehouse_locations() CASCADE;

-- ลบ normalize function สุดท้าย (เพราะ functions อื่นอาจใช้)
DROP FUNCTION IF EXISTS normalize_location_format(TEXT) CASCADE;

-- ==========================================
-- Phase 1: Location Normalization Function
-- ==========================================

-- ฟังก์ชัน normalize location ที่รองรับ format หลากหลาย
CREATE OR REPLACE FUNCTION normalize_location_format(input_location TEXT)
RETURNS TEXT AS $$
DECLARE
    cleaned TEXT;
    parts TEXT[];
    row_char TEXT;
    level_num INTEGER;
    position_num INTEGER;
BEGIN
    -- Return empty if null
    IF input_location IS NULL OR input_location = '' THEN
        RETURN '';
    END IF;

    -- Clean input
    cleaned := TRIM(UPPER(input_location));

    -- Pattern 1: A/1/01 (already correct)
    IF cleaned ~ '^[A-Z]/[1-4]/\d{2}$' THEN
        RETURN cleaned;
    END IF;

    -- Pattern 2: A/1/1 (need to pad position)
    IF cleaned ~ '^[A-Z]/[1-4]/\d{1}$' THEN
        parts := string_to_array(cleaned, '/');
        RETURN parts[1] || '/' || parts[2] || '/' || LPAD(parts[3], 2, '0');
    END IF;

    -- Pattern 3: A1/1, A1-1, A1/01, A1/02 etc (with different separators)
    IF cleaned ~ '^[A-Z]\d[-/]\d+$' THEN
        -- Replace - with /
        cleaned := REPLACE(cleaned, '-', '/');
        parts := string_to_array(cleaned, '/');
        IF array_length(parts, 1) = 2 THEN
            row_char := SUBSTRING(parts[1], 1, 1);
            level_num := SUBSTRING(parts[1], 2, 1)::INTEGER;
            position_num := parts[2]::INTEGER;
            IF level_num BETWEEN 1 AND 4 AND position_num BETWEEN 1 AND 99 THEN
                RETURN row_char || '/' || level_num || '/' || LPAD(position_num::TEXT, 2, '0');
            END IF;
        END IF;
    END IF;

    -- Pattern 4: A1.1 (with dot)
    IF cleaned ~ '^[A-Z]\d\.\d+$' THEN
        cleaned := REPLACE(cleaned, '.', '/');
        parts := string_to_array(cleaned, '/');
        IF array_length(parts, 1) = 2 THEN
            row_char := SUBSTRING(parts[1], 1, 1);
            level_num := SUBSTRING(parts[1], 2, 1)::INTEGER;
            position_num := parts[2]::INTEGER;
            IF level_num BETWEEN 1 AND 4 AND position_num BETWEEN 1 AND 99 THEN
                RETURN row_char || '/' || level_num || '/' || LPAD(position_num::TEXT, 2, '0');
            END IF;
        END IF;
    END IF;

    -- Pattern 5: A101, A201 (combined format)
    IF cleaned ~ '^[A-Z]\d{3}$' THEN
        row_char := SUBSTRING(cleaned, 1, 1);
        level_num := SUBSTRING(cleaned, 2, 1)::INTEGER;
        position_num := SUBSTRING(cleaned, 3, 2)::INTEGER;
        IF level_num BETWEEN 1 AND 4 AND position_num BETWEEN 1 AND 99 THEN
            RETURN row_char || '/' || level_num || '/' || LPAD(position_num::TEXT, 2, '0');
        END IF;
    END IF;

    -- Pattern 6: A11, A21 (short format)
    IF cleaned ~ '^[A-Z]\d{2}$' THEN
        row_char := SUBSTRING(cleaned, 1, 1);
        level_num := SUBSTRING(cleaned, 2, 1)::INTEGER;
        position_num := SUBSTRING(cleaned, 3, 1)::INTEGER;
        IF level_num BETWEEN 1 AND 4 AND position_num BETWEEN 1 AND 9 THEN
            RETURN row_char || '/' || level_num || '/' || LPAD(position_num::TEXT, 2, '0');
        END IF;
    END IF;

    -- If nothing worked, return original
    RETURN input_location;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Phase 2: Sync Function with Normalization
-- ==========================================

CREATE OR REPLACE FUNCTION sync_inventory_to_warehouse_locations()
RETURNS TEXT AS $$
DECLARE
    location_record RECORD;
    processed_count INTEGER := 0;
    error_count INTEGER := 0;
    existing_count INTEGER := 0;
    updated_count INTEGER := 0;
    normalized_location TEXT;
    parts TEXT[];
    row_char TEXT;
    level_num INTEGER;
    position_num INTEGER;
    error_details TEXT := '';
BEGIN
    -- Loop through ALL unique locations in inventory_items
    FOR location_record IN
        SELECT
            location,
            COUNT(*) as item_count,
            SUM(COALESCE(box_quantity, 0)) as total_boxes,
            SUM(COALESCE(loose_quantity, 0)) as total_loose
        FROM inventory_items
        WHERE location IS NOT NULL
          AND location != ''
          AND TRIM(location) != ''
        GROUP BY location
        ORDER BY location
    LOOP
        BEGIN
            -- Normalize location format using our new function
            normalized_location := normalize_location_format(location_record.location);

            -- Check if normalized location is valid
            IF normalized_location ~ '^[A-Z]/[1-4]/\d{2}$' THEN
                parts := string_to_array(normalized_location, '/');
                row_char := parts[1];
                level_num := parts[2]::INTEGER;
                position_num := parts[3]::INTEGER;

                -- Check if location already exists
                IF EXISTS (SELECT 1 FROM warehouse_locations WHERE location_code = normalized_location) THEN
                    -- Update existing location description
                    UPDATE warehouse_locations
                    SET
                        description = 'Has inventory: ' || location_record.item_count || ' items, ' ||
                                    location_record.total_boxes || ' boxes, ' || location_record.total_loose || ' loose',
                        updated_at = NOW()
                    WHERE location_code = normalized_location;

                    updated_count := updated_count + 1;
                ELSE
                    -- Insert new location
                    INSERT INTO warehouse_locations (
                        location_code, "row", "level", "position", location_type,
                        capacity_boxes, capacity_loose, description, user_id
                    ) VALUES (
                        normalized_location, row_char, level_num, position_num, 'shelf',

                        -- Set capacity based on current usage + buffer
                        GREATEST(location_record.total_boxes + 50, 100),  -- minimum 100
                        GREATEST(location_record.total_loose + 500, 1000), -- minimum 1000

                        'Created from inventory (' || location_record.location || '): ' ||
                        location_record.item_count || ' items, ' ||
                        location_record.total_boxes || ' boxes, ' || location_record.total_loose || ' loose',
                        '00000000-0000-0000-0000-000000000000'::UUID
                    );

                    processed_count := processed_count + 1;
                END IF;
            ELSE
                error_count := error_count + 1;
                error_details := error_details || location_record.location || '→' || normalized_location || ', ';
            END IF;

        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            error_details := error_details || location_record.location || '(ERROR: ' || SQLERRM || '), ';
        END;
    END LOOP;

    RETURN 'Sync completed! ' ||
           'New: ' || processed_count ||
           ', Updated: ' || updated_count ||
           ', Errors: ' || error_count ||
           CASE WHEN error_count > 0 THEN ' | Sample errors: ' || LEFT(error_details, 200) ELSE '' END;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Phase 3: Optimized Views with Normalization
-- ==========================================


-- สร้าง view ที่คำนวณข้อมูล inventory summary พร้อม normalization และข้อมูลสินค้าละเอียด
CREATE VIEW warehouse_locations_with_inventory AS
SELECT
    wl.*,
    COALESCE(inv.inventory_count, 0) as inventory_count,
    COALESCE(inv.total_boxes, 0) as total_boxes,
    COALESCE(inv.total_loose, 0) as total_loose,
    COALESCE(inv.total_cartons, 0) as total_cartons,
    COALESCE(inv.total_pieces, 0) as total_pieces,
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
        -- เพิ่มการนับหน่วยใหม่ (ปรับตาม context ที่ข้อมูลเศษควรเป็น "ชิ้น")
        SUM(CASE WHEN LOWER(product_name) LIKE '%ลัง%' OR LOWER(product_name) LIKE '%carton%' THEN COALESCE(box_quantity, 0) ELSE 0 END) as total_cartons,
        SUM(CASE
            WHEN LOWER(product_name) LIKE '%ชิ้น%' OR LOWER(product_name) LIKE '%piece%' OR LOWER(product_name) LIKE '%pcs%'
                OR COALESCE(loose_quantity, 0) > 0  -- ถ้ามี loose_quantity แสดงว่าเป็นเศษ/ชิ้น
            THEN COALESCE(box_quantity, 0) + COALESCE(loose_quantity, 0)
            ELSE 0
        END) as total_pieces,
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
                'unit', CASE
                    WHEN LOWER(product_name) LIKE '%ลัง%' OR LOWER(product_name) LIKE '%carton%' THEN 'ลัง'
                    WHEN LOWER(product_name) LIKE '%ชิ้น%' OR LOWER(product_name) LIKE '%piece%' OR LOWER(product_name) LIKE '%pcs%'
                        OR COALESCE(loose_quantity, 0) > 0 THEN 'ชิ้น'
                    ELSE 'กล่อง'
                END,
                'box_quantity', COALESCE(box_quantity, 0),
                'loose_quantity', COALESCE(loose_quantity, 0),
                'total_quantity', COALESCE(box_quantity, 0) + COALESCE(loose_quantity, 0),
                'unit_display', CASE
                    WHEN LOWER(product_name) LIKE '%ลัง%' OR LOWER(product_name) LIKE '%carton%' THEN 'ลัง'
                    WHEN LOWER(product_name) LIKE '%ชิ้น%' OR LOWER(product_name) LIKE '%piece%' OR LOWER(product_name) LIKE '%pcs%'
                        OR COALESCE(loose_quantity, 0) > 0 THEN 'ชิ้น'
                    ELSE 'กล่อง'
                END
            ) ORDER BY product_name, sku
        ) FILTER (WHERE sku IS NOT NULL) as detailed_inventory
    FROM inventory_items
    WHERE location IS NOT NULL AND location != '' AND TRIM(location) != ''
    GROUP BY normalize_location_format(location)
) inv ON wl.location_code = inv.normalized_location;

-- ==========================================
-- Phase 4: RPC Functions for Frontend
-- ==========================================

-- Function สำหรับ get locations with pagination และ search (พร้อมข้อมูลสินค้าละเอียด)
CREATE FUNCTION get_warehouse_locations_optimized(
    search_term TEXT DEFAULT '',
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0,
    order_by TEXT DEFAULT 'location_code',
    order_direction TEXT DEFAULT 'ASC'
)
RETURNS TABLE (
    id UUID,
    location_code TEXT,
    "row" TEXT,
    "level" INTEGER,
    "position" INTEGER,
    location_type TEXT,
    capacity_boxes INTEGER,
    capacity_loose INTEGER,
    description TEXT,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_id UUID,
    inventory_count BIGINT,
    total_boxes BIGINT,
    total_loose BIGINT,
    total_cartons BIGINT,
    total_pieces BIGINT,
    total_sheets BIGINT,
    total_bottles BIGINT,
    total_sachets BIGINT,
    total_quantity_sum BIGINT,
    product_list TEXT,
    detailed_inventory JSONB,
    utilization_percentage NUMERIC,
    last_sync TIMESTAMPTZ
) AS $$
DECLARE
    query_text TEXT;
BEGIN
    -- Build dynamic query
    query_text := 'SELECT * FROM warehouse_locations_with_inventory';

    -- Add search filter if provided
    IF search_term != '' THEN
        query_text := query_text || ' WHERE (location_code ILIKE ''%' || search_term || '%'' OR description ILIKE ''%' || search_term || '%'')';
    END IF;

    -- Add ordering
    query_text := query_text || ' ORDER BY ' || order_by || ' ' || order_direction;

    -- Add pagination
    query_text := query_text || ' LIMIT ' || limit_count || ' OFFSET ' || offset_count;

    -- Execute and return results
    RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql;

-- Function สำหรับ get location statistics
CREATE FUNCTION get_location_statistics()
RETURNS TABLE (
    total_locations BIGINT,
    total_with_inventory BIGINT,
    high_utilization_count BIGINT,
    medium_utilization_count BIGINT,
    low_utilization_count BIGINT,
    empty_locations BIGINT,
    average_utilization NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_locations,
        COUNT(*) FILTER (WHERE inventory_count > 0) as total_with_inventory,
        COUNT(*) FILTER (WHERE utilization_percentage >= 80) as high_utilization_count,
        COUNT(*) FILTER (WHERE utilization_percentage >= 40 AND utilization_percentage < 80) as medium_utilization_count,
        COUNT(*) FILTER (WHERE utilization_percentage < 40 AND utilization_percentage > 0) as low_utilization_count,
        COUNT(*) FILTER (WHERE inventory_count = 0) as empty_locations,
        AVG(utilization_percentage) as average_utilization
    FROM warehouse_locations_with_inventory;
END;
$$ LANGUAGE plpgsql;

-- Function สำหรับ get locations by row (สำหรับ ShelfGrid)
CREATE FUNCTION get_locations_by_row(row_letter TEXT)
RETURNS TABLE (
    location_code TEXT,
    "level" INTEGER,
    "position" INTEGER,
    inventory_count BIGINT,
    utilization_percentage NUMERIC,
    is_occupied BOOLEAN,
    product_list TEXT,
    total_units_summary TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wlwi.location_code,
        wlwi."level",
        wlwi."position",
        wlwi.inventory_count,
        wlwi.utilization_percentage,
        (wlwi.inventory_count > 0) as is_occupied,
        wlwi.product_list,
        CONCAT(
            CASE WHEN wlwi.total_cartons > 0 THEN wlwi.total_cartons || ' ลัง ' ELSE '' END,
            CASE WHEN wlwi.total_boxes > 0 THEN wlwi.total_boxes || ' กล่อง ' ELSE '' END,
            CASE WHEN wlwi.total_pieces > 0 THEN wlwi.total_pieces || ' ชิ้น ' ELSE '' END,
            CASE WHEN wlwi.total_loose > 0 THEN wlwi.total_loose || ' หลวม ' ELSE '' END
        ) as total_units_summary
    FROM warehouse_locations_with_inventory wlwi
    WHERE wlwi."row" = row_letter
    ORDER BY wlwi."level", wlwi."position";
END;
$$ LANGUAGE plpgsql;

-- Function ใหม่สำหรับดูรายละเอียดสินค้าในตำแหน่ง
CREATE FUNCTION get_location_inventory_details(location_code_param TEXT)
RETURNS TABLE (
    location_code TEXT,
    sku_code TEXT,
    product_name TEXT,
    unit TEXT,
    box_quantity INTEGER,
    loose_quantity INTEGER,
    total_quantity INTEGER,
    unit_display TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        normalize_location_format(ii.location) as location_code,
        ii.sku as sku_code,
        COALESCE(ii.product_name, 'ไม่ระบุชื่อ') as product_name,
        CASE
            WHEN LOWER(ii.product_name) LIKE '%ลัง%' OR LOWER(ii.product_name) LIKE '%carton%' THEN 'ลัง'
            WHEN LOWER(ii.product_name) LIKE '%ชิ้น%' OR LOWER(ii.product_name) LIKE '%piece%' OR LOWER(ii.product_name) LIKE '%pcs%'
                OR COALESCE(ii.loose_quantity, 0) > 0 THEN 'ชิ้น'
            ELSE 'กล่อง'
        END as unit,
        COALESCE(ii.box_quantity, 0) as box_quantity,
        COALESCE(ii.loose_quantity, 0) as loose_quantity,
        COALESCE(ii.box_quantity, 0) + COALESCE(ii.loose_quantity, 0) as total_quantity,
        CASE
            WHEN LOWER(ii.product_name) LIKE '%ลัง%' OR LOWER(ii.product_name) LIKE '%carton%' THEN 'ลัง'
            WHEN LOWER(ii.product_name) LIKE '%ชิ้น%' OR LOWER(ii.product_name) LIKE '%piece%' OR LOWER(ii.product_name) LIKE '%pcs%'
                OR COALESCE(ii.loose_quantity, 0) > 0 THEN 'ชิ้น'
            ELSE 'กล่อง'
        END as unit_display
    FROM inventory_items ii
    WHERE normalize_location_format(ii.location) = location_code_param
    ORDER BY ii.product_name, ii.sku;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Phase 5: Performance Indexes
-- ==========================================

-- Index สำหรับ warehouse_locations
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_location_code ON warehouse_locations(location_code);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_row_level_position ON warehouse_locations("row", "level", "position");
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_updated_at ON warehouse_locations(updated_at);

-- Index สำหรับ inventory_items (เพื่อการ JOIN ที่เร็วขึ้น)
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON inventory_items(location);

-- ==========================================
-- Phase 6: Grant Permissions
-- ==========================================

GRANT EXECUTE ON FUNCTION normalize_location_format(TEXT) TO public;
GRANT EXECUTE ON FUNCTION sync_inventory_to_warehouse_locations() TO public;
GRANT SELECT ON warehouse_locations_with_inventory TO public;
GRANT EXECUTE ON FUNCTION get_warehouse_locations_optimized(TEXT, INTEGER, INTEGER, TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION get_location_statistics() TO public;
GRANT EXECUTE ON FUNCTION get_locations_by_row(TEXT) TO public;
GRANT EXECUTE ON FUNCTION get_location_inventory_details(TEXT) TO public;

-- ==========================================
-- Phase 7: Test Normalization Function
-- ==========================================

SELECT 'Testing normalize_location_format function:' as test;

SELECT
    input,
    normalize_location_format(input) as normalized
FROM (VALUES
    ('A1/1'),    -- A1/1 → A/1/01
    ('A1/01'),   -- A1/01 → A/1/01
    ('A1/02'),   -- A1/02 → A/1/02
    ('A1/03'),   -- A1/03 → A/1/03
    ('A1-1'),    -- A1-1 → A/1/01
    ('A1.1'),    -- A1.1 → A/1/01
    ('A/1/1'),   -- A/1/1 → A/1/01
    ('A/1/01'),  -- A/1/01 → A/1/01 (already correct)
    ('A101'),    -- A101 → A/1/01
    ('A11'),     -- A11 → A/1/01
    ('B2/5'),    -- B2/5 → B/2/05
    ('C34'),     -- C34 → C/3/04
    ('D/3/12'),  -- D/3/12 → D/3/12 (already correct)
    ('F1/10')    -- F1/10 → F/1/10
) as t(input);

-- Test with real inventory data sample (แค่ดูว่ามีข้อมูลอะไรบ้าง)
SELECT 'Sample inventory locations before sync:' as test;
SELECT DISTINCT
    location as original,
    normalize_location_format(location) as normalized,
    COUNT(*) as item_count
FROM inventory_items
WHERE location IS NOT NULL AND location != ''
GROUP BY location, normalize_location_format(location)
ORDER BY normalize_location_format(location)
LIMIT 10;

-- Test ข้อมูลสินค้าใหม่
SELECT 'Test: Product Details in Locations' as test;
SELECT
    location_code,
    inventory_count,
    total_cartons,
    total_boxes,
    total_pieces,
    total_loose,
    total_quantity_sum,
    LEFT(product_list, 50) || '...' as product_sample
FROM warehouse_locations_with_inventory
WHERE inventory_count > 0
ORDER BY inventory_count DESC
LIMIT 5;

-- Test RPC function ใหม่สำหรับรายละเอียดสินค้า
SELECT 'Test: Location Inventory Details Function' as test;
SELECT 'Sample call to get_location_inventory_details:' as info;

SELECT 'Database setup completed! You can now run the sync function.' as status;
SELECT 'New features added:' as info;
SELECT '- รหัสสินค้า และ ชื่อสินค้า ในแต่ละตำแหน่ง' as feature1;
SELECT '- หน่วยนับ: ลัง, กล่อง, ชิ้น, หลวม' as feature2;
SELECT '- จำนวนรวมแยกตามหน่วย' as feature3;
SELECT '- รายการสินค้าทั้งหมดในตำแหน่ง' as feature4;
SELECT '- ข้อมูลรายละเอียดแบบ JSON' as feature5;