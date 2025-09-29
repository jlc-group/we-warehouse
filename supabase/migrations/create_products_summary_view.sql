-- Check if products_summary view exists and create it if missing

DO $$
DECLARE
    view_exists BOOLEAN := FALSE;
BEGIN
    -- Check if the view exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_name = 'products_summary'
        AND table_schema = 'public'
    ) INTO view_exists;

    IF view_exists THEN
        RAISE NOTICE '✅ products_summary view exists';
    ELSE
        RAISE NOTICE '❌ products_summary view not found - creating it now';

        -- Create the products_summary view
        CREATE OR REPLACE VIEW public.products_summary AS
        SELECT
            p.id,
            p.sku_code,
            p.product_name,
            p.product_type,
            p.category,
            p.subcategory,
            p.brand,
            p.unit_of_measure,
            p.is_active,
            p.created_at,
            p.updated_at,
            -- Add summary statistics
            COALESCE(inv.total_quantity, 0) as total_inventory_quantity,
            COALESCE(inv.reserved_quantity, 0) as reserved_inventory_quantity,
            COALESCE(inv.available_quantity, 0) as available_inventory_quantity
        FROM public.products p
        LEFT JOIN (
            SELECT
                product_id,
                SUM(quantity_level1 + quantity_level2 + quantity_level3) as total_quantity,
                SUM(reserved_level1_quantity + reserved_level2_quantity + reserved_level3_quantity) as reserved_quantity,
                SUM(
                    (quantity_level1 + quantity_level2 + quantity_level3) -
                    (reserved_level1_quantity + reserved_level2_quantity + reserved_level3_quantity)
                ) as available_quantity
            FROM public.inventory_items
            GROUP BY product_id
        ) inv ON p.id = inv.product_id
        WHERE p.is_active = true
        ORDER BY p.product_type, p.sku_code;

        -- Grant permissions
        GRANT SELECT ON public.products_summary TO anon, authenticated;

        RAISE NOTICE '✅ Created products_summary view successfully';
    END IF;
END $$;

-- Test the view
SELECT
    '🧪 Testing products_summary view' as test,
    COUNT(*) as total_records
FROM public.products_summary;
