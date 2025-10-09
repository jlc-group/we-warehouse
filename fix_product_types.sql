-- Fix product_type for all products based on SKU prefix
-- Run this in Supabase SQL Editor

-- 1. Update FG (Finished Goods) - products starting with L, FG-, or PROD-
UPDATE products 
SET product_type = 'FG'
WHERE (
  sku_code ILIKE 'L%' 
  OR sku_code ILIKE 'FG-%' 
  OR sku_code ILIKE 'PROD-%'
)
AND product_type != 'FG';

-- 2. Update PK (Packaging) - products starting with specific prefixes
UPDATE products 
SET product_type = 'PK'
WHERE (
  sku_code ILIKE 'BOX-%' 
  OR sku_code ILIKE 'SCH-%' 
  OR sku_code ILIKE 'TB-%' 
  OR sku_code ILIKE 'CT-%' 
  OR sku_code ILIKE 'SPOUT-%' 
  OR sku_code ILIKE 'CAP-%' 
  OR sku_code ILIKE 'LID-%' 
  OR sku_code ILIKE 'BAG-%' 
  OR sku_code ILIKE 'POUCH-%' 
  OR sku_code ILIKE 'TUBE-%'
)
AND product_type != 'PK';

-- 3. Update RM (Raw Materials) - products starting with RM- or R-
UPDATE products 
SET product_type = 'RM'
WHERE (
  sku_code ILIKE 'RM-%' 
  OR sku_code ILIKE 'R-%'
)
AND product_type != 'RM';

-- 4. Show results
SELECT 
  product_type,
  COUNT(*) as count,
  STRING_AGG(DISTINCT LEFT(sku_code, 3), ', ') as sample_prefixes
FROM products
GROUP BY product_type
ORDER BY product_type;

-- 5. Show all L-series products to verify
SELECT sku_code, product_name, product_type 
FROM products 
WHERE sku_code ILIKE 'L%'
ORDER BY sku_code
LIMIT 50;
