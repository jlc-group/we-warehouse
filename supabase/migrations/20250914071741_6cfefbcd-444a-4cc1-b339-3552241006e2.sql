-- Update location format constraint for new shelf layout
-- New format: A/1/1 to N/4/20 (14 rows, 4 levels, 20 positions)
ALTER TABLE public.inventory_items 
DROP CONSTRAINT IF EXISTS inventory_items_location_format_check;

ALTER TABLE public.inventory_items 
ADD CONSTRAINT inventory_items_location_format_check 
CHECK (location ~ '^[A-N]/[1-4]/([1-9]|1[0-9]|20)$');