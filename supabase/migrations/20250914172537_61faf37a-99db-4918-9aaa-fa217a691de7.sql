-- Update RLS policies for inventory_items to require authentication
-- This fixes the security vulnerability where business inventory data was publicly accessible

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can create inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can update inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can delete inventory items" ON public.inventory_items;

-- Create secure policies that require authentication
CREATE POLICY "Authenticated users can view inventory items" 
ON public.inventory_items 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create inventory items" 
ON public.inventory_items 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update inventory items" 
ON public.inventory_items 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete inventory items" 
ON public.inventory_items 
FOR DELETE 
TO authenticated
USING (true);

-- Also secure the inventory_movements table similarly
DROP POLICY IF EXISTS "Anyone can view movement logs" ON public.inventory_movements;
DROP POLICY IF EXISTS "Anyone can create movement logs" ON public.inventory_movements;

CREATE POLICY "Authenticated users can view movement logs" 
ON public.inventory_movements 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create movement logs" 
ON public.inventory_movements 
FOR INSERT 
TO authenticated
WITH CHECK (true);