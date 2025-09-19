-- 🚀 Database Relationships และ Constraints Setup
-- รันใน Supabase SQL Editor เพื่อสร้างความเชื่อมโยงที่สมบูรณ์

-- ==========================================
-- Phase 1: Create Missing Tables (if needed)
-- ==========================================

-- Ensure warehouse_locations table exists
CREATE TABLE IF NOT EXISTS public.warehouse_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_code TEXT NOT NULL UNIQUE,
  row TEXT NOT NULL,
  level INTEGER NOT NULL,
  position INTEGER NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'shelf',
  capacity_boxes INTEGER DEFAULT 100,
  capacity_loose INTEGER DEFAULT 1000,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID
);

-- ==========================================
-- Phase 2: Add Indexes สำหรับ Performance
-- ==========================================

-- Unique index สำหรับ warehouse_locations.location_code
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_locations_location_code_idx
ON public.warehouse_locations(location_code);

-- Index สำหรับ inventory_items.location
CREATE INDEX IF NOT EXISTS inventory_items_location_idx
ON public.inventory_items(location);

-- Index สำหรับ location_qr_codes.location
CREATE INDEX IF NOT EXISTS location_qr_codes_location_idx
ON public.location_qr_codes(location);

-- Composite index สำหรับ warehouse_locations (row, level, position)
CREATE INDEX IF NOT EXISTS warehouse_locations_position_idx
ON public.warehouse_locations(row, level, position);

-- ==========================================
-- Phase 3: Add Foreign Key Constraints
-- ==========================================

-- เพิ่ม Foreign Key จาก inventory_items.location → warehouse_locations.location_code
-- (ต้องระวัง: อาจมี data ที่ไม่ match - จะ handle ใน application layer)
/*
ALTER TABLE public.inventory_items
ADD CONSTRAINT fk_inventory_location
FOREIGN KEY (location) REFERENCES public.warehouse_locations(location_code)
ON DELETE RESTRICT ON UPDATE CASCADE;
*/

-- เพิ่ม Foreign Key จาก location_qr_codes.location → warehouse_locations.location_code
/*
ALTER TABLE public.location_qr_codes
ADD CONSTRAINT fk_qr_location
FOREIGN KEY (location) REFERENCES public.warehouse_locations(location_code)
ON DELETE CASCADE ON UPDATE CASCADE;
*/

-- Note: Foreign Keys ถูก comment ไว้เพราะอาจมี existing data ที่ไม่ match
-- จะเปิดใช้หลังจาก data migration เสร็จสิ้น

-- ==========================================
-- Phase 4: Add Validation Constraints
-- ==========================================

-- Validation สำหรับ warehouse_locations
DO $$
BEGIN
  -- Row format validation (A-Z)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_warehouse_row_format') THEN
    ALTER TABLE public.warehouse_locations
    ADD CONSTRAINT check_warehouse_row_format
    CHECK (row ~ '^[A-Z]$');
  END IF;

  -- Level range validation (1-4)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_warehouse_level_range') THEN
    ALTER TABLE public.warehouse_locations
    ADD CONSTRAINT check_warehouse_level_range
    CHECK (level BETWEEN 1 AND 4);
  END IF;

  -- Position range validation (1-99)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_warehouse_position_range') THEN
    ALTER TABLE public.warehouse_locations
    ADD CONSTRAINT check_warehouse_position_range
    CHECK (position BETWEEN 1 AND 99);
  END IF;

  -- Location type validation
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_warehouse_location_type') THEN
    ALTER TABLE public.warehouse_locations
    ADD CONSTRAINT check_warehouse_location_type
    CHECK (location_type IN ('shelf', 'floor', 'special'));
  END IF;

  -- Capacity validation
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_warehouse_capacity') THEN
    ALTER TABLE public.warehouse_locations
    ADD CONSTRAINT check_warehouse_capacity
    CHECK (capacity_boxes >= 0 AND capacity_loose >= 0);
  END IF;

  -- Location code format validation (A/1/01 pattern)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_warehouse_location_code_format') THEN
    ALTER TABLE public.warehouse_locations
    ADD CONSTRAINT check_warehouse_location_code_format
    CHECK (location_code ~ '^[A-Z]\/[1-4]\/\d{2}$');
  END IF;
END $$;

-- ==========================================
-- Phase 5: Create RLS Policies
-- ==========================================

-- Enable RLS สำหรับ warehouse_locations
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Enable all access for warehouse_locations" ON public.warehouse_locations;

-- Create policy สำหรับ warehouse_locations
CREATE POLICY "Enable all access for warehouse_locations"
ON public.warehouse_locations FOR ALL TO public USING (true);

-- ==========================================
-- Phase 6: Create Trigger Functions สำหรับ Auto-Sync
-- ==========================================

