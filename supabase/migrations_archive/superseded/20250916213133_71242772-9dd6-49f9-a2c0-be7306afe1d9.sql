-- DATABASE INSPECTOR - Comprehensive Schema Analysis
-- 1. Check inventory_items table structure
SELECT
    'INVENTORY_ITEMS TABLE STRUCTURE' as info,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_name = 'inventory_items'
  AND table_schema = 'public'
ORDER BY ordinal_position;