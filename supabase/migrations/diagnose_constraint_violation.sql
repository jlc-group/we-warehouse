-- Diagnostic script to identify foreign key constraint violations
-- Run this to check for problematic data in customer_orders table

-- Check for customer_orders records with source_sales_bill_id that don't exist in sales_bills
SELECT
    '🔍 Checking for foreign key violations in customer_orders' as check_type,
    COUNT(*) as problematic_records
FROM public.customer_orders co
LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
WHERE co.source_sales_bill_id IS NOT NULL
AND sb.id IS NULL;

-- Show the problematic records
SELECT
    '🚨 Problematic customer_orders records' as issue,
    co.id,
    co.order_number,
    co.source_sales_bill_id as missing_sales_bill_id,
    co.workflow_type,
    co.created_at
FROM public.customer_orders co
LEFT JOIN public.sales_bills sb ON co.source_sales_bill_id = sb.id
WHERE co.source_sales_bill_id IS NOT NULL
AND sb.id IS NULL
LIMIT 10;

-- Check the total count of each table
SELECT
    '📊 Table statistics' as info,
    'customer_orders' as table_name,
    COUNT(*) as total_records,
    COUNT(source_sales_bill_id) as records_with_sales_bill_id
FROM public.customer_orders
UNION ALL
SELECT
    'sales_bills' as table_name,
    COUNT(*) as total_records,
    0 as records_with_sales_bill_id
FROM public.sales_bills;