-- Function เพื่อ auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger สำหรับ warehouse_locations.updated_at
DROP TRIGGER IF EXISTS update_warehouse_locations_updated_at ON public.warehouse_locations;
CREATE TRIGGER update_warehouse_locations_updated_at
    BEFORE UPDATE ON public.warehouse_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function เพื่อ auto-create warehouse_location เมื่อมี inventory ใหม่
CREATE OR REPLACE FUNCTION auto_create_warehouse_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if location already exists in warehouse_locations
    IF NOT EXISTS (
        SELECT 1 FROM public.warehouse_locations
        WHERE location_code = NEW.location
    ) THEN
        -- Parse location parts (assuming format like A/1/01)
        DECLARE
            location_parts TEXT[];
            row_char TEXT;
            level_num INTEGER;
            position_num INTEGER;
        BEGIN
            -- Split location by '/'
            location_parts := string_to_array(NEW.location, '/');

            -- Validate format
            IF array_length(location_parts, 1) = 3 THEN
                row_char := location_parts[1];
                level_num := location_parts[2]::INTEGER;
                position_num := location_parts[3]::INTEGER;

                -- Validate ranges
                IF row_char ~ '^[A-Z]$' AND level_num BETWEEN 1 AND 4 AND position_num BETWEEN 1 AND 99 THEN
                    -- Insert new warehouse location
                    INSERT INTO public.warehouse_locations (
                        location_code, row, level, position, location_type,
                        capacity_boxes, capacity_loose, description, user_id
                    ) VALUES (
                        NEW.location, row_char, level_num, position_num, 'shelf',
                        100, 1000, 'Auto-created from inventory', NEW.user_id
                    );
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore errors in auto-creation
            NULL;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger สำหรับ auto-create warehouse_location
DROP TRIGGER IF EXISTS trigger_auto_create_warehouse_location ON public.inventory_items;
CREATE TRIGGER trigger_auto_create_warehouse_location
    AFTER INSERT ON public.inventory_items
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_warehouse_location();

-- ==========================================
-- Phase 7: Create Utility Functions
-- ==========================================

-- Function เพื่อ sync existing inventory locations to warehouse_locations
CREATE OR REPLACE FUNCTION sync_inventory_to_warehouse_locations()
RETURNS TEXT AS $$
DECLARE
    location_record RECORD;
    processed_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    -- Loop through unique locations in inventory_items
    FOR location_record IN
        SELECT DISTINCT location
        FROM public.inventory_items
        WHERE location IS NOT NULL
        AND location != ''
    LOOP
        BEGIN
            -- Try to create warehouse location
            PERFORM auto_create_warehouse_location_direct(location_record.location);
            processed_count := processed_count + 1;
        EXCEPTION WHEN OTHERS THEN
            error_count := error_count + 1;
        END;
    END LOOP;

    RETURN 'Processed: ' || processed_count || ', Errors: ' || error_count;
END;
$$ LANGUAGE plpgsql;

-- Helper function สำหรับ direct creation
CREATE OR REPLACE FUNCTION auto_create_warehouse_location_direct(location_code TEXT)
RETURNS VOID AS $$
DECLARE
    location_parts TEXT[];
    row_char TEXT;
    level_num INTEGER;
    position_num INTEGER;
BEGIN
    -- Check if already exists
    IF EXISTS (SELECT 1 FROM public.warehouse_locations WHERE location_code = $1) THEN
        RETURN;
    END IF;

    -- Parse location
    location_parts := string_to_array(location_code, '/');

    IF array_length(location_parts, 1) = 3 THEN
        row_char := location_parts[1];
        level_num := location_parts[2]::INTEGER;
        position_num := location_parts[3]::INTEGER;

        -- Validate and insert
        IF row_char ~ '^[A-Z]$' AND level_num BETWEEN 1 AND 4 AND position_num BETWEEN 1 AND 99 THEN
            INSERT INTO public.warehouse_locations (
                location_code, row, level, position, location_type,
                capacity_boxes, capacity_loose, description
            ) VALUES (
                location_code, row_char, level_num, position_num, 'shelf',
                100, 1000, 'Synced from existing inventory'
            );
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- Phase 8: Grant Permissions
-- ==========================================

-- Grant permissions to public role
GRANT ALL ON public.warehouse_locations TO public;
GRANT EXECUTE ON FUNCTION auto_create_warehouse_location() TO public;
GRANT EXECUTE ON FUNCTION auto_create_warehouse_location_direct(TEXT) TO public;
GRANT EXECUTE ON FUNCTION sync_inventory_to_warehouse_locations() TO public;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO public;

-- ==========================================
-- Completion Message
-- ==========================================

SELECT 'Database relationships and constraints setup completed! Run sync_inventory_to_warehouse_locations() to populate data.' as status;