-- Create movement log table
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')),
  quantity_boxes_before INTEGER NOT NULL DEFAULT 0,
  quantity_loose_before INTEGER NOT NULL DEFAULT 0,
  quantity_boxes_after INTEGER NOT NULL DEFAULT 0,
  quantity_loose_after INTEGER NOT NULL DEFAULT 0,
  quantity_boxes_change INTEGER NOT NULL DEFAULT 0,
  quantity_loose_change INTEGER NOT NULL DEFAULT 0,
  location_before TEXT,
  location_after TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'system'
);

-- Enable RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Create policies for movement log
CREATE POLICY "Anyone can view movement logs" 
ON public.inventory_movements 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create movement logs" 
ON public.inventory_movements 
FOR INSERT 
WITH CHECK (true);

-- Create function to log movements
CREATE OR REPLACE FUNCTION public.log_inventory_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT operations
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
$$ LANGUAGE plpgsql;

-- Create triggers for movement logging
CREATE TRIGGER log_inventory_movement_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.log_inventory_movement();

-- Create index for better performance
CREATE INDEX idx_inventory_movements_item_id ON public.inventory_movements(inventory_item_id);
CREATE INDEX idx_inventory_movements_created_at ON public.inventory_movements(created_at DESC);