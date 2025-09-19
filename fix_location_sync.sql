-- 🔧 Fix Location Sync Issues
-- รันใน Supabase SQL Editor เพื่อแก้ไขปัญหาการซิงค์ข้อมูล

-- ==========================================
-- Phase 1: ตรวจสอบข้อมูลตำแหน่งปัจจุบัน
-- ==========================================

-- ดูตัวอย่างข้อมูล location ใน inventory_items
SELECT
  location,
  COUNT(*) as count
FROM public.inventory_items
WHERE location IS NOT NULL AND location != ''
GROUP BY location
ORDER BY count DESC
LIMIT 20;

-- ==========================================
-- Phase 2: สร้าง function ที่ยืดหยุ่นกว่าเดิม
-- ==========================================

CREATE OR REPLACE FUNCTION normalize_location_flexible(input_location TEXT)
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

    -- Try different patterns

    -- Pattern 1: A/1/01 (already correct)
    IF cleaned ~ '^[A-Z]/[1-4]/\d{2}$' THEN
        RETURN cleaned;
    END IF;

    -- Pattern 2: A/1/1 (need to pad position)
    IF cleaned ~ '^[A-Z]/[1-4]/\d{1}$' THEN
        parts := string_to_array(cleaned, '/');
        RETURN parts[1] || '/' || parts[2] || '/' || LPAD(parts[3], 2, '0');
    END IF;

    -- Pattern 3: A1-01, A1/01, A-1-01 (various separators)
    IF cleaned ~ '^[A-Z][-/]?[1-4][-/]\d{1,2}$' THEN
        -- Replace separators with /
        cleaned := REGEXP_REPLACE(cleaned, '[-]', '/', 'g');
        parts := string_to_array(cleaned, '/');
        IF array_length(parts, 1) = 3 THEN
            row_char := parts[1];
            level_num := parts[2]::INTEGER;
            position_num := parts[3]::INTEGER;
            RETURN row_char || '/' || level_num || '/' || LPAD(position_num::TEXT, 2, '0');
        END IF;
    END IF;

    -- Pattern 4: A101, A201 (row + level + position combined)
    IF cleaned ~ '^[A-Z]\d{3}$' THEN
        row_char := SUBSTRING(cleaned, 1, 1);
        level_num := SUBSTRING(cleaned, 2, 1)::INTEGER;
        position_num := SUBSTRING(cleaned, 3, 2)::INTEGER;
        IF level_num BETWEEN 1 AND 4 AND position_num BETWEEN 1 AND 99 THEN
            RETURN row_char || '/' || level_num || '/' || LPAD(position_num::TEXT, 2, '0');
        END IF;
    END IF;

    -- Pattern 5: A11, A21 (row + level + single digit position)
    IF cleaned ~ '^[A-Z]\d{2}$' THEN
        row_char := SUBSTRING(cleaned, 1, 1);
        level_num := SUBSTRING(cleaned, 2, 1)::INTEGER;
        position_num := SUBSTRING(cleaned, 3, 1)::INTEGER;
        IF level_num BETWEEN 1 AND 4 AND position_num BETWEEN 1 AND 9 THEN
            RETURN row_char || '/' || level_num || '/' || LPAD(position_num::TEXT, 2, '0');
        END IF;
    END IF;

    -- Pattern 6: Try to split by any separator and extract parts
    parts := REGEXP_SPLIT_TO_ARRAY(cleaned, '[^A-Z0-9]+');
    IF array_length(parts, 1) >= 2 THEN
        -- First part should be row
        row_char := SUBSTRING(parts[1], '[A-Z]');
        -- Extract numbers from remaining parts
        FOR i IN 1..array_length(parts, 1) LOOP
            -- Look for level (1-4)
            IF parts[i] ~ '^\d+$' AND parts[i]::INTEGER BETWEEN 1 AND 4 AND level_num IS NULL THEN
                level_num := parts[i]::INTEGER;
            -- Look for position (1-99)
            ELSIF parts[i] ~ '^\d+$' AND parts[i]::INTEGER BETWEEN 1 AND 99 AND position_num IS NULL THEN
                position_num := parts[i]::INTEGER;
            END IF;
        END LOOP;

        -- If we have all parts, format them
        IF row_char IS NOT NULL AND level_num IS NOT NULL AND position_num IS NOT NULL THEN
            RETURN row_char || '/' || level_num || '/' || LPAD(position_num::TEXT, 2, '0');
        END IF;
    END IF;

    -- If nothing worked, return original
    RETURN input_location;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Phase 3: สร้าง function ซิงค์ข้อมูลที่ปรับปรุงแล้ว
