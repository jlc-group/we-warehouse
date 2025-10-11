-- Migration: Populate unit_level quantities for existing inventory items
-- Description: Calculate and populate unit_level1_quantity, unit_level2_quantity, unit_level3_quantity
--              for inventory items that have quantity_pieces but missing unit-level quantities

-- Update inventory items that have quantity_pieces but missing unit quantities
UPDATE public.inventory_items
SET
  unit_level1_quantity = FLOOR(quantity_pieces / COALESCE(NULLIF(unit_level1_rate, 0), 1)),
  unit_level2_quantity = FLOOR((quantity_pieces % COALESCE(NULLIF(unit_level1_rate, 0), 1)) / COALESCE(NULLIF(unit_level2_rate, 0), 1)),
  unit_level3_quantity = (quantity_pieces % COALESCE(NULLIF(unit_level1_rate, 0), 1)) % COALESCE(NULLIF(unit_level2_rate, 0), 1)
WHERE
  quantity_pieces > 0
  AND (unit_level1_quantity IS NULL OR unit_level1_quantity = 0)
  AND (unit_level2_quantity IS NULL OR unit_level2_quantity = 0)
  AND (unit_level3_quantity IS NULL OR unit_level3_quantity = 0);

-- Create a trigger function to automatically calculate unit quantities when quantity_pieces is updated
CREATE OR REPLACE FUNCTION calculate_unit_quantities()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-calculate if unit quantities are not explicitly provided
  IF (NEW.unit_level1_quantity IS NULL OR NEW.unit_level1_quantity = 0) AND
     (NEW.unit_level2_quantity IS NULL OR NEW.unit_level2_quantity = 0) AND
     (NEW.unit_level3_quantity IS NULL OR NEW.unit_level3_quantity = 0) AND
     NEW.quantity_pieces > 0 THEN

    NEW.unit_level1_quantity := FLOOR(NEW.quantity_pieces / COALESCE(NULLIF(NEW.unit_level1_rate, 0), 1));
    NEW.unit_level2_quantity := FLOOR((NEW.quantity_pieces % COALESCE(NULLIF(NEW.unit_level1_rate, 0), 1)) / COALESCE(NULLIF(NEW.unit_level2_rate, 0), 1));
    NEW.unit_level3_quantity := (NEW.quantity_pieces % COALESCE(NULLIF(NEW.unit_level1_rate, 0), 1)) % COALESCE(NULLIF(NEW.unit_level2_rate, 0), 1);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate unit quantities on INSERT and UPDATE
DROP TRIGGER IF EXISTS auto_calculate_unit_quantities ON public.inventory_items;
CREATE TRIGGER auto_calculate_unit_quantities
  BEFORE INSERT OR UPDATE OF quantity_pieces ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION calculate_unit_quantities();

-- Add comment
COMMENT ON FUNCTION calculate_unit_quantities() IS 'Automatically calculates unit_level quantities from quantity_pieces when unit quantities are not provided';
