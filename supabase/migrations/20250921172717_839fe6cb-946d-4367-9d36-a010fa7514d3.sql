-- Fix location format constraint issue
-- Remove the strict constraint and replace with a more flexible one

-- First, let's check what constraint exists
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%location%format%'
AND constraint_schema = 'public';

-- Drop the existing strict constraint if it exists
ALTER TABLE public.inventory_items 
DROP CONSTRAINT IF EXISTS inventory_items_location_format_check;

-- Add a more flexible constraint that allows various location formats
-- This will accept formats like: A/1/01, A1/01, A-1-01, A101, etc.
ALTER TABLE public.inventory_items 
ADD CONSTRAINT inventory_items_location_flexible_check 
CHECK (
  location IS NULL OR 
  location = '' OR
  length(trim(location)) > 0
);

-- Update any existing locations to use normalized format
UPDATE public.inventory_items 
SET location = normalize_location_format(location)
WHERE location IS NOT NULL 
AND location != ''
AND location !~ '^[A-Z]/[1-4]/[0-9]{2}$';