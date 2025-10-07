-- Check products table performance
-- Run this in Supabase SQL Editor

-- 1. Check total products count
SELECT COUNT(*) as total_products FROM products;
SELECT COUNT(*) as active_products FROM products WHERE is_active = true;

-- 2. Check if indexes exist
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'products'
ORDER BY indexname;

-- 3. Check RLS policies on products table
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'products';

-- 4. Test query performance (similar to what app does)
EXPLAIN ANALYZE
SELECT 
    id,
    product_name,
    sku_code,
    product_type,
    is_active,
    brand,
    category,
    subcategory,
    description,
    unit_cost,
    reorder_level,
    max_stock_level,
    unit_of_measure,
    weight,
    dimensions,
    manufacturing_country,
    storage_conditions,
    created_at,
    updated_at
FROM products
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 200;

-- 5. Create missing indexes if needed
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_is_active_created_at ON products(is_active, created_at DESC);

-- 6. Check table size
SELECT 
    pg_size_pretty(pg_total_relation_size('products')) as total_size,
    pg_size_pretty(pg_relation_size('products')) as table_size,
    pg_size_pretty(pg_indexes_size('products')) as indexes_size;

-- 7. Analyze table statistics (helps query planner)
ANALYZE products;

SELECT 'Performance check completed!' as status;
