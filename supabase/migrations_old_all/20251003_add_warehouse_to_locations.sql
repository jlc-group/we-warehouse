-- Migration: Add warehouse_id to warehouse_locations table
-- Description: Link warehouse locations to specific warehouses for multi-warehouse support

-- Step 1: Add warehouse_id column (nullable initially)
ALTER TABLE public.warehouse_locations
ADD COLUMN IF NOT EXISTS warehouse_id UUID;

-- Step 2: Get default warehouse ID (assuming first warehouse or create default)
DO $$
DECLARE
  default_warehouse_id UUID;
BEGIN
  -- Get the first warehouse ID, or create a default one if none exists
  SELECT id INTO default_warehouse_id FROM public.warehouses ORDER BY created_at LIMIT 1;

  -- If no warehouse exists, create a default one
  IF default_warehouse_id IS NULL THEN
    INSERT INTO public.warehouses (name, code, description, is_active)
    VALUES ('คลังหลัก', 'MAIN', 'คลังสินค้าหลัก', true)
    RETURNING id INTO default_warehouse_id;
  END IF;

  -- Update existing records with default warehouse
  UPDATE public.warehouse_locations
  SET warehouse_id = default_warehouse_id
  WHERE warehouse_id IS NULL;
END $$;

-- Step 3: Make warehouse_id NOT NULL
ALTER TABLE public.warehouse_locations
ALTER COLUMN warehouse_id SET NOT NULL;

-- Step 4: Add foreign key constraint
ALTER TABLE public.warehouse_locations
ADD CONSTRAINT warehouse_locations_warehouse_id_fkey
FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id) ON DELETE CASCADE;

-- Step 5: Create index for better query performance
CREATE INDEX IF NOT EXISTS warehouse_locations_warehouse_id_idx
ON public.warehouse_locations(warehouse_id);

-- Step 6: Update unique constraint to include warehouse_id
-- Drop old unique constraint
ALTER TABLE public.warehouse_locations
DROP CONSTRAINT IF EXISTS warehouse_locations_location_code_key;

DROP INDEX IF EXISTS warehouse_locations_location_code_idx;

-- Create new unique constraint that includes warehouse_id
CREATE UNIQUE INDEX warehouse_locations_warehouse_location_unique_idx
ON public.warehouse_locations(warehouse_id, location_code);

-- Add comment
COMMENT ON COLUMN public.warehouse_locations.warehouse_id IS 'Reference to the warehouse this location belongs to';
