-- ===================================
-- ✅ VERIFICATION QUERIES (Fixed)
-- ===================================

-- 1. Check column names - verify columns were renamed
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inventory_items'
  AND column_name LIKE 'unit_level%rate'
ORDER BY column_name;

-- Expected result:
-- unit_level1_rate | integer
-- unit_level2_rate | integer

-- 2. Count items with conversion rates
SELECT
  COUNT(*) as total_items,
  COUNT(CASE WHEN unit_level1_rate > 0 THEN 1 END) as with_level1_rate,
  COUNT(CASE WHEN unit_level2_rate > 0 THEN 1 END) as with_level2_rate
FROM inventory_items;

-- 3. Sample data verification (SPOUT-LW02) - THIS IS THE IMPORTANT ONE!
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

-- Expected for SPOUT-LW02:
-- qty_level1: 3
-- rate_level1: 6000
-- calculated_pieces: 18000
-- total_base_quantity: 18000

-- 4. Check if backup exists
SELECT COUNT(*) as backup_row_count
FROM inventory_items_backup_20251002;

-- 5. Verify trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_sync_conversion_rates';

-- 6. Test a specific problematic item
SELECT
  product_name,
  sku,
  location,
  unit_level1_name || ' (' || unit_level1_rate || ')' as level1_info,
  unit_level2_name || ' (' || unit_level2_rate || ')' as level2_info,
  unit_level3_name as level3_info,
  unit_level1_quantity || ' × ' || unit_level1_rate || ' = ' || (unit_level1_quantity * unit_level1_rate) as level1_calc,
  total_base_quantity as total_pieces
FROM inventory_items
WHERE sku = 'SPOUT-LW02'
ORDER BY location;

-- ===================================
-- 🎯 What to check:
-- ===================================
-- Query 1: Should show unit_level1_rate and unit_level2_rate (NOT conversion_rate)
-- Query 2: Should show counts of items with rates
-- Query 3: SPOUT items should show correct calculations
-- Query 6: SPOUT-LW02 should show 3 × 6000 = 18000
-- ===================================
