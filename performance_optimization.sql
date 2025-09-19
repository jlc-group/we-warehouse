-- 🚀 Performance Optimization for Warehouse Location Management
-- รันใน Supabase SQL Editor เพื่อปรับปรุง performance

-- ==========================================
-- Phase 1: สร้าง Materialized View สำหรับ Location Summary
-- ==========================================

-- สร้าง view ที่คำนวณข้อมูล inventory summary ไว้ล่วงหน้า
CREATE OR REPLACE VIEW warehouse_locations_with_inventory AS
SELECT
    wl.*,
    COALESCE(inv.inventory_count, 0) as inventory_count,
    COALESCE(inv.total_boxes, 0) as total_boxes,
    COALESCE(inv.total_loose, 0) as total_loose,
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
        location,
        COUNT(*) as inventory_count,
        SUM(COALESCE(box_quantity, 0)) as total_boxes,
        SUM(COALESCE(loose_quantity, 0)) as total_loose
    FROM inventory_items
    WHERE is_active = true
    GROUP BY location
) inv ON wl.location_code = inv.location;

-- ==========================================
-- Phase 2: สร้าง RPC Functions สำหรับ Fast Data Retrieval
-- ==========================================

-- Function สำหรับ get locations with pagination และ search
CREATE OR REPLACE FUNCTION get_warehouse_locations_optimized(
    search_term TEXT DEFAULT '',
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0,
    order_by TEXT DEFAULT 'location_code',
    order_direction TEXT DEFAULT 'ASC'
)
RETURNS TABLE (
    id UUID,
    location_code TEXT,
    row TEXT,
    level INTEGER,
    position INTEGER,
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
    utilization_percentage NUMERIC,
    last_sync TIMESTAMPTZ
) AS $$
DECLARE
    query_text TEXT;
BEGIN
    -- Build dynamic query
    query_text := 'SELECT * FROM warehouse_locations_with_inventory WHERE is_active = true';

    -- Add search filter if provided
    IF search_term != '' THEN
        query_text := query_text || ' AND (location_code ILIKE ''%' || search_term || '%'' OR description ILIKE ''%' || search_term || '%'')';
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
CREATE OR REPLACE FUNCTION get_location_statistics()
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
    FROM warehouse_locations_with_inventory
    WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function สำหรับ get locations by row (สำหรับ ShelfGrid)
CREATE OR REPLACE FUNCTION get_locations_by_row(row_letter TEXT)
RETURNS TABLE (
    location_code TEXT,
    level INTEGER,
    position INTEGER,
    inventory_count BIGINT,
    utilization_percentage NUMERIC,
    is_occupied BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wlwi.location_code,
        wlwi.level,
        wlwi.position,
        wlwi.inventory_count,
        wlwi.utilization_percentage,
        (wlwi.inventory_count > 0) as is_occupied
    FROM warehouse_locations_with_inventory wlwi
    WHERE wlwi.row = row_letter
      AND wlwi.is_active = true
    ORDER BY wlwi.level, wlwi.position;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Phase 3: สร้าง Indexes สำหรับ Performance
-- ==========================================

-- Index สำหรับ warehouse_locations
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_location_code ON warehouse_locations(location_code);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_row_level_position ON warehouse_locations(row, level, position);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_is_active ON warehouse_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_updated_at ON warehouse_locations(updated_at);

-- Index สำหรับ inventory_items (เพื่อการ JOIN ที่เร็วขึ้น)
CREATE INDEX IF NOT EXISTS idx_inventory_items_location ON inventory_items(location);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_active ON inventory_items(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_items_location_active ON inventory_items(location, is_active);

-- ==========================================
-- Phase 4: Grant Permissions
-- ==========================================

GRANT SELECT ON warehouse_locations_with_inventory TO public;
GRANT EXECUTE ON FUNCTION get_warehouse_locations_optimized(TEXT, INTEGER, INTEGER, TEXT, TEXT) TO public;
GRANT EXECUTE ON FUNCTION get_location_statistics() TO public;
GRANT EXECUTE ON FUNCTION get_locations_by_row(TEXT) TO public;

-- ==========================================
-- Phase 5: Test Performance
-- ==========================================

-- Test การทำงานของ view
SELECT * FROM warehouse_locations_with_inventory LIMIT 5;

-- Test RPC functions
SELECT * FROM get_warehouse_locations_optimized('A', 10, 0);
SELECT * FROM get_location_statistics();
SELECT * FROM get_locations_by_row('A');

SELECT 'Database optimization completed! Views and functions ready for use.' as status;