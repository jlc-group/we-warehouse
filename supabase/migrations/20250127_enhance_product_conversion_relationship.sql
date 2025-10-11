-- Migration: Enhance product_conversion_rates table with product relationship
-- Date: 2025-01-27
-- Purpose: Add product_id foreign key and product_type for better integration

-- Add new columns to product_conversion_rates table
ALTER TABLE product_conversion_rates
ADD COLUMN IF NOT EXISTS product_id UUID,
ADD COLUMN IF NOT EXISTS product_type TEXT;

-- Add foreign key constraint
ALTER TABLE product_conversion_rates
ADD CONSTRAINT IF NOT EXISTS fk_product_conversion_product_id
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_conversion_rates_product_id
ON product_conversion_rates(product_id);

CREATE INDEX IF NOT EXISTS idx_product_conversion_rates_product_type
ON product_conversion_rates(product_type);

-- Update existing records to link with products table
-- This will match SKU with sku_code and populate product_id and product_type
UPDATE product_conversion_rates
SET
    product_id = products.id,
    product_type = products.product_type
FROM products
WHERE product_conversion_rates.sku = products.sku_code
AND product_conversion_rates.product_id IS NULL;

-- Add comment to the table for documentation
COMMENT ON COLUMN product_conversion_rates.product_id IS 'Foreign key reference to products table';
COMMENT ON COLUMN product_conversion_rates.product_type IS 'Product type synced from products table (FG, PK, RM, etc.)';

-- Create or replace a function to auto-sync product_type when product_id changes
CREATE OR REPLACE FUNCTION sync_product_conversion_type()
RETURNS TRIGGER AS $$
BEGIN
    -- If product_id is being updated, sync the product_type
    IF NEW.product_id IS DISTINCT FROM OLD.product_id AND NEW.product_id IS NOT NULL THEN
        SELECT product_type INTO NEW.product_type
        FROM products
        WHERE id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-sync product_type
DROP TRIGGER IF EXISTS trigger_sync_product_conversion_type ON product_conversion_rates;
CREATE TRIGGER trigger_sync_product_conversion_type
    BEFORE UPDATE ON product_conversion_rates
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_conversion_type();

-- Create view for easy querying of products with conversion rates
CREATE OR REPLACE VIEW products_with_conversions AS
SELECT
    p.id,
    p.sku_code,
    p.product_name,
    p.product_type,
    p.category,
    p.brand,
    p.unit_of_measure,
    p.is_active,
    p.created_at as product_created_at,
    p.updated_at as product_updated_at,
    pcr.id as conversion_id,
    pcr.unit_level1_name,
    pcr.unit_level1_rate,
    pcr.unit_level2_name,
    pcr.unit_level2_rate,
    pcr.unit_level3_name,
    pcr.created_at as conversion_created_at,
    pcr.updated_at as conversion_updated_at
FROM products p
LEFT JOIN product_conversion_rates pcr ON p.id = pcr.product_id
WHERE p.is_active = true;

-- Grant appropriate permissions
GRANT SELECT ON products_with_conversions TO anon, authenticated;

-- Add RLS policy for the new view if needed
-- Note: RLS will be inherited from the underlying tables