-- ==========================================

CREATE OR REPLACE FUNCTION sync_inventory_to_warehouse_locations_improved()
RETURNS TEXT AS $$
DECLARE
    location_record RECORD;
    processed_count INTEGER := 0;
    error_count INTEGER := 0;
    normalized_location TEXT;
    parts TEXT[];
    row_char TEXT;
    level_num INTEGER;
    position_num INTEGER;
    error_details TEXT := '';
BEGIN
    -- Loop through unique locations in inventory_items
    FOR location_record IN
        SELECT DISTINCT location, COUNT(*) as item_count
        FROM public.inventory_items
        WHERE location IS NOT NULL AND location != ''
        GROUP BY location
    LOOP
        BEGIN
            -- Try to normalize the location
            normalized_location := normalize_location_flexible(location_record.location);

            -- Validate the normalized location
            IF normalized_location ~ '^[A-Z]/[1-4]/\d{2}$' THEN
                -- Check if already exists
                IF NOT EXISTS (SELECT 1 FROM public.warehouse_locations WHERE location_code = normalized_location) THEN
                    -- Parse components
                    parts := string_to_array(normalized_location, '/');
                    row_char := parts[1];
                    level_num := parts[2]::INTEGER;
                    position_num := parts[3]::INTEGER;

                    -- Insert new location
                    INSERT INTO public.warehouse_locations (
                        location_code, row, level, position, location_type,
                        capacity_boxes, capacity_loose, description
                    ) VALUES (
                        normalized_location, row_char, level_num, position_num, 'shelf',
                        100, 1000, 'Auto-synced from inventory: ' || location_record.location || ' (' || location_record.item_count || ' items)'
                    );

                    processed_count := processed_count + 1;
                ELSE
                    -- Already exists, count as processed
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

    RETURN 'Processed: ' || processed_count || ', Errors: ' || error_count ||
           CASE WHEN error_count > 0 THEN ' | Examples: ' || LEFT(error_details, 200) ELSE '' END;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Phase 4: เพิ่มข้อมูลตัวอย่าง standard locations
-- ==========================================

INSERT INTO public.warehouse_locations (
    location_code, row, level, position, location_type, capacity_boxes, capacity_loose, description
) VALUES
('A/1/01', 'A', 1, 1, 'shelf', 100, 1000, 'ชั้นวางแถว A ชั้น 1 ตำแหน่ง 1'),
('A/1/02', 'A', 1, 2, 'shelf', 100, 1000, 'ชั้นวางแถว A ชั้น 1 ตำแหน่ง 2'),
('A/2/01', 'A', 2, 1, 'shelf', 150, 1500, 'ชั้นวางแถว A ชั้น 2 ตำแหน่ง 1'),
('B/1/01', 'B', 1, 1, 'shelf', 100, 1000, 'ชั้นวางแถว B ชั้น 1 ตำแหน่ง 1'),
('C/1/01', 'C', 1, 1, 'shelf', 100, 1000, 'ชั้นวางแถว C ชั้น 1 ตำแหน่ง 1'),
('D/1/01', 'D', 1, 1, 'shelf', 100, 1000, 'ชั้นวางแถว D ชั้น 1 ตำแหน่ง 1'),
('F/1/01', 'F', 1, 1, 'floor', 500, 5000, 'พื้นเก็บแถว F ตำแหน่ง 1')
ON CONFLICT (location_code) DO NOTHING;

-- ==========================================
-- Phase 5: Grant permissions
-- ==========================================

GRANT EXECUTE ON FUNCTION normalize_location_flexible(TEXT) TO public;
GRANT EXECUTE ON FUNCTION sync_inventory_to_warehouse_locations_improved() TO public;

-- ==========================================
-- Phase 6: Test the improved sync
-- ==========================================

SELECT 'Setup completed! Now run: SELECT sync_inventory_to_warehouse_locations_improved();' as status;