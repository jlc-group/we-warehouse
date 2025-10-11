-- Fix RLS policies for inventory_items to allow data recovery without authentication
DROP POLICY IF EXISTS "Authenticated users can create inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Authenticated users can view inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Authenticated users can update inventory items" ON inventory_items;
DROP POLICY IF EXISTS "Authenticated users can delete inventory items" ON inventory_items;

-- Create new policies that allow operations for all users
CREATE POLICY "Allow all operations on inventory items" 
ON inventory_items 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Ensure table has RLS enabled
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;