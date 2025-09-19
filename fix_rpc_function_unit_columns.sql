-- 🔧 Fix RPC Function to Include Unit System Columns
-- This fixes the get_warehouse_locations_optimized function to match the unit system upgrade

-- ==========================================
-- Drop and recreate the function with all unit columns
-- ==========================================

DROP FUNCTION IF EXISTS get_warehouse_locations_optimized(TEXT, INTEGER, INTEGER, TEXT, TEXT) CASCADE;

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
    total_sheets BIGINT,      -- ✅ Added missing unit
    total_bottles BIGINT,     -- ✅ Added missing unit
    total_sachets BIGINT,     -- ✅ Added missing unit
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
    IF order_by = 'location_code' THEN
        query_text := query_text || ' ORDER BY location_code';
    ELSIF order_by = 'inventory_count' THEN
        query_text := query_text || ' ORDER BY inventory_count';
    ELSIF order_by = 'utilization_percentage' THEN
        query_text := query_text || ' ORDER BY utilization_percentage';
    ELSIF order_by = 'total_quantity_sum' THEN
        query_text := query_text || ' ORDER BY total_quantity_sum';
    ELSE
        query_text := query_text || ' ORDER BY location_code';
    END IF;

    -- Add direction
    IF UPPER(order_direction) = 'DESC' THEN
        query_text := query_text || ' DESC';
    ELSE
        query_text := query_text || ' ASC';
    END IF;

    -- Add pagination
    query_text := query_text || ' LIMIT ' || limit_count || ' OFFSET ' || offset_count;

    -- Execute dynamic query
    RETURN QUERY EXECUTE query_text;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_warehouse_locations_optimized(TEXT, INTEGER, INTEGER, TEXT, TEXT) TO public;

-- Test the function
SELECT 'RPC function updated successfully with all unit columns!' as status;