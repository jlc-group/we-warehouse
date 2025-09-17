-- First delete movement logs for items in the time range
DELETE FROM inventory_movements 
WHERE inventory_item_id IN (
  SELECT id FROM inventory_items 
  WHERE updated_at BETWEEN '2025-09-16 07:28:00.031341+00' AND '2025-09-16 07:28:01.664446+00'
);

-- Then delete the inventory items
DELETE FROM inventory_items 
WHERE updated_at BETWEEN '2025-09-16 07:28:00.031341+00' AND '2025-09-16 07:28:01.664446+00';