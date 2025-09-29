-- RUN THIS SQL IN SUPABASE DASHBOARD SQL EDITOR
-- ✅ Fix Database Schema - Add Soft Delete Support to inventory_items table

-- Add is_deleted column to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for performance when filtering deleted items
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_deleted ON public.inventory_items(is_deleted);

-- Add composite index for active items filtering
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON public.inventory_items(is_deleted, location) WHERE is_deleted = FALSE;

-- Update RLS policies to respect soft delete status
DROP POLICY IF EXISTS "Anyone can view inventory items" ON public.inventory_items;
DROP POLICY IF EXISTS "Anyone can view active inventory items" ON public.inventory_items;

CREATE POLICY "Anyone can view active inventory items"
ON public.inventory_items
FOR SELECT
USING (is_deleted = FALSE);

-- Allow viewing deleted items for admin/audit purposes
DROP POLICY IF EXISTS "Anyone can view deleted inventory items for audit" ON public.inventory_items;
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

-- Comment for documentation
COMMENT ON COLUMN public.inventory_items.is_deleted IS 'Soft delete flag - when TRUE, item is logically deleted but preserved for audit trail';
COMMENT ON INDEX idx_inventory_items_is_deleted IS 'Index for efficient filtering of deleted items';
COMMENT ON INDEX idx_inventory_items_active IS 'Composite index for active items filtering by location';

-- Verify the migration
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'inventory_items'
    AND column_name = 'is_deleted';

-- Show sample data to confirm structure
SELECT
    id,
    sku,
    location,
    COALESCE(is_deleted, false) as is_deleted,
    updated_at
FROM inventory_items
ORDER BY updated_at DESC
LIMIT 5;

-- Success message
SELECT '✅ Migration completed successfully! is_deleted column added to inventory_items table.' as status;