-- Fix the log_inventory_movement function to properly handle INSERT operations
-- The issue is that it's trying to reference NEW.id before the item is actually inserted

DROP TRIGGER IF EXISTS log_inventory_movement_trigger ON inventory_items;

CREATE OR REPLACE FUNCTION public.log_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- For INSERT operations - use AFTER INSERT trigger instead of BEFORE
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.inventory_movements (
      inventory_item_id,
      movement_type,
      quantity_boxes_before,
      quantity_loose_before,
      quantity_boxes_after,
      quantity_loose_after,
      quantity_boxes_change,
      quantity_loose_change,
      location_after,
      notes
    ) VALUES (
      NEW.id,
      'in',
      0,
      0,
      NEW.quantity_boxes,
      NEW.quantity_loose,
      NEW.quantity_boxes,
      NEW.quantity_loose,
      NEW.location,
      'เพิ่มสินค้าใหม่'
    );
    RETURN NEW;
  END IF;

  -- For UPDATE operations
  IF TG_OP = 'UPDATE' THEN
    DECLARE
      movement_type_val TEXT := 'adjustment';
      notes_val TEXT := 'แก้ไขข้อมูลสินค้า';
    BEGIN
      -- Determine movement type based on changes
      IF OLD.location != NEW.location THEN
        movement_type_val := 'transfer';
        notes_val := 'ย้ายสินค้า จาก ' || OLD.location || ' ไป ' || NEW.location;
      ELSIF (NEW.quantity_boxes + NEW.quantity_loose) > (OLD.quantity_boxes + OLD.quantity_loose) THEN
        movement_type_val := 'in';
        notes_val := 'เพิ่มสต็อก';
      ELSIF (NEW.quantity_boxes + NEW.quantity_loose) < (OLD.quantity_boxes + OLD.quantity_loose) THEN
        movement_type_val := 'out';
        notes_val := 'ลดสต็อก';
      END IF;

      INSERT INTO public.inventory_movements (
        inventory_item_id,
        movement_type,
        quantity_boxes_before,
        quantity_loose_before,
        quantity_boxes_after,
        quantity_loose_after,
        quantity_boxes_change,
        quantity_loose_change,
        location_before,
        location_after,
        notes
      ) VALUES (
        NEW.id,
        movement_type_val,
        OLD.quantity_boxes,
        OLD.quantity_loose,
        NEW.quantity_boxes,
        NEW.quantity_loose,
        NEW.quantity_boxes - OLD.quantity_boxes,
        NEW.quantity_loose - OLD.quantity_loose,
        OLD.location,
        NEW.location,
        notes_val
      );
    END;
    RETURN NEW;
  END IF;

  -- For DELETE operations
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.inventory_movements (
      inventory_item_id,
      movement_type,
      quantity_boxes_before,
      quantity_loose_before,
      quantity_boxes_after,
      quantity_loose_after,
      quantity_boxes_change,
      quantity_loose_change,
      location_before,
      notes
    ) VALUES (
      OLD.id,
      'out',
      OLD.quantity_boxes,
      OLD.quantity_loose,
      0,
      0,
      -OLD.quantity_boxes,
      -OLD.quantity_loose,
      OLD.location,
      'ลบสินค้าออกจากระบบ'
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$

-- Create AFTER INSERT trigger for INSERT operations (so the item exists first)
CREATE TRIGGER log_inventory_movement_insert_trigger
    AFTER INSERT ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION log_inventory_movement();

-- Create BEFORE trigger for UPDATE and DELETE operations
CREATE TRIGGER log_inventory_movement_update_delete_trigger
    BEFORE UPDATE OR DELETE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION log_inventory_movement();