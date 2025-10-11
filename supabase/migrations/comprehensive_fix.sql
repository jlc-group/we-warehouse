-- COMPREHENSIVE FIX SCRIPT
-- Run this to resolve all the current issues

-- =====================================================
-- 1. Fix the constraint violation issue
-- =====================================================

DO $$
DECLARE
    constraint_name TEXT;
    orphaned_count INTEGER;
BEGIN
    RAISE NOTICE '🔧 Starting constraint violation fix...';

    -- Count orphaned records first
    SELECT COUNT(*) INTO orphaned_count
    FROM public.customer_orders co
    LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
    WHERE co.source_sales_bill_id IS NOT NULL
    AND sb.id IS NULL;

    RAISE NOTICE 'Found % orphaned customer_orders records', orphaned_count;

    IF orphaned_count > 0 THEN
        -- Option 1: Set orphaned source_sales_bill_id to NULL (safest)
        UPDATE public.customer_orders
        SET source_sales_bill_id = NULL
        WHERE id IN (
            SELECT co.id
            FROM public.customer_orders co
            LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
            WHERE co.source_sales_bill_id IS NOT NULL
            AND sb.id IS NULL
        );

        RAISE NOTICE '✅ Fixed % orphaned records by setting source_sales_bill_id to NULL', orphaned_count;
    END IF;

    -- Verify no more orphaned records
    SELECT COUNT(*) INTO orphaned_count
    FROM public.customer_orders co
    LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
    WHERE co.source_sales_bill_id IS NOT NULL
    AND sb.id IS NULL;

    IF orphaned_count = 0 THEN
        RAISE NOTICE '✅ No more constraint violations found';
    ELSE
        RAISE NOTICE '⚠️ Still have % orphaned records', orphaned_count;
    END IF;

END $$;

-- =====================================================
-- 2. Create missing products_summary view
-- =====================================================

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

    IF NOT view_exists THEN
        RAISE NOTICE '📋 Creating products_summary view...';

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
    ELSE
        RAISE NOTICE '✅ products_summary view already exists';
    END IF;
END $$;

-- =====================================================
-- 3. Final verification
-- =====================================================

DO $$
DECLARE
    orders_count INTEGER;
    summary_count INTEGER;
    orphaned_count INTEGER;
BEGIN
    -- Count orders and check for remaining issues
    SELECT COUNT(*) INTO orders_count FROM public.customer_orders;
    SELECT COUNT(*) INTO summary_count FROM public.products_summary;

    SELECT COUNT(*) INTO orphaned_count
    FROM public.customer_orders co
    LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
    WHERE co.source_sales_bill_id IS NOT NULL
    AND sb.id IS NULL;

    RAISE NOTICE '📊 === FINAL VERIFICATION ===';
    RAISE NOTICE '✅ Total customer_orders: %', orders_count;
    RAISE NOTICE '✅ products_summary records: %', summary_count;
    RAISE NOTICE '✅ Orphaned records remaining: %', orphaned_count;

    IF orphaned_count = 0 THEN
        RAISE NOTICE '🎉 All constraint violations resolved!';
        RAISE NOTICE '🚀 Application should now work without 400 errors';
    ELSE
        RAISE NOTICE '⚠️ Still have % orphaned records to fix', orphaned_count;
    END IF;

END $$;
