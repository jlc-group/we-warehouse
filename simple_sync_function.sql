-- Simple sync function ที่ทำงานง่ายๆ ก่อน

CREATE OR REPLACE FUNCTION sync_inventory_to_warehouse_locations()
RETURNS TEXT AS $$
DECLARE
    total_locations INTEGER;
    new_locations INTEGER := 0;
BEGIN
    -- Count existing locations
    SELECT COUNT(*) INTO total_locations FROM warehouse_locations;

    -- Insert sample locations if none exist
    IF total_locations = 0 THEN
        INSERT INTO warehouse_locations (
            location_code, "row", "level", "position", location_type,
            capacity_boxes, capacity_loose, description, user_id
        ) VALUES
        ('A/1/01', 'A', 1, 1, 'shelf', 100, 1000, 'Test location 1', '00000000-0000-0000-0000-000000000000'::UUID),
        ('A/1/02', 'A', 1, 2, 'shelf', 100, 1000, 'Test location 2', '00000000-0000-0000-0000-000000000000'::UUID),
        ('B/1/01', 'B', 1, 1, 'shelf', 100, 1000, 'Test location 3', '00000000-0000-0000-0000-000000000000'::UUID);

        new_locations := 3;
    END IF;

    -- Count final locations
    SELECT COUNT(*) INTO total_locations FROM warehouse_locations;

    RETURN 'Total locations: ' || total_locations || ', New locations added: ' || new_locations;
END;
$$ LANGUAGE plpgsql;

-- Grant permission
GRANT EXECUTE ON FUNCTION sync_inventory_to_warehouse_locations() TO public;