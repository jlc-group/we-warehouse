-- Migration script: Standardize location format to A1/1 ... A20/4
-- This script updates all location formats to the new standard

-- First, create a backup table
CREATE TABLE IF NOT EXISTS inventory_items_backup AS
SELECT * FROM inventory_items;

-- Create a function to normalize locations to new format
CREATE OR REPLACE FUNCTION normalize_location_to_new_format(location_input TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Return empty string for null or empty input
  IF location_input IS NULL OR TRIM(location_input) = '' THEN
    RETURN '';
  END IF;

  -- Clean and uppercase the input
  location_input := UPPER(TRIM(location_input));

  -- If already in target format A1/1, return as-is
  IF location_input ~ '^[A-N][1-4]/([1-9]|1[0-9]|20)$' THEN
    RETURN location_input;
  END IF;

  -- Handle legacy A/1/1 format - convert to A1/1
  IF location_input ~ '^[A-N]/[1-4]/([1-9]|1[0-9]|20)$' THEN
    DECLARE
      parts TEXT[];
      row_part TEXT;
      level_part TEXT;
      position_part TEXT;
    BEGIN
      parts := string_to_array(location_input, '/');
      row_part := parts[1];
      level_part := parts[2];
      position_part := parts[3];

      RETURN row_part || level_part || '/' || position_part;
    END;
  END IF;

  -- Handle A/1/01 format (zero-padded) - convert to A1/1
  IF location_input ~ '^[A-N]/[1-4]/0?([1-9]|1[0-9]|20)$' THEN
    DECLARE
      parts TEXT[];
      row_part TEXT;
      level_part TEXT;
      position_part TEXT;
      position_num INTEGER;
    BEGIN
      parts := string_to_array(location_input, '/');
      row_part := parts[1];
      level_part := parts[2];
      position_part := parts[3];
      position_num := position_part::INTEGER;

      RETURN row_part || level_part || '/' || position_num::TEXT;
    END;
  END IF;

  -- Handle concatenated formats like A101, A11
  IF location_input ~ '^[A-N][0-9]{2,3}$' THEN
    DECLARE
      row_part TEXT;
      numbers_part TEXT;
      level_part INTEGER;
      position_part INTEGER;
    BEGIN
      row_part := substr(location_input, 1, 1);
      numbers_part := substr(location_input, 2);

      -- Try A11 format first
      IF length(numbers_part) = 2 THEN
        level_part := substr(numbers_part, 1, 1)::INTEGER;
        position_part := substr(numbers_part, 2, 1)::INTEGER;

        IF level_part BETWEEN 1 AND 4 AND position_part BETWEEN 1 AND 20 THEN
          RETURN row_part || level_part::TEXT || '/' || position_part::TEXT;
        END IF;
      END IF;

      -- Try A101 format
      IF length(numbers_part) = 3 THEN
        level_part := substr(numbers_part, 1, 1)::INTEGER;
        position_part := substr(numbers_part, 2)::INTEGER;

        IF level_part BETWEEN 1 AND 4 AND position_part BETWEEN 1 AND 20 THEN
          RETURN row_part || level_part::TEXT || '/' || position_part::TEXT;
        END IF;
      END IF;
    END;
  END IF;

  -- If we can't normalize, return the original
  RETURN location_input;
END;
$$ LANGUAGE plpgsql;

-- Update all inventory_items to use new location format
UPDATE inventory_items
SET location = normalize_location_to_new_format(location)
WHERE location IS NOT NULL AND location != '';

-- Update warehouse_locations table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_locations') THEN
    -- Update location_code column
    UPDATE warehouse_locations
    SET location_code = normalize_location_to_new_format(location_code)
    WHERE location_code IS NOT NULL AND location_code != '';
  END IF;
END $$;

-- Update location_qr_codes table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'location_qr_codes') THEN
    -- Update location column
    UPDATE location_qr_codes
    SET location = normalize_location_to_new_format(location)
    WHERE location IS NOT NULL AND location != '';
  END IF;
END $$;

-- Create or update constraints for new format
DO $$
BEGIN
  -- Drop old constraints if they exist
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'warehouse_locations_location_code_check') THEN
    ALTER TABLE warehouse_locations DROP CONSTRAINT warehouse_locations_location_code_check;
  END IF;

  -- Add new constraint for A1/1 format
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_locations') THEN
    ALTER TABLE warehouse_locations
    ADD CONSTRAINT warehouse_locations_location_code_check
    CHECK (location_code ~ '^[A-N][1-4]/([1-9]|1[0-9]|20)$');
  END IF;
END $$;

-- Update sample data in warehouse_locations to new format
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse_locations') THEN
    -- Delete old sample data
    DELETE FROM warehouse_locations WHERE location_code IN ('A/1/01', 'A/1/02', 'A/2/01', 'B/1/01', 'F/1/01');

    -- Insert new sample data with correct format
    INSERT INTO warehouse_locations (location_code, row, level, position, location_type, capacity_boxes, capacity_loose, description) VALUES
    ('A1/1', 'A', 1, 1, 'shelf', 100, 1000, 'ชั้นวางแถว A ชั้น 1 ตำแหน่ง 1'),
    ('A1/2', 'A', 1, 2, 'shelf', 100, 1000, 'ชั้นวางแถว A ชั้น 1 ตำแหน่ง 2'),
    ('A2/1', 'A', 2, 1, 'shelf', 150, 1500, 'ชั้นวางแถว A ชั้น 2 ตำแหน่ง 1'),
    ('B1/1', 'B', 1, 1, 'shelf', 100, 1000, 'ชั้นวางแถว B ชั้น 1 ตำแหน่ง 1'),
    ('F1/1', 'F', 1, 1, 'floor', 500, 5000, 'พื้นเก็บแถว F ตำแหน่ง 1')
    ON CONFLICT (location_code) DO NOTHING;
  END IF;
END $$;

-- Verify the migration results
SELECT 'inventory_items' as table_name, COUNT(*) as total_records,
       COUNT(CASE WHEN location ~ '^[A-N][1-4]/([1-9]|1[0-9]|20)$' THEN 1 END) as new_format_count,
       COUNT(CASE WHEN location !~ '^[A-N][1-4]/([1-9]|1[0-9]|20)$' AND location IS NOT NULL AND location != '' THEN 1 END) as old_format_count
FROM inventory_items
WHERE location IS NOT NULL AND location != '';

-- Show sample of updated locations
SELECT 'Sample updated locations:' as info;
SELECT DISTINCT location
FROM inventory_items
WHERE location IS NOT NULL AND location != ''
ORDER BY location
LIMIT 20;

-- Clean up the normalization function (optional - keep it for future use)
-- DROP FUNCTION IF EXISTS normalize_location_to_new_format(TEXT);

COMMENT ON FUNCTION normalize_location_to_new_format(TEXT) IS 'Converts legacy location formats to new A1/1 standard format';