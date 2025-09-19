-- 🧪 Test Script สำหรับ normalize_location_format Function
-- รันหลังจากติดตั้ง complete_database_setup.sql แล้ว

-- ==========================================
-- Test 1: ทดสอบ normalize function แบบครอบคลุม
-- ==========================================

SELECT 'Test 1: Basic Normalization Patterns' as test_name;

SELECT
    input_location,
    normalize_location_format(input_location) as normalized_output,
    CASE
        WHEN normalize_location_format(input_location) ~ '^[A-Z]/[1-4]/\d{2}$' THEN '✅ Valid'
        ELSE '❌ Invalid'
    END as validation_result
FROM (VALUES
    -- Standard formats that should work
    ('A1/1'),        -- Should become A/1/01
    ('A1/01'),       -- Should become A/1/01
    ('A1/02'),       -- Should become A/1/02
    ('B2/5'),        -- Should become B/2/05
    ('C3/12'),       -- Should become C/3/12
    ('D4/99'),       -- Should become D/4/99

    -- Alternative separators
    ('A1-1'),        -- Should become A/1/01
    ('B2-5'),        -- Should become B/2/05
    ('A1.1'),        -- Should become A/1/01
    ('C3.12'),       -- Should become C/3/12

    -- Combined formats
    ('A101'),        -- Should become A/1/01
    ('B205'),        -- Should become B/2/05
    ('C312'),        -- Should become C/3/12

    -- Short formats
    ('A11'),         -- Should become A/1/01
    ('B25'),         -- Should become B/2/05
    ('C34'),         -- Should become C/3/04

    -- Already correct formats
    ('A/1/01'),      -- Should stay A/1/01
    ('B/2/05'),      -- Should stay B/2/05
    ('C/3/12'),      -- Should stay C/3/12

    -- Edge cases
    ('D/4/01'),      -- Should stay D/4/01
    ('A/1/99'),      -- Should stay A/1/99

    -- Invalid cases (should return original)
    ('A5/1'),        -- Invalid level (level 5)
    ('A1/100'),      -- Invalid position (>99)
    ('Z1/1'),        -- Should work (any letter)
    (''),            -- Empty string
    (NULL)           -- NULL value
) as test_data(input_location)
ORDER BY input_location;

-- ==========================================
-- Test 2: ทดสอบกับข้อมูลจริงใน inventory_items
-- ==========================================

SELECT 'Test 2: Real Inventory Data Normalization' as test_name;

SELECT
    location as original_location,
    normalize_location_format(location) as normalized_location,
    COUNT(*) as item_count,
    CASE
        WHEN normalize_location_format(location) ~ '^[A-Z]/[1-4]/\d{2}$' THEN '✅ Valid'
        WHEN location IS NULL OR location = '' THEN '⚠️ Empty'
        ELSE '❌ Invalid: ' || normalize_location_format(location)
    END as validation_status
FROM inventory_items
WHERE location IS NOT NULL AND location != ''
GROUP BY location, normalize_location_format(location)
ORDER BY normalize_location_format(location), location
LIMIT 20;

-- ==========================================
-- Test 3: ทดสอบ Performance ของ View
-- ==========================================

SELECT 'Test 3: View Performance Test' as test_name;

-- Count total locations with inventory
SELECT
    COUNT(*) as total_locations,
    COUNT(*) FILTER (WHERE inventory_count > 0) as locations_with_inventory,
    COUNT(*) FILTER (WHERE inventory_count = 0) as empty_locations
FROM warehouse_locations_with_inventory;

-- ==========================================
-- Test 4: ทดสอบ RPC Functions
-- ==========================================

SELECT 'Test 4: RPC Functions Test' as test_name;

-- Test get_warehouse_locations_optimized
SELECT 'Testing get_warehouse_locations_optimized...' as status;
SELECT COUNT(*) as optimized_results_count
FROM get_warehouse_locations_optimized('A', 10, 0);

-- Test get_location_statistics
SELECT 'Testing get_location_statistics...' as status;
SELECT * FROM get_location_statistics();

-- Test get_locations_by_row
SELECT 'Testing get_locations_by_row for row A...' as status;
SELECT COUNT(*) as row_a_count
FROM get_locations_by_row('A');

-- ==========================================
-- Test 5: ทดสอบ Sync Function
-- ==========================================

SELECT 'Test 5: Sync Function Test' as test_name;

-- Check current warehouse_locations count
SELECT 'Current warehouse_locations count:' as status, COUNT(*) as count
FROM warehouse_locations;

-- Show sample of locations that would be created/updated
SELECT 'Sample locations that will be processed:' as status;
SELECT
    location,
    normalize_location_format(location) as normalized,
    COUNT(*) as item_count,
    SUM(COALESCE(box_quantity, 0)) as total_boxes,
    SUM(COALESCE(loose_quantity, 0)) as total_loose
FROM inventory_items
WHERE location IS NOT NULL AND location != '' AND TRIM(location) != ''
  AND normalize_location_format(location) ~ '^[A-Z]/[1-4]/\d{2}$'
GROUP BY location, normalize_location_format(location)
ORDER BY normalize_location_format(location)
LIMIT 5;

-- ==========================================
-- Summary Report
-- ==========================================

SELECT 'SUMMARY REPORT' as report_section;

-- Functions existence check
SELECT 'Functions Check:' as check_type;
SELECT
    CASE WHEN COUNT(*) > 0 THEN '✅ normalize_location_format exists'
         ELSE '❌ normalize_location_format missing' END as function_status
FROM pg_proc WHERE proname = 'normalize_location_format';

SELECT
    CASE WHEN COUNT(*) > 0 THEN '✅ sync_inventory_to_warehouse_locations exists'
         ELSE '❌ sync_inventory_to_warehouse_locations missing' END as function_status
FROM pg_proc WHERE proname = 'sync_inventory_to_warehouse_locations';

-- View existence check
SELECT 'Views Check:' as check_type;
SELECT
    CASE WHEN COUNT(*) > 0 THEN '✅ warehouse_locations_with_inventory exists'
         ELSE '❌ warehouse_locations_with_inventory missing' END as view_status
FROM pg_views WHERE viewname = 'warehouse_locations_with_inventory';

-- Data validation summary
SELECT 'Data Validation Summary:' as check_type;
SELECT
    COUNT(*) as total_inventory_locations,
    COUNT(*) FILTER (WHERE normalize_location_format(location) ~ '^[A-Z]/[1-4]/\d{2}$') as valid_locations,
    COUNT(*) FILTER (WHERE normalize_location_format(location) !~ '^[A-Z]/[1-4]/\d{2}$') as invalid_locations,
    ROUND(
        COUNT(*) FILTER (WHERE normalize_location_format(location) ~ '^[A-Z]/[1-4]/\d{2}$')::NUMERIC /
        NULLIF(COUNT(*), 0) * 100, 2
    ) as valid_percentage
FROM inventory_items
WHERE location IS NOT NULL AND location != '' AND TRIM(location) != '';

SELECT 'Test completed! Check results above.' as final_status;