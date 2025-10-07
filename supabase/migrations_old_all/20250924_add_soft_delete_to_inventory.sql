-- Add soft delete support to inventory_items table
-- This allows us to mark items as deleted instead of hard deleting them
-- which prevents foreign key constraint violations with inventory_movements

-- Add is_deleted column to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for performance when filtering deleted items
CREATE INDEX idx_inventory_items_is_deleted ON public.inventory_items(is_deleted);

-- Add composite index for active items filtering
CREATE INDEX idx_inventory_items_active ON public.inventory_items(is_deleted, location) WHERE is_deleted = FALSE;

-- Update RLS policies to respect soft delete status
DROP POLICY IF EXISTS "Anyone can view inventory items" ON public.inventory_items;
CREATE POLICY "Anyone can view active inventory items"
ON public.inventory_items
FOR SELECT
USING (is_deleted = FALSE);

-- Allow viewing deleted items for admin/audit purposes
CREATE POLICY "Anyone can view deleted inventory items for audit"
ON public.inventory_items
FOR SELECT
USING (is_deleted = TRUE);

-- Update insert policy to ensure new items are not deleted by default
DROP POLICY IF EXISTS "Anyone can insert inventory items" ON public.inventory_items;
CREATE POLICY "Anyone can insert inventory items"
ON public.inventory_items
FOR INSERT
WITH CHECK (is_deleted = FALSE);

-- Update update policy to allow soft delete operations
DROP POLICY IF EXISTS "Anyone can update inventory items" ON public.inventory_items;
CREATE POLICY "Anyone can update inventory items"
ON public.inventory_items
FOR UPDATE
USING (TRUE)
WITH CHECK (TRUE);

-- Update delete policy - still allow hard delete if needed for maintenance
DROP POLICY IF EXISTS "Anyone can delete inventory items" ON public.inventory_items;
CREATE POLICY "Anyone can delete inventory items"
ON public.inventory_items
FOR DELETE
USING (TRUE);

-- Update the movement logging trigger to handle soft deletes properly
CREATE OR REPLACE FUNCTION public.log_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
    movement_type_val TEXT := 'adjustment';
BEGIN
    -- Handle soft delete (UPDATE with is_deleted = true)
    IF TG_OP = 'UPDATE' AND OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
        -- This is a soft delete - log as 'out' movement
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
            notes,
            created_at
        ) VALUES (
            OLD.id,
            'out',
            COALESCE(OLD.unit_level1_quantity, OLD.carton_quantity_legacy, 0),
            COALESCE(OLD.unit_level2_quantity, OLD.box_quantity_legacy, 0),
            0, -- after quantities are 0 for soft delete
            0,
            -(COALESCE(OLD.unit_level1_quantity, OLD.carton_quantity_legacy, 0)),
            -(COALESCE(OLD.unit_level2_quantity, OLD.box_quantity_legacy, 0)),
            OLD.location,
            OLD.location, -- location stays same for soft delete
            'Soft delete - item removed from active inventory',
            NOW()
        );
        RETURN NEW;
    END IF;

    -- Handle normal updates
    IF TG_OP = 'UPDATE' AND OLD.is_deleted = FALSE AND NEW.is_deleted = FALSE THEN
        -- Determine movement type based on changes
        IF OLD.location != NEW.location THEN
            movement_type_val := 'transfer';
        ELSIF (COALESCE(NEW.unit_level1_quantity, NEW.carton_quantity_legacy, 0) + COALESCE(NEW.unit_level2_quantity, NEW.box_quantity_legacy, 0)) >
              (COALESCE(OLD.unit_level1_quantity, OLD.carton_quantity_legacy, 0) + COALESCE(OLD.unit_level2_quantity, OLD.box_quantity_legacy, 0)) THEN
            movement_type_val := 'in';
        ELSIF (COALESCE(NEW.unit_level1_quantity, NEW.carton_quantity_legacy, 0) + COALESCE(NEW.unit_level2_quantity, NEW.box_quantity_legacy, 0)) <
              (COALESCE(OLD.unit_level1_quantity, OLD.carton_quantity_legacy, 0) + COALESCE(OLD.unit_level2_quantity, OLD.box_quantity_legacy, 0)) THEN
            movement_type_val := 'out';
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
            notes,
            created_at
        ) VALUES (
            OLD.id,
            movement_type_val,
            COALESCE(OLD.unit_level1_quantity, OLD.carton_quantity_legacy, 0),
            COALESCE(OLD.unit_level2_quantity, OLD.box_quantity_legacy, 0),
            COALESCE(NEW.unit_level1_quantity, NEW.carton_quantity_legacy, 0),
            COALESCE(NEW.unit_level2_quantity, NEW.box_quantity_legacy, 0),
            COALESCE(NEW.unit_level1_quantity, NEW.carton_quantity_legacy, 0) - COALESCE(OLD.unit_level1_quantity, OLD.carton_quantity_legacy, 0),
            COALESCE(NEW.unit_level2_quantity, NEW.box_quantity_legacy, 0) - COALESCE(OLD.unit_level2_quantity, OLD.box_quantity_legacy, 0),
            OLD.location,
            NEW.location,
            CASE
                WHEN movement_type_val = 'transfer' THEN 'Transfer from ' || OLD.location || ' to ' || NEW.location
                ELSE 'Inventory adjustment'
            END,
            NOW()
        );
        RETURN NEW;
    END IF;

    -- Handle inserts
    IF TG_OP = 'INSERT' AND NEW.is_deleted = FALSE THEN
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
            notes,
            created_at
        ) VALUES (
            NEW.id,
            'in',
            0,
            0,
            COALESCE(NEW.unit_level1_quantity, NEW.carton_quantity_legacy, 0),
            COALESCE(NEW.unit_level2_quantity, NEW.box_quantity_legacy, 0),
            COALESCE(NEW.unit_level1_quantity, NEW.carton_quantity_legacy, 0),
            COALESCE(NEW.unit_level2_quantity, NEW.box_quantity_legacy, 0),
            NULL,
            NEW.location,
            'New inventory item added',
            NOW()
        );
        RETURN NEW;
    END IF;

    -- Handle hard deletes (still supported for maintenance)
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
            location_after,
            notes,
            created_at
        ) VALUES (
            OLD.id,
            'out',
            COALESCE(OLD.unit_level1_quantity, OLD.carton_quantity_legacy, 0),
            COALESCE(OLD.unit_level2_quantity, OLD.box_quantity_legacy, 0),
            0,
            0,
            -(COALESCE(OLD.unit_level1_quantity, OLD.carton_quantity_legacy, 0)),
            -(COALESCE(OLD.unit_level2_quantity, OLD.box_quantity_legacy, 0)),
            OLD.location,
            NULL,
            'Hard delete - item removed from database',
            NOW()
        );
        RETURN OLD;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Comment for documentation
COMMENT ON COLUMN public.inventory_items.is_deleted IS 'Soft delete flag - when TRUE, item is logically deleted but preserved for audit trail';
COMMENT ON INDEX idx_inventory_items_is_deleted IS 'Index for efficient filtering of deleted items';
COMMENT ON INDEX idx_inventory_items_active IS 'Composite index for active items filtering by location';