-- Fix RLS issues for location_qr_codes table
-- This script fixes access issues for QR codes functionality

-- Disable RLS for location_qr_codes table (for development)
ALTER TABLE location_qr_codes DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to anonymous and authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON location_qr_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON location_qr_codes TO authenticated;

-- Also grant usage on the sequence for insert operations
GRANT USAGE, SELECT ON SEQUENCE location_qr_codes_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE location_qr_codes_id_seq TO authenticated;

-- Optional: Create policies if you prefer to keep RLS enabled
-- Uncomment the following lines if you want to enable RLS with policies instead

-- ALTER TABLE location_qr_codes ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Public access for location_qr_codes" ON location_qr_codes
--   FOR ALL USING (true);

-- Alternative: More restrictive policy for authenticated users only
-- CREATE POLICY "Authenticated access for location_qr_codes" ON location_qr_codes
--   FOR ALL TO authenticated USING (true);

-- Show current policies (for verification)
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'location_qr_codes';

-- Verify table permissions
SELECT grantee, privilege_type, table_name
FROM information_schema.role_table_grants
WHERE table_name = 'location_qr_codes';

-- Check if table exists and show structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'location_qr_codes'
ORDER BY ordinal_position;

COMMENT ON TABLE location_qr_codes IS 'QR codes for warehouse locations - RLS disabled for development';