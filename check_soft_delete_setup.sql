-- Diagnostic script to check soft delete setup

-- 1. Check if is_deleted column exists in inventory_items
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_items' 
    AND column_name = 'is_deleted';

-- 2. Check current inventory_items structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_items' 
ORDER BY ordinal_position;

-- 3. Check for any foreign key constraints that might cause 409 errors
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name = 'inventory_items' OR ccu.table_name = 'inventory_items');

-- 4. Count deleted vs active inventory items
SELECT 
    COALESCE(is_deleted, false) as deleted_status,
    COUNT(*) as count
FROM inventory_items 
GROUP BY COALESCE(is_deleted, false);

-- 5. Sample data to verify structure
SELECT 
    id,
    sku,
    location,
    is_deleted,
    updated_at
FROM inventory_items 
ORDER BY updated_at DESC 
LIMIT 5;
