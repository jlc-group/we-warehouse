-- Migration: Add warehouse_id to location_qr_codes table
-- Description: Adds warehouse_id column to support multi-warehouse QR code system
-- Prerequisites: Requires migration 20251003_add_warehouse_to_locations.sql to be run first

-- Add warehouse_id column (nullable initially to allow existing records)
ALTER TABLE location_qr_codes
ADD COLUMN IF NOT EXISTS warehouse_id UUID;

-- Add foreign key constraint to warehouses table
ALTER TABLE location_qr_codes
ADD CONSTRAINT location_qr_codes_warehouse_id_fkey
FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_location_qr_codes_warehouse_id
ON location_qr_codes(warehouse_id);

-- Create compound index for warehouse_id + location lookups
CREATE INDEX IF NOT EXISTS idx_location_qr_codes_warehouse_location
ON location_qr_codes(warehouse_id, location);

-- Update existing QR codes to have warehouse_id based on their location
-- This attempts to match QR codes to warehouses via warehouse_locations table
-- Only run if warehouse_locations.warehouse_id column exists
DO $$
BEGIN
  -- Check if warehouse_locations has warehouse_id column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'warehouse_locations'
    AND column_name = 'warehouse_id'
  ) THEN
    -- Update QR codes with warehouse_id from warehouse_locations
    UPDATE location_qr_codes qr
    SET warehouse_id = wl.warehouse_id
    FROM warehouse_locations wl
    WHERE qr.location = wl.location_code
    AND qr.warehouse_id IS NULL;
  ELSE
    RAISE NOTICE 'Skipping warehouse_id update: warehouse_locations.warehouse_id column does not exist yet. Run migration 20251003 first.';
  END IF;
END $$;

-- For any remaining QR codes without warehouse_id, set to first warehouse as fallback
UPDATE location_qr_codes
SET warehouse_id = (SELECT id FROM warehouses ORDER BY created_at LIMIT 1)
WHERE warehouse_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN location_qr_codes.warehouse_id IS 'Foreign key to warehouses table - identifies which warehouse this QR code belongs to';
