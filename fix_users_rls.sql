-- Fix RLS issues for users table
-- This script temporarily disables RLS to allow anonymous access

-- Option 1: Disable RLS completely (fastest solution for development)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Option 2: Alternative - Create a public read policy (uncomment if you prefer this approach)
-- CREATE POLICY "Public read access for users" ON users
--   FOR SELECT USING (true);

-- Option 3: Alternative - Allow anonymous access for specific operations
-- CREATE POLICY "Anonymous read users" ON users
--   FOR SELECT TO anon USING (true);

-- Grant necessary permissions to anonymous role
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;

-- Optional: Enable insert/update for authenticated users only
-- GRANT INSERT, UPDATE, DELETE ON users TO authenticated;

-- Show current policies (for verification)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'users';

-- Verify table permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'users';

COMMENT ON TABLE users IS 'User management table - RLS disabled for development';