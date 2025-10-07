-- ============================================================================
-- FIX RLS POLICIES FOR PRODUCTS AND RELATED TABLES
-- ============================================================================

-- 1. Enable RLS on products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Allow all access to products" ON public.products;
DROP POLICY IF EXISTS "Enable all access for products" ON public.products;

-- 3. Create comprehensive RLS policy for products (allow all for now - no auth required)
CREATE POLICY "Allow full access to products" ON public.products
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Grant permissions
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.products TO anon;

-- 5. Enable RLS on product_conversion_rates
ALTER TABLE public.product_conversion_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to product_conversion_rates" ON public.product_conversion_rates;

CREATE POLICY "Allow full access to product_conversion_rates" ON public.product_conversion_rates
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.product_conversion_rates TO authenticated;
GRANT ALL ON public.product_conversion_rates TO anon;

-- 6. Views don't need RLS but need permissions
GRANT SELECT ON public.products_with_conversions TO authenticated;
GRANT SELECT ON public.products_with_conversions TO anon;

GRANT SELECT ON public.products_with_counts TO authenticated;
GRANT SELECT ON public.products_with_counts TO anon;

-- 7. Verify RLS is enabled
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'products') THEN
    RAISE EXCEPTION 'RLS not enabled on products table';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'product_conversion_rates') THEN
    RAISE EXCEPTION 'RLS not enabled on product_conversion_rates table';
  END IF;

  RAISE NOTICE 'RLS successfully enabled on all tables';
END $$;
