-- Fix column naming inconsistency between inventory_items and product_conversion_rates
-- Problem: inventory_items uses "conversion_rate" but product_conversion_rates uses "rate"
-- Solution: Rename inventory_items columns to match product_conversion_rates naming

-- Step 1: Rename columns to use consistent naming (use "rate" like product_conversion_rates)
ALTER TABLE public.inventory_items
  RENAME COLUMN unit_level1_conversion_rate TO unit_level1_rate;

ALTER TABLE public.inventory_items
  RENAME COLUMN unit_level2_conversion_rate TO unit_level2_rate;

-- Step 2: Update computed column to use new names
ALTER TABLE public.inventory_items
  DROP COLUMN IF EXISTS total_base_quantity;

ALTER TABLE public.inventory_items
  ADD COLUMN total_base_quantity INTEGER GENERATED ALWAYS AS (
    COALESCE(unit_level1_quantity * unit_level1_rate, 0) +
    COALESCE(unit_level2_quantity * unit_level2_rate, 0) +
    COALESCE(unit_level3_quantity, 0)
  ) STORED;

-- Step 3: Update constraint to use new column names
ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS check_conversion_rates_positive;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT check_unit_rates_positive
  CHECK (
    unit_level1_rate >= 0 AND
    unit_level2_rate >= 0
  );

-- Step 4: Update comments
COMMENT ON COLUMN public.inventory_items.unit_level1_rate IS 'อัตราแปลงหน่วยระดับ 1: จำนวนชิ้นต่อ 1 หน่วยระดับ 1 (เช่น 1 ลัง = 240 ชิ้น)';
COMMENT ON COLUMN public.inventory_items.unit_level2_rate IS 'อัตราแปลงหน่วยระดับ 2: จำนวนชิ้นต่อ 1 หน่วยระดับ 2 (เช่น 1 กล่อง = 40 ชิ้น)';
COMMENT ON COLUMN public.inventory_items.total_base_quantity IS 'จำนวนรวมทั้งหมดในหน่วยฐาน (ชิ้น): คำนวณจาก (L1_qty * L1_rate) + (L2_qty * L2_rate) + L3_qty';

-- Step 5: Create indexes on new column names (drop old ones first)
DROP INDEX IF EXISTS idx_inventory_items_unit_level1_conversion_rate;
DROP INDEX IF EXISTS idx_inventory_items_unit_level2_conversion_rate;

CREATE INDEX IF NOT EXISTS idx_inventory_items_unit_level1_rate ON public.inventory_items(unit_level1_rate);
CREATE INDEX IF NOT EXISTS idx_inventory_items_unit_level2_rate ON public.inventory_items(unit_level2_rate);

-- Step 6: Verify and log changes
DO $$
DECLARE
  item_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO item_count FROM public.inventory_items;
  RAISE NOTICE 'Successfully renamed unit columns for % inventory items', item_count;
  RAISE NOTICE 'Column naming now consistent: unit_level1_rate, unit_level2_rate';
END $$;
