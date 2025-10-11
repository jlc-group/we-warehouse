-- แก้ไขปัญหา ERROR: 42703: column "customer_id" does not exist
-- ปัญหาจริงคือ: ตาราง customers ใช้ column ชื่อ "name" แต่โค้ดใช้ "customer_name"

-- ======================================
-- 1. เช็คว่าตาราง customers มี column อะไรบ้าง
-- ======================================
DO $$ 
BEGIN
    -- ถ้ามี column "name" ให้เปลี่ยนเป็น "customer_name"
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.customers RENAME COLUMN name TO customer_name;
        RAISE NOTICE 'Renamed column "name" to "customer_name"';
    END IF;

    -- ถ้ายังไม่มี column "customer_code" ให้เพิ่ม
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'customer_code'
    ) THEN
        ALTER TABLE public.customers ADD COLUMN customer_code VARCHAR(50);
        RAISE NOTICE 'Added column "customer_code"';
    END IF;

    -- ถ้ายังไม่มี column "customer_type" ให้เพิ่ม
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'customer_type'
    ) THEN
        ALTER TABLE public.customers ADD COLUMN customer_type VARCHAR(50);
        RAISE NOTICE 'Added column "customer_type"';
    END IF;
END $$;

-- ======================================
-- 2. สร้างตาราง customer_exports
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

CREATE INDEX IF NOT EXISTS idx_customer_exports_customer_name ON public.customer_exports (customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_exports_product_name ON public.customer_exports (product_name);
CREATE INDEX IF NOT EXISTS idx_customer_exports_export_date ON public.customer_exports (export_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_exports_customer_id ON public.customer_exports (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_exports_inventory_item_id ON public.customer_exports (inventory_item_id);

ALTER TABLE public.customer_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to customer_exports" ON public.customer_exports;
CREATE POLICY "Allow all access to customer_exports" ON public.customer_exports FOR ALL USING (true);

GRANT ALL ON public.customer_exports TO authenticated;
GRANT ALL ON public.customer_exports TO anon;
