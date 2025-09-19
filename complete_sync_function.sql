-- Complete sync function ที่รองรับ location format หลากหลายและแสดงข้อมูลจริง

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

-- Main sync function
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
            -- Normalize location format
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

                    existing_count := existing_count + 1;
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

    -- Note: warehouse_locations_with_inventory is a regular view, not materialized, so no refresh needed

    RETURN 'Sync completed! ' ||
           'New: ' || processed_count ||
           ', Updated: ' || existing_count ||
           ', Errors: ' || error_count ||
           CASE WHEN error_count > 0 THEN ' | Sample errors: ' || LEFT(error_details, 200) ELSE '' END;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION normalize_location_format(TEXT) TO public;
GRANT EXECUTE ON FUNCTION sync_inventory_to_warehouse_locations() TO public;

-- Test the functions
SELECT 'Testing normalize_location_format:' as test;
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

-- Test with real inventory data sample
SELECT 'Sample inventory locations:' as test;
SELECT DISTINCT
    location as original,
    normalize_location_format(location) as normalized,
    COUNT(*) as item_count
FROM inventory_items
WHERE location IS NOT NULL AND location != ''
GROUP BY location, normalize_location_format(location)
ORDER BY normalize_location_format(location)
LIMIT 20;

-- Run the sync
SELECT sync_inventory_to_warehouse_locations();