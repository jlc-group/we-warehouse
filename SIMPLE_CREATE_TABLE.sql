-- สร้างตารางแบบง่ายที่สุด ไม่มี constraint, index, RLS อะไรเลย
DROP TABLE IF EXISTS public.customer_exports CASCADE;

CREATE TABLE public.customer_exports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID,
    customer_name TEXT,
    customer_code TEXT,
    product_name TEXT,
    product_code TEXT,
    inventory_item_id UUID,
    quantity_exported INTEGER DEFAULT 0,
    unit TEXT,
    from_location TEXT,
    notes TEXT,
    po_reference TEXT,
    export_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID
);
