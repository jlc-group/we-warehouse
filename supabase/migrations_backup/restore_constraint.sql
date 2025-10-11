-- RESTORE CONSTRAINT SCRIPT
-- Run this after the data is properly cleaned up to restore data integrity

DO $$
DECLARE
    constraint_exists BOOLEAN := FALSE;
BEGIN
    -- Check if constraint already exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_customer_orders_source_sales_bill_id'
        AND table_name = 'customer_orders'
    ) INTO constraint_exists;

    IF NOT constraint_exists THEN
        RAISE NOTICE '🔗 Restoring foreign key constraint...';

        -- Add the constraint back
        ALTER TABLE public.customer_orders
        ADD CONSTRAINT fk_customer_orders_source_sales_bill_id
        FOREIGN KEY (source_sales_bill_id) REFERENCES public.sales_bills(id) ON DELETE SET NULL;

        RAISE NOTICE '✅ Foreign key constraint restored successfully';

        -- Verify the constraint is working
        DO $$
        DECLARE
            violation_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO violation_count
            FROM public.customer_orders co
            LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
            WHERE co.source_sales_bill_id IS NOT NULL
            AND sb.id IS NULL;

            IF violation_count = 0 THEN
                RAISE NOTICE '✅ Constraint is working properly - no violations found';
            ELSE
                RAISE NOTICE '⚠️ Found % constraint violations after restoration', violation_count;
            END IF;
        END $$;

    ELSE
        RAISE NOTICE '✅ Foreign key constraint already exists';
    END IF;

END $$;

-- Final status
SELECT
    '🎯 CONSTRAINT RESTORATION COMPLETE' as status,
    NOW() as completed_at,
    'Foreign key constraint has been restored for data integrity' as result;
