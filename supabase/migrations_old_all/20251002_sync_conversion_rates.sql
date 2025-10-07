-- Sync conversion rates from product_conversion_rates to inventory_items
-- This ensures all inventory items use the correct conversion rates from their products

-- Function to sync conversion rates for a specific inventory item
CREATE OR REPLACE FUNCTION sync_inventory_conversion_rates()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update inventory_items with conversion rates from product_conversion_rates
  -- Match by SKU (inventory_items.sku = product_conversion_rates.sku)
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
      -- Only update if different
      inv.unit_level1_name IS DISTINCT FROM pcr.unit_level1_name OR
      inv.unit_level1_rate IS DISTINCT FROM pcr.unit_level1_rate OR
      inv.unit_level2_name IS DISTINCT FROM pcr.unit_level2_name OR
      inv.unit_level2_rate IS DISTINCT FROM pcr.unit_level2_rate OR
      inv.unit_level3_name IS DISTINCT FROM pcr.unit_level3_name
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  RAISE NOTICE 'Updated % inventory items with conversion rates from product_conversion_rates', updated_count;

  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Run the sync function immediately
DO $$
DECLARE
  result INTEGER;
BEGIN
  result := sync_inventory_conversion_rates();
  RAISE NOTICE 'Sync completed: % items updated', result;
END $$;

-- Create trigger to auto-sync when product_conversion_rates changes
CREATE OR REPLACE FUNCTION auto_sync_conversion_rates_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- When product_conversion_rates is inserted or updated,
  -- update all matching inventory_items
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

-- Add helpful comments
COMMENT ON FUNCTION sync_inventory_conversion_rates() IS 'ซิงค์อัตราแปลงหน่วยจาก product_conversion_rates ไปยัง inventory_items ที่มี SKU ตรงกัน';
COMMENT ON FUNCTION auto_sync_conversion_rates_trigger() IS 'Trigger function ที่ทำงานอัตโนมัติเมื่อ product_conversion_rates มีการเปลี่ยนแปลง';
COMMENT ON TRIGGER trigger_auto_sync_conversion_rates ON public.product_conversion_rates IS 'Auto-sync conversion rates to matching inventory_items when product_conversion_rates changes';

-- Verification query (run manually to check)
-- SELECT
--   inv.id,
--   inv.product_name,
--   inv.sku,
--   inv.location,
--   inv.unit_level1_name AS inv_l1_name,
--   pcr.unit_level1_name AS pcr_l1_name,
--   inv.unit_level1_rate AS inv_l1_rate,
--   pcr.unit_level1_rate AS pcr_l1_rate,
--   CASE
--     WHEN inv.unit_level1_rate = pcr.unit_level1_rate THEN '✓ Match'
--     ELSE '✗ Mismatch'
--   END AS status
-- FROM public.inventory_items inv
-- LEFT JOIN public.product_conversion_rates pcr ON inv.sku = pcr.sku
-- WHERE pcr.sku IS NOT NULL
-- LIMIT 20;
