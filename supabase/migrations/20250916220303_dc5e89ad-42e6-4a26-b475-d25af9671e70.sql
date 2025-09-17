-- Update the trigger function to use correct column names
CREATE OR REPLACE FUNCTION public.log_inventory_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- For INSERT operations
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.inventory_movements (
      inventory_item_id,
      movement_type,
      box_quantity_before,
      loose_quantity_before,
      box_quantity_after,
      loose_quantity_after,
      box_quantity_change,
      loose_quantity_change,
      location_after,
      notes
    ) VALUES (
      NEW.id,
      'in',
      0,
      0,
      NEW.box_quantity,
      NEW.loose_quantity,
      NEW.box_quantity,
      NEW.loose_quantity,
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
      ELSIF (NEW.box_quantity + NEW.loose_quantity) > (OLD.box_quantity + OLD.loose_quantity) THEN
        movement_type_val := 'in';
        notes_val := 'เพิ่มสต็อก';
      ELSIF (NEW.box_quantity + NEW.loose_quantity) < (OLD.box_quantity + OLD.loose_quantity) THEN
        movement_type_val := 'out';
        notes_val := 'ลดสต็อก';
      END IF;

      INSERT INTO public.inventory_movements (
        inventory_item_id,
        movement_type,
        box_quantity_before,
        loose_quantity_before,
        box_quantity_after,
        loose_quantity_after,
        box_quantity_change,
        loose_quantity_change,
        location_before,
        location_after,
        notes
      ) VALUES (
        NEW.id,
        movement_type_val,
        OLD.box_quantity,
        OLD.loose_quantity,
        NEW.box_quantity,
        NEW.loose_quantity,
        NEW.box_quantity - OLD.box_quantity,
        NEW.loose_quantity - OLD.loose_quantity,
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
      box_quantity_before,
      loose_quantity_before,
      box_quantity_after,
      loose_quantity_after,
      box_quantity_change,
      loose_quantity_change,
      location_before,
      notes
    ) VALUES (
      OLD.id,
      'out',
      OLD.box_quantity,
      OLD.loose_quantity,
      0,
      0,
      -OLD.box_quantity,
      -OLD.loose_quantity,
      OLD.location,
      'ลบสินค้าออกจากระบบ'
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$function$;