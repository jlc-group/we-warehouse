-- Comprehensive RLS Policy Fix
-- This script fixes RLS policies for all tables to allow proper access during development

-- 1. Fix products table RLS
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.products;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.products;

CREATE POLICY "Allow all access to products" ON public.products
  FOR ALL USING (true);

GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.products TO anon;

-- 2. Fix location_qr_codes table RLS
DROP POLICY IF EXISTS "Allow full access to location_qr_codes" ON public.location_qr_codes;

CREATE POLICY "Allow all access to location_qr_codes" ON public.location_qr_codes
  FOR ALL USING (true);

GRANT ALL ON public.location_qr_codes TO authenticated;
GRANT ALL ON public.location_qr_codes TO anon;

-- 3. Fix warehouse_locations table RLS
DROP POLICY IF EXISTS "Enable all access for warehouse_locations" ON public.warehouse_locations;

CREATE POLICY "Allow all access to warehouse_locations" ON public.warehouse_locations
  FOR ALL USING (true);

GRANT ALL ON public.warehouse_locations TO authenticated;
GRANT ALL ON public.warehouse_locations TO anon;

-- 4. Fix inventory_items table RLS (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_items' AND table_schema = 'public') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view inventory items" ON public.inventory_items;
    DROP POLICY IF EXISTS "Anyone can view active inventory items" ON public.inventory_items;
    DROP POLICY IF EXISTS "Anyone can view deleted inventory items for audit" ON public.inventory_items;
    DROP POLICY IF EXISTS "Anyone can insert inventory items" ON public.inventory_items;
    DROP POLICY IF EXISTS "Anyone can update inventory items" ON public.inventory_items;
    DROP POLICY IF EXISTS "Anyone can delete inventory items" ON public.inventory_items;
    
    -- Create permissive policy
    CREATE POLICY "Allow all access to inventory_items" ON public.inventory_items
      FOR ALL USING (true);
      
    -- Grant permissions
    GRANT ALL ON public.inventory_items TO authenticated;
    GRANT ALL ON public.inventory_items TO anon;
  END IF;
END $$;

-- 5. Fix users table RLS (temporarily disable for development)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.users TO authenticated;

-- 6. Fix any other common tables that might exist
DO $$
DECLARE
  table_record RECORD;
BEGIN
  -- Loop through all tables in public schema that have RLS enabled
  FOR table_record IN 
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN ('users') -- Skip users table as we handled it above
  LOOP
    -- Check if table has RLS enabled
    IF EXISTS (
      SELECT 1 FROM pg_class c 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE c.relname = table_record.tablename 
      AND n.nspname = 'public' 
      AND c.relrowsecurity = true
    ) THEN
      -- Create a permissive policy for the table
      EXECUTE format('DROP POLICY IF EXISTS "allow_all_access" ON public.%I', table_record.tablename);
      EXECUTE format('CREATE POLICY "allow_all_access" ON public.%I FOR ALL USING (true)', table_record.tablename);
      
      -- Grant permissions
      EXECUTE format('GRANT ALL ON public.%I TO authenticated', table_record.tablename);
      EXECUTE format('GRANT ALL ON public.%I TO anon', table_record.tablename);
    END IF;
  END LOOP;
END $$;

-- 7. Ensure sequence permissions are granted
DO $$
DECLARE
  seq_record RECORD;
BEGIN
  FOR seq_record IN 
    SELECT schemaname, sequencename 
    FROM pg_sequences 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq_record.sequencename);
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO anon', seq_record.sequencename);
  END LOOP;
END $$;

-- 8. Create a function to check table access
CREATE OR REPLACE FUNCTION public.check_table_access()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policies_count INTEGER,
  anon_permissions TEXT[],
  authenticated_permissions TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::TEXT,
    COALESCE(c.relrowsecurity, false) as rls_enabled,
    COALESCE(pol.policy_count, 0) as policies_count,
    COALESCE(anon_perms.permissions, '{}') as anon_permissions,
    COALESCE(auth_perms.permissions, '{}') as authenticated_permissions
  FROM pg_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename
  LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
  LEFT JOIN (
    SELECT schemaname, tablename, COUNT(*) as policy_count
    FROM pg_policies 
    GROUP BY schemaname, tablename
  ) pol ON pol.schemaname = t.schemaname AND pol.tablename = t.tablename
  LEFT JOIN (
    SELECT table_name, array_agg(privilege_type) as permissions
    FROM information_schema.role_table_grants
    WHERE grantee = 'anon' AND table_schema = 'public'
    GROUP BY table_name
  ) anon_perms ON anon_perms.table_name = t.tablename
  LEFT JOIN (
    SELECT table_name, array_agg(privilege_type) as permissions
    FROM information_schema.role_table_grants
    WHERE grantee = 'authenticated' AND table_schema = 'public'
    GROUP BY table_name
  ) auth_perms ON auth_perms.table_name = t.tablename
  WHERE t.schemaname = 'public'
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql;

-- Run the check to see current status
SELECT * FROM public.check_table_access();

-- Success message
SELECT '✅ All RLS policies have been fixed for development access!' as status;
