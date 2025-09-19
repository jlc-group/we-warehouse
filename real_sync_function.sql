-- Real sync function ที่ sync ข้อมูลจาก inventory_items จริงๆ

CREATE OR REPLACE FUNCTION sync_inventory_to_warehouse_locations()
RETURNS TEXT AS $$
DECLARE
    location_record RECORD;
    processed_count INTEGER := 0;
    error_count INTEGER := 0;
    existing_count INTEGER := 0;
    parts TEXT[];
    row_char TEXT;
    level_num INTEGER;
    position_num INTEGER;
    error_details TEXT := '';
BEGIN
    -- Loop through unique locations in inventory_items ที่มีรูปแบบถูกต้อง
    FOR location_record IN
        SELECT
            location,
            COUNT(*) as item_count,
            SUM(COALESCE(box_quantity, 0)) as total_boxes,
            SUM(COALESCE(loose_quantity, 0)) as total_loose
        FROM inventory_items
        WHERE location IS NOT NULL
          AND location != ''
          AND location ~ '^[A-Z]/[1-4]/\d{1,2}$'  -- รองรับทั้ง A/1/1 และ A/1/01
        GROUP BY location
        ORDER BY location
    LOOP
        BEGIN
            -- Normalize location format (pad single digit positions)
            parts := string_to_array(location_record.location, '/');
            row_char := parts[1];
            level_num := parts[2]::INTEGER;
            position_num := parts[3]::INTEGER;

            -- Create normalized location code
            DECLARE
                normalized_location TEXT;
            BEGIN
                normalized_location := row_char || '/' || level_num || '/' || LPAD(position_num::TEXT, 2, '0');

                -- Check if location already exists
                IF NOT EXISTS (SELECT 1 FROM warehouse_locations WHERE location_code = normalized_location) THEN
                    -- Insert new location
                    INSERT INTO warehouse_locations (
                        location_code, "row", "level", "position", location_type,
                        capacity_boxes, capacity_loose, description, user_id
                    ) VALUES (
                        normalized_location, row_char, level_num, position_num, 'shelf',

                        -- Set capacity based on current usage + buffer
                        GREATEST(location_record.total_boxes + 50, 100),  -- minimum 100
                        GREATEST(location_record.total_loose + 500, 1000), -- minimum 1000

                        'Synced from inventory: ' || location_record.item_count || ' items, ' ||
                        location_record.total_boxes || ' boxes, ' || location_record.total_loose || ' loose',
                        '00000000-0000-0000-0000-000000000000'::UUID
                    );

                    processed_count := processed_count + 1;
                ELSE
                    existing_count := existing_count + 1;
                END IF;
            END;

        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
            error_details := error_details || location_record.location || '(' || SQLERRM || '), ';
        END;
    END LOOP;

    RETURN 'Sync completed! New: ' || processed_count ||
           ', Existing: ' || existing_count ||
           ', Errors: ' || error_count ||
           CASE WHEN error_count > 0 THEN ' | Errors: ' || LEFT(error_details, 200) ELSE '' END;
END;
$$ LANGUAGE plpgsql;

-- Grant permission
GRANT EXECUTE ON FUNCTION sync_inventory_to_warehouse_locations() TO public;

-- ทดสอบการทำงาน
SELECT sync_inventory_to_warehouse_locations();