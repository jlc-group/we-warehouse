-- Create AFTER INSERT trigger for INSERT operations (so the item exists first)
CREATE TRIGGER log_inventory_movement_insert_trigger
    AFTER INSERT ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION log_inventory_movement();

-- Create BEFORE trigger for UPDATE and DELETE operations  
CREATE TRIGGER log_inventory_movement_update_delete_trigger
    BEFORE UPDATE OR DELETE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION log_inventory_movement();