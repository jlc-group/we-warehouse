-- สร้างตาราง customer_exports สำหรับบันทึกประวัติการส่งออกสินค้าไปยังลูกค้า
-- คัดลอกไฟล์นี้ทั้งหมด แล้ววางใน Supabase SQL Editor แล้วกด Run

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

-- สร้าง indexes เพื่อเพิ่มความเร็วในการค้นหา
CREATE INDEX IF NOT EXISTS idx_customer_exports_customer_name ON public.customer_exports (customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_exports_product_name ON public.customer_exports (product_name);
CREATE INDEX IF NOT EXISTS idx_customer_exports_export_date ON public.customer_exports (export_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_exports_customer_id ON public.customer_exports (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_exports_inventory_item_id ON public.customer_exports (inventory_item_id);

-- เปิดใช้งาน Row Level Security
ALTER TABLE public.customer_exports ENABLE ROW LEVEL SECURITY;

-- สร้าง RLS policy อนุญาตให้ทุกคนเข้าถึงได้
CREATE POLICY "Allow all access to customer_exports" ON public.customer_exports FOR ALL USING (true);

-- ให้สิทธิ์การเข้าถึง
GRANT ALL ON public.customer_exports TO authenticated;
GRANT ALL ON public.customer_exports TO anon;
