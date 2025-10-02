-- ===================================
-- 🔧 Fix Missing total_base_quantity Column
-- ===================================

-- Step 1: Create the computed column
ALTER TABLE public.inventory_items
  DROP COLUMN IF EXISTS total_base_quantity;

ALTER TABLE public.inventory_items
  ADD COLUMN total_base_quantity INTEGER GENERATED ALWAYS AS (
    COALESCE(unit_level1_quantity * unit_level1_rate, 0) +
    COALESCE(unit_level2_quantity * unit_level2_rate, 0) +
    COALESCE(unit_level3_quantity, 0)
  ) STORED;

-- Step 2: Run sync function to update conversion rates
DO $$
DECLARE
  result INTEGER;
BEGIN
  -- Check if function exists first
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'sync_inventory_conversion_rates'
  ) THEN
    result := sync_inventory_conversion_rates();
    RAISE NOTICE '✅ Synced % inventory items', result;
  ELSE
    RAISE NOTICE 'ℹ️  Sync function not found - creating it now';

    -- Create the sync function
    CREATE OR REPLACE FUNCTION sync_inventory_conversion_rates()
    RETURNS INTEGER AS $func$
    DECLARE
      updated_count INTEGER := 0;
    BEGIN
      UPDATE public.inventory_items AS inv
      SET
        unit_level1_name = pcr.unit_level1_name,
        unit_level1_rate = pcr.unit_level1_rate,
        unit_level2_name = pcr.unit_level2_name,
        unit_level2_rate = pcr.unit_level2_rate,
        unit_level3_name = pcr.unit_level3_name
      FROM public.product_conversion_rates AS pcr
      WHERE inv.sku = pcr.sku
        AND (
          inv.unit_level1_name IS DISTINCT FROM pcr.unit_level1_name OR
          inv.unit_level1_rate IS DISTINCT FROM pcr.unit_level1_rate OR
          inv.unit_level2_name IS DISTINCT FROM pcr.unit_level2_name OR
          inv.unit_level2_rate IS DISTINCT FROM pcr.unit_level2_rate OR
          inv.unit_level3_name IS DISTINCT FROM pcr.unit_level3_name
        );

      GET DIAGNOSTICS updated_count = ROW_COUNT;
      RETURN updated_count;
    END;
    $func$ LANGUAGE plpgsql;

    -- Run it
    result := sync_inventory_conversion_rates();
    RAISE NOTICE '✅ Created function and synced % items', result;
  END IF;
END $$;

-- Step 3: Create auto-sync trigger
CREATE OR REPLACE FUNCTION auto_sync_conversion_rates_trigger()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.inventory_items
  SET
    unit_level1_name = NEW.unit_level1_name,
    unit_level1_rate = NEW.unit_level1_rate,
    unit_level2_name = NEW.unit_level2_name,
    unit_level2_rate = NEW.unit_level2_rate,
    unit_level3_name = NEW.unit_level3_name
  WHERE sku = NEW.sku;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_sync_conversion_rates ON public.product_conversion_rates;

CREATE TRIGGER trigger_auto_sync_conversion_rates
  AFTER INSERT OR UPDATE ON public.product_conversion_rates
  FOR EACH ROW
  EXECUTE FUNCTION auto_sync_conversion_rates_trigger();

-- ===================================
-- ✅ VERIFY IT WORKS
-- ===================================

-- Should now show SPOUT-LW02 with correct calculation
SELECT
  product_name,
  sku,
  location,
  unit_level1_quantity || ' ลัง' as qty,
  unit_level1_rate || ' ชิ้น/ลัง' as rate,
  (unit_level1_quantity * unit_level1_rate) || ' ชิ้น' as calculated,
  total_base_quantity || ' ชิ้น (total)' as total
FROM inventory_items
WHERE sku = 'SPOUT-LW02'
ORDER BY location;

-- Expected:
-- qty: 3 ลัง
-- rate: 6000 ชิ้น/ลัง
-- calculated: 18000 ชิ้น
-- total: 18000 ชิ้น (total)

-- ===================================
-- 🎉 DONE!
-- ===================================
