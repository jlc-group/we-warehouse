-- Script to clear all order data from the database
-- Run this in Supabase SQL Editor to clear order data

-- ลบข้อมูลคำสั่งซื้อทั้งหมด
-- Delete order items first (due to foreign key constraints)
DELETE FROM public.order_items;

-- Then delete customer orders
DELETE FROM public.customer_orders;

-- Reset sequences (if they exist)
DO $$
BEGIN
    -- Reset customer_orders sequence
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'customer_orders_id_seq') THEN
        ALTER SEQUENCE customer_orders_id_seq RESTART WITH 1;
    END IF;

    -- Reset order_items sequence
    IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'order_items_id_seq') THEN
        ALTER SEQUENCE order_items_id_seq RESTART WITH 1;
    END IF;
END $$;

-- Verify deletion
SELECT
    (SELECT COUNT(*) FROM public.customer_orders) as remaining_orders,
    (SELECT COUNT(*) FROM public.order_items) as remaining_order_items;

-- Show success message
SELECT 'Orders data cleared successfully!' as status;