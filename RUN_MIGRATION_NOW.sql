-- ===================================
-- 🚀 RUN THIS IN SUPABASE SQL EDITOR
-- ===================================
-- Purpose: Fix conversion_rate → rate naming
-- Date: 2025-10-02
-- ===================================

-- ===================================
-- Step 1: Backup (Safety First!)
-- ===================================
CREATE TABLE IF NOT EXISTS inventory_items_backup_20251002 AS
SELECT * FROM inventory_items;

-- Verify backup
SELECT COUNT(*) as backup_count FROM inventory_items_backup_20251002;

-- ===================================
-- Step 2: Fix Column Names
-- ===================================
DO $$
BEGIN
  -- Rename unit_level1_conversion_rate → unit_level1_rate
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items'
    AND column_name = 'unit_level1_conversion_rate'
  ) THEN
    ALTER TABLE public.inventory_items
      RENAME COLUMN unit_level1_conversion_rate TO unit_level1_rate;
    RAISE NOTICE '✅ Renamed: unit_level1_conversion_rate → unit_level1_rate';
  ELSE
    RAISE NOTICE 'ℹ️  Column unit_level1_rate already exists';
  END IF;

  -- Rename unit_level2_conversion_rate → unit_level2_rate
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items'
    AND column_name = 'unit_level2_conversion_rate'
  ) THEN
    ALTER TABLE public.inventory_items
      RENAME COLUMN unit_level2_conversion_rate TO unit_level2_rate;
    RAISE NOTICE '✅ Renamed: unit_level2_conversion_rate → unit_level2_rate';
  ELSE
    RAISE NOTICE 'ℹ️  Column unit_level2_rate already exists';
  END IF;
END $$;

-- ===================================
-- Step 3: Update Computed Column
-- ===================================
ALTER TABLE public.inventory_items
  DROP COLUMN IF EXISTS total_base_quantity;

ALTER TABLE public.inventory_items
  ADD COLUMN total_base_quantity INTEGER GENERATED ALWAYS AS (
    COALESCE(unit_level1_quantity * unit_level1_rate, 0) +
    COALESCE(unit_level2_quantity * unit_level2_rate, 0) +
    COALESCE(unit_level3_quantity, 0)
  ) STORED;

-- ===================================
-- Step 4: Update Constraints
-- ===================================
ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS check_conversion_rates_positive;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT check_unit_rates_positive
  CHECK (
    unit_level1_rate >= 0 AND
    unit_level2_rate >= 0
  );

-- ===================================
-- Step 5: Sync Conversion Rates
-- ===================================
CREATE OR REPLACE FUNCTION sync_inventory_conversion_rates()
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql;

-- Run sync now
DO $$
DECLARE
  result INTEGER;
BEGIN
  result := sync_inventory_conversion_rates();
  RAISE NOTICE '✅ Synced % inventory items with conversion rates', result;
END $$;

-- ===================================
-- Step 6: Create Auto-Sync Trigger
-- ===================================
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
-- ✅ VERIFICATION QUERIES
-- ===================================

-- 1. Check column names
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inventory_items'
  AND column_name LIKE 'unit_level%rate'
ORDER BY column_name;

-- 2. Count items with conversion rates
SELECT
  COUNT(*) as total_items,
  COUNT(CASE WHEN unit_level1_rate > 0 THEN 1 END) as with_level1_rate,
  COUNT(CASE WHEN unit_level2_rate > 0 THEN 1 END) as with_level2_rate
FROM inventory_items;

-- 3. Sample data verification (SPOUT-LW02)
SELECT
  product_name,
  sku,
  location,
  unit_level1_quantity as qty_level1,
  unit_level1_rate as rate_level1,
  unit_level1_quantity * unit_level1_rate as calculated_pieces,
  total_base_quantity
FROM inventory_items
WHERE sku LIKE 'SPOUT%'
ORDER BY location
LIMIT 10;

-- 4. Compare before/after (if backup exists)
SELECT
  'BEFORE' as status,
  COUNT(CASE WHEN unit_level1_conversion_rate > 0 THEN 1 END) as with_conversion_rate
FROM inventory_items_backup_20251002
UNION ALL
SELECT
  'AFTER' as status,
  COUNT(CASE WHEN unit_level1_rate > 0 THEN 1 END) as with_rate
FROM inventory_items;

-- ===================================
-- 🎉 MIGRATION COMPLETE!
-- ===================================
-- Next steps:
-- 1. Refresh your app (Ctrl+Shift+R)
-- 2. Check SPOUT-LW02 display
-- 3. Should show: 3 ลัง × 6,000 = 18,000 ชิ้น ✅
-- ===================================
