-- Fix script for foreign key constraint violations
-- This script will resolve the constraint violation by either:
-- 1. Creating missing sales_bills records for orphaned customer_orders
-- 2. Setting source_sales_bill_id to NULL for records that should be standalone

DO $$
DECLARE
    missing_count INTEGER;
    fixed_count INTEGER := 0;
BEGIN
    -- Count problematic records first
    SELECT COUNT(*) INTO missing_count
    FROM public.customer_orders co
    LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
    WHERE co.source_sales_bill_id IS NOT NULL
    AND sb.id IS NULL;

    RAISE NOTICE '🔧 Found % records with missing sales_bills references', missing_count;

    -- Option 1: Create missing sales_bills records for orphaned orders
    -- This is the safer approach - preserves the relationship
    INSERT INTO public.sales_bills (
        id,
        bill_number,
        customer_id,
        bill_date,
        status,
        bill_type,
        priority,
        subtotal,
        total_amount,
        created_at,
        updated_at,
        created_by,
        updated_by
    )
    SELECT
        co.source_sales_bill_id,
        'SB' || TO_CHAR(co.order_date, 'YYMM') || LPAD(ROW_NUMBER() OVER (ORDER BY co.id)::TEXT, 3, '0'),
        co.customer_id,
        co.order_date,
        'confirmed',
        'sale',
        'normal',
        0, -- Will need to be calculated properly in real scenario
        0, -- Will need to be calculated properly in real scenario
        co.created_at,
        co.updated_at,
        co.created_by,
        co.updated_by
    FROM public.customer_orders co
    LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
    WHERE co.source_sales_bill_id IS NOT NULL
    AND sb.id IS NULL;

    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RAISE NOTICE '✅ Created % missing sales_bills records', fixed_count;

    -- Option 2: Alternative approach - set source_sales_bill_id to NULL
    -- Only use this if creating sales_bills is not appropriate
    /*
    UPDATE public.customer_orders
    SET source_sales_bill_id = NULL
    WHERE id IN (
        SELECT co.id
        FROM public.customer_orders co
        LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
        WHERE co.source_sales_bill_id IS NOT NULL
        AND sb.id IS NULL
    );

    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RAISE NOTICE '✅ Set source_sales_bill_id to NULL for % records', fixed_count;
    */

    -- Verify the fix
    SELECT COUNT(*) INTO missing_count
    FROM public.customer_orders co
    LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
    WHERE co.source_sales_bill_id IS NOT NULL
    AND sb.id IS NULL;

    IF missing_count = 0 THEN
        RAISE NOTICE '🎉 Constraint violation fixed! No more missing references.';
    ELSE
        RAISE NOTICE '⚠️ Still have % missing references. Manual intervention may be needed.', missing_count;
    END IF;

END $$;

-- Final verification
SELECT
    '✅ Final verification' as status,
    COUNT(*) as total_customer_orders,
    COUNT(source_sales_bill_id) as orders_with_sales_bill,
    COUNT(CASE WHEN source_sales_bill_id IS NOT NULL THEN 1 END) as non_null_sales_bill_ids
FROM public.customer_orders;

-- Show any remaining problematic records (should be empty after fix)
SELECT
    '🔍 Remaining issues (should be empty)' as check,
    co.id,
    co.order_number,
    co.source_sales_bill_id
FROM public.customer_orders co
LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
WHERE co.source_sales_bill_id IS NOT NULL
AND sb.id IS NULL;
