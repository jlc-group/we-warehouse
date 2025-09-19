-- เพิ่ม sync function สำหรับ sync inventory locations ไปยัง warehouse_locations

CREATE OR REPLACE FUNCTION sync_inventory_to_warehouse_locations()
RETURNS TEXT AS $$
DECLARE
    location_record RECORD;
    processed_count INTEGER := 0;
    error_count INTEGER := 0;
    parts TEXT[];
    row_char TEXT;
    level_num INTEGER;
    position_num INTEGER;
BEGIN
    -- Loop through unique locations in inventory_items
    FOR location_record IN
        SELECT DISTINCT location, COUNT(*) as item_count
        FROM inventory_items
        WHERE location IS NOT NULL AND location != ''
        GROUP BY location
    LOOP
        BEGIN
            -- Check if location already exists
            IF NOT EXISTS (SELECT 1 FROM warehouse_locations WHERE location_code = location_record.location) THEN
                -- Try to parse location format (A/1/01)
                IF location_record.location ~ '^[A-Z]/[1-4]/\d{2}$' THEN
                    parts := string_to_array(location_record.location, '/');
                    row_char := parts[1];
                    level_num := parts[2]::INTEGER;
                    position_num := parts[3]::INTEGER;

                    -- Insert new location
                    INSERT INTO warehouse_locations (
                        location_code, "row", "level", "position", location_type,
                        capacity_boxes, capacity_loose, description, user_id
                    ) VALUES (
                        location_record.location, row_char, level_num, position_num, 'shelf',
                        100, 1000, 'Auto-synced from inventory: ' || location_record.item_count || ' items',
                        '00000000-0000-0000-0000-000000000000'::UUID
                    );

                    processed_count := processed_count + 1;
                ELSE
                    error_count := error_count + 1;
                END IF;
            ELSE
                processed_count := processed_count + 1;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
        END;
    END LOOP;

    RETURN 'Processed: ' || processed_count || ', Errors: ' || error_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permission
GRANT EXECUTE ON FUNCTION sync_inventory_to_warehouse_locations() TO public;