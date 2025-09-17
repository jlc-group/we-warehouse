-- Remove user-specific RLS policies and create public access policies
-- This allows the inventory system to work without authentication

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can create own inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can update own inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can delete own inventory items" ON public.inventory_items;

-- Create new public access policies
CREATE POLICY "Anyone can view inventory items" 
ON public.inventory_items 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create inventory items" 
ON public.inventory_items 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update inventory items" 
ON public.inventory_items 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete inventory items" 
ON public.inventory_items 
FOR DELETE 
USING (true);

-- Make user_id column nullable and set default
ALTER TABLE public.inventory_items ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.inventory_items ALTER COLUMN user_id SET DEFAULT gen_random_uuid();