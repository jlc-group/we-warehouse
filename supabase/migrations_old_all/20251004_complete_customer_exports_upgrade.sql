-- ====================================================================
-- Complete Customer Exports Upgrade Migration
-- ====================================================================
-- This migration combines all updates needed for customer_exports table:
-- 1. Add product_type column for filtering
-- 2. Add pricing fields (unit_price, total_value, currency)
-- 3. Cleanup duplicate QR codes in location_qr_codes table
-- ====================================================================

-- ====================================================================
-- PART 1: Add product_type column
-- ====================================================================

-- Add product_type column
ALTER TABLE public.customer_exports
ADD COLUMN IF NOT EXISTS product_type VARCHAR(10);

-- Create index for faster filtering by product type
CREATE INDEX IF NOT EXISTS idx_customer_exports_product_type
ON public.customer_exports (product_type);

-- Update existing records by joining with products table
UPDATE public.customer_exports ce
SET product_type = p.product_type
FROM public.products p
WHERE ce.product_code = p.sku_code
AND ce.product_type IS NULL;

-- Add comment
COMMENT ON COLUMN public.customer_exports.product_type IS 'Product type: FG (Finished Goods), PK (Packaging), RM (Raw Materials)';


-- ====================================================================
-- PART 2: Add pricing fields
-- ====================================================================

-- Add pricing columns
ALTER TABLE public.customer_exports
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS total_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'THB';

-- Add index for value-based queries
CREATE INDEX IF NOT EXISTS idx_customer_exports_total_value
ON public.customer_exports (total_value DESC NULLS LAST);

-- Add comments
COMMENT ON COLUMN public.customer_exports.unit_price IS 'Price per unit at time of export (in base currency)';
COMMENT ON COLUMN public.customer_exports.total_value IS 'Total value of export (quantity_exported × unit_price)';
COMMENT ON COLUMN public.customer_exports.currency IS 'Currency code (default: THB)';

-- Update existing records with calculated values from products table
-- This backfills historical data based on current product unit_cost
UPDATE public.customer_exports ce
SET
  unit_price = p.unit_cost,
  total_value = ce.quantity_exported * COALESCE(p.unit_cost, 0)
FROM public.products p
WHERE ce.product_code = p.sku_code
  AND ce.unit_price IS NULL
  AND p.unit_cost IS NOT NULL;

-- Create a trigger function to auto-calculate total_value
CREATE OR REPLACE FUNCTION public.calculate_export_total_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-calculate total_value if unit_price is provided
  IF NEW.unit_price IS NOT NULL AND NEW.quantity_exported IS NOT NULL THEN
    NEW.total_value := NEW.quantity_exported * NEW.unit_price;
  END IF;

  -- If unit_price is null, try to get it from products table
  IF NEW.unit_price IS NULL AND NEW.product_code IS NOT NULL THEN
    SELECT unit_cost INTO NEW.unit_price
    FROM public.products
    WHERE sku_code = NEW.product_code
    LIMIT 1;

    -- Recalculate total_value if we found a price
    IF NEW.unit_price IS NOT NULL THEN
      NEW.total_value := NEW.quantity_exported * NEW.unit_price;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_calculate_export_total_value ON public.customer_exports;
CREATE TRIGGER trigger_calculate_export_total_value
  BEFORE INSERT OR UPDATE ON public.customer_exports
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_export_total_value();

-- Add check constraint to ensure data consistency
DO $$
BEGIN
  -- Add check_positive_price constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_positive_price'
    AND conrelid = 'public.customer_exports'::regclass
  ) THEN
    ALTER TABLE public.customer_exports
    ADD CONSTRAINT check_positive_price
    CHECK (unit_price IS NULL OR unit_price >= 0);
  END IF;

  -- Add check_positive_value constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_positive_value'
    AND conrelid = 'public.customer_exports'::regclass
  ) THEN
    ALTER TABLE public.customer_exports
    ADD CONSTRAINT check_positive_value
    CHECK (total_value IS NULL OR total_value >= 0);
  END IF;
END $$;


-- ====================================================================
-- PART 3: Cleanup duplicate QR codes
-- ====================================================================

-- Step 1: Log duplicates before cleanup (for audit trail)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT location
    FROM public.location_qr_codes
    WHERE is_active = true
    GROUP BY location
    HAVING COUNT(*) > 1
  ) duplicates;

  RAISE NOTICE 'Found % locations with duplicate active QR codes', duplicate_count;
END $$;

-- Step 2: Deactivate older duplicate QR codes, keep the most recent one
-- For each location with duplicates, keep only the newest QR code active
WITH ranked_qrs AS (
  SELECT
    id,
    location,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY location
      ORDER BY created_at DESC, id DESC
    ) as rn
  FROM public.location_qr_codes
  WHERE is_active = true
)
UPDATE public.location_qr_codes
SET
  is_active = false,
  updated_at = NOW()
FROM ranked_qrs
WHERE
  public.location_qr_codes.id = ranked_qrs.id
  AND ranked_qrs.rn > 1;

-- Step 3: Log cleanup results
DO $$
DECLARE
  deactivated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO deactivated_count
  FROM public.location_qr_codes
  WHERE is_active = false
    AND updated_at >= NOW() - INTERVAL '1 minute';

  RAISE NOTICE 'Deactivated % duplicate QR codes', deactivated_count;
END $$;

-- Step 4: Verify no active duplicates remain
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT location
    FROM public.location_qr_codes
    WHERE is_active = true
    GROUP BY location
    HAVING COUNT(*) > 1
  ) duplicates;

  IF remaining_duplicates > 0 THEN
    RAISE WARNING 'Still found % locations with duplicate active QR codes after cleanup', remaining_duplicates;
  ELSE
    RAISE NOTICE '✅ Cleanup successful - no duplicate active QR codes remain';
  END IF;
END $$;

-- Step 5: Add helpful comment
COMMENT ON TABLE public.location_qr_codes IS 'QR codes for warehouse locations. Unique constraint ensures one active QR per location. Use upsert pattern in locationQRService to prevent duplicates.';


-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================
-- Summary of changes:
-- ✅ Added product_type column to customer_exports
-- ✅ Added pricing fields (unit_price, total_value, currency)
-- ✅ Created auto-calculation trigger for pricing
-- ✅ Backfilled historical data
-- ✅ Cleaned up duplicate QR codes
-- ✅ Added indexes and constraints
-- ====================================================================
