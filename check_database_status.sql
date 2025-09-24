-- Query to check current database status
-- Copy and paste this in Supabase SQL Editor to check what exists

-- 1. Check if system_events table exists
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'system_events'
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check existing indexes on system_events
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'system_events'
    AND schemaname = 'public'
ORDER BY indexname;

-- 3. Check existing views related to events
SELECT
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
    AND (table_name LIKE '%event%' OR table_name LIKE '%movement%')
ORDER BY table_name;

-- 4. Check existing functions related to events
SELECT
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND (routine_name LIKE '%event%' OR routine_name LIKE '%movement%' OR routine_name LIKE '%log%')
ORDER BY routine_name;

-- 5. Check RLS policies on system_events
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'system_events'
ORDER BY policyname;