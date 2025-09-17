-- COMPREHENSIVE FIX: Full RLS solution with RPC function
-- Run this ONLY if QUICK_FIX.sql doesn't work

-- Step 1: Clean up existing policies
ALTER TABLE inventory_items DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies (if any)
DROP POLICY IF EXISTS "Enable read access for all users" ON inventory_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON inventory_items;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON inventory_items;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_select_policy" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_insert_policy" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_update_policy" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_delete_policy" ON inventory_items;
DROP POLICY IF EXISTS "inventory_public_select" ON inventory_items;
DROP POLICY IF EXISTS "inventory_public_insert" ON inventory_items;
DROP POLICY IF EXISTS "inventory_public_update" ON inventory_items;
DROP POLICY IF EXISTS "inventory_public_delete" ON inventory_items;

-- Step 3: Re-enable RLS with permissive policies
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_select" ON inventory_items FOR SELECT USING (true);
CREATE POLICY "allow_all_insert" ON inventory_items FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_all_update" ON inventory_items FOR UPDATE USING (true);
CREATE POLICY "allow_all_delete" ON inventory_items FOR DELETE USING (true);

-- Step 4: Create RPC function
CREATE OR REPLACE FUNCTION get_all_inventory_bypass_rls()
RETURNS TABLE (
  id uuid,
  product_name text,
  product_code text,
  location text,
  lot text,
  mfd text,
  quantity_boxes integer,
  quantity_loose integer,
  user_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ii.id,
    ii.product_name,
    ii.product_code,
    ii.location,
    ii.lot,
    ii.mfd,
    ii.quantity_boxes,
    ii.quantity_loose,
    ii.user_id,
    ii.created_at,
    ii.updated_at
  FROM inventory_items ii
  ORDER BY ii.location;
END;
$$;

-- Step 5: Grant permissions
GRANT EXECUTE ON FUNCTION get_all_inventory_bypass_rls() TO anon;
GRANT EXECUTE ON FUNCTION get_all_inventory_bypass_rls() TO authenticated;
GRANT ALL ON inventory_items TO anon;
GRANT USAGE ON SEQUENCE inventory_items_id_seq TO anon;

-- Step 6: Refresh schema
SELECT pg_notify('pgrst', 'reload schema');