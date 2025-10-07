-- Add multi-level unit system to inventory_items
-- This migration adds support for 3-level unit hierarchy (e.g., ลัง -> กล่อง -> ชิ้น)

-- Add new columns for multi-level unit system
ALTER TABLE public.inventory_items
ADD COLUMN unit_level1_name TEXT DEFAULT NULL,  -- e.g., "ลัง"
ADD COLUMN unit_level1_quantity INTEGER DEFAULT 0,
ADD COLUMN unit_level1_conversion_rate INTEGER DEFAULT 0, -- How many level3 units in 1 level1 unit

ADD COLUMN unit_level2_name TEXT DEFAULT NULL,  -- e.g., "กล่อง"
ADD COLUMN unit_level2_quantity INTEGER DEFAULT 0,
ADD COLUMN unit_level2_conversion_rate INTEGER DEFAULT 0, -- How many level3 units in 1 level2 unit

ADD COLUMN unit_level3_name TEXT DEFAULT 'ชิ้น',  -- Base unit, e.g., "ชิ้น"
ADD COLUMN unit_level3_quantity INTEGER DEFAULT 0, -- Direct count of base units

-- Computed column for total quantity in base units
ADD COLUMN total_base_quantity INTEGER GENERATED ALWAYS AS (
  COALESCE(unit_level1_quantity * unit_level1_conversion_rate, 0) +
  COALESCE(unit_level2_quantity * unit_level2_conversion_rate, 0) +
  COALESCE(unit_level3_quantity, 0)
) STORED;

-- Add constraints
ALTER TABLE public.inventory_items
ADD CONSTRAINT check_unit_quantities_positive
CHECK (
  unit_level1_quantity >= 0 AND
  unit_level2_quantity >= 0 AND
  unit_level3_quantity >= 0
);

ALTER TABLE public.inventory_items
ADD CONSTRAINT check_conversion_rates_positive
CHECK (
  unit_level1_conversion_rate >= 0 AND
  unit_level2_conversion_rate >= 0
);

-- Add indexes for performance
CREATE INDEX idx_inventory_items_total_base_quantity ON public.inventory_items(total_base_quantity);
CREATE INDEX idx_inventory_items_unit_level1_name ON public.inventory_items(unit_level1_name);
CREATE INDEX idx_inventory_items_unit_level2_name ON public.inventory_items(unit_level2_name);

-- Migration function to convert existing data
-- This will map existing box_quantity and loose_quantity to the new system
DO $$
BEGIN
  -- Update existing records to use new unit system
  -- Map box_quantity to level2 (กล่อง) and loose_quantity to level3 (ชิ้น)
  UPDATE public.inventory_items
  SET
    unit_level2_name = 'กล่อง',
    unit_level2_quantity = box_quantity,
    unit_level2_conversion_rate = CASE WHEN box_quantity > 0 THEN 1 ELSE 0 END, -- Default conversion, will need manual adjustment
    unit_level3_name = 'ชิ้น',
    unit_level3_quantity = loose_quantity
  WHERE
    unit_level2_name IS NULL AND unit_level3_name IS NULL;

  RAISE NOTICE 'Migrated % existing inventory items to new unit system',
    (SELECT COUNT(*) FROM public.inventory_items);
END $$;

-- Add comment explaining the system
COMMENT ON COLUMN public.inventory_items.unit_level1_name IS 'Name of the largest unit (e.g., ลัง, หีบ)';
COMMENT ON COLUMN public.inventory_items.unit_level1_quantity IS 'Quantity of level 1 units';
COMMENT ON COLUMN public.inventory_items.unit_level1_conversion_rate IS 'How many base units (level 3) in one level 1 unit';

COMMENT ON COLUMN public.inventory_items.unit_level2_name IS 'Name of the middle unit (e.g., กล่อง, แพ็ค)';
COMMENT ON COLUMN public.inventory_items.unit_level2_quantity IS 'Quantity of level 2 units';
COMMENT ON COLUMN public.inventory_items.unit_level2_conversion_rate IS 'How many base units (level 3) in one level 2 unit';

COMMENT ON COLUMN public.inventory_items.unit_level3_name IS 'Name of the base unit (e.g., ชิ้น, หลวม)';
COMMENT ON COLUMN public.inventory_items.unit_level3_quantity IS 'Quantity of base units';

COMMENT ON COLUMN public.inventory_items.total_base_quantity IS 'Computed total quantity in base units: (L1_qty * L1_rate) + (L2_qty * L2_rate) + L3_qty';

-- Create a view for easier querying
CREATE OR REPLACE VIEW inventory_items_with_units AS
SELECT
  *,
  CASE
    WHEN unit_level1_quantity > 0 THEN
      unit_level1_quantity::TEXT || ' ' || COALESCE(unit_level1_name, 'ลัง')
    ELSE ''
  END as level1_display,
  CASE
    WHEN unit_level2_quantity > 0 THEN
      unit_level2_quantity::TEXT || ' ' || COALESCE(unit_level2_name, 'กล่อง')
    ELSE ''
  END as level2_display,
  CASE
    WHEN unit_level3_quantity > 0 THEN
      unit_level3_quantity::TEXT || ' ' || COALESCE(unit_level3_name, 'ชิ้น')
    ELSE ''
  END as level3_display,
  -- Combined display string
  TRIM(CONCAT_WS(' + ',
    NULLIF(CASE WHEN unit_level1_quantity > 0 THEN unit_level1_quantity::TEXT || ' ' || COALESCE(unit_level1_name, 'ลัง') ELSE '' END, ''),
    NULLIF(CASE WHEN unit_level2_quantity > 0 THEN unit_level2_quantity::TEXT || ' ' || COALESCE(unit_level2_name, 'กล่อง') ELSE '' END, ''),
    NULLIF(CASE WHEN unit_level3_quantity > 0 THEN unit_level3_quantity::TEXT || ' ' || COALESCE(unit_level3_name, 'ชิ้น') ELSE '' END, '')
  )) as units_display
FROM public.inventory_items;

SELECT 'Multi-level unit system migration completed successfully!' as status;