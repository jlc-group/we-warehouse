-- Temporarily disable the trigger to avoid foreign key issues
DROP TRIGGER IF EXISTS log_inventory_movement_trigger ON inventory_items;

-- Delete movement logs for items in the time range first
DELETE FROM inventory_movements 
WHERE inventory_item_id IN (
  SELECT id FROM inventory_items 
  WHERE updated_at BETWEEN '2025-09-16 07:28:00.031341+00' AND '2025-09-16 07:28:01.664446+00'
);

-- Then delete the inventory items
DELETE FROM inventory_items 
WHERE updated_at BETWEEN '2025-09-16 07:28:00.031341+00' AND '2025-09-16 07:28:01.664446+00';

-- Re-enable the trigger
CREATE TRIGGER log_inventory_movement_trigger
    BEFORE INSERT OR UPDATE OR DELETE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION log_inventory_movement();