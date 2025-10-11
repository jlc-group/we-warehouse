-- แก้ไขปัญหา ERROR: 42703: column "customer_id" does not exist
-- รันไฟล์นี้ใน Supabase SQL Editor

-- ======================================
-- 1. ลบ views เก่าที่อาจมีปัญหา
-- ======================================
DROP VIEW IF EXISTS customer_payment_summary CASCADE;
DROP VIEW IF EXISTS aging_report CASCADE;

-- ======================================
-- 2. สร้างตาราง customer_exports (ถ้ายังไม่มี)
-- ======================================
CREATE TABLE IF NOT EXISTS public.customer_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID,
    customer_name TEXT NOT NULL,
    customer_code TEXT,
    product_name TEXT NOT NULL,
    product_code TEXT,
    inventory_item_id UUID,
    quantity_exported INTEGER NOT NULL DEFAULT 0,
    unit TEXT,
    from_location TEXT,
    notes TEXT,
    po_reference TEXT,
    export_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID
);

-- สร้าง indexes
CREATE INDEX IF NOT EXISTS idx_customer_exports_customer_name ON public.customer_exports (customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_exports_product_name ON public.customer_exports (product_name);
CREATE INDEX IF NOT EXISTS idx_customer_exports_export_date ON public.customer_exports (export_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_exports_customer_id ON public.customer_exports (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_exports_inventory_item_id ON public.customer_exports (inventory_item_id);

-- Enable RLS
ALTER TABLE public.customer_exports ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
DROP POLICY IF EXISTS "Allow all access to customer_exports" ON public.customer_exports;
CREATE POLICY "Allow all access to customer_exports" ON public.customer_exports FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.customer_exports TO authenticated;
GRANT ALL ON public.customer_exports TO anon;
