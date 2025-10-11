-- เพิ่ม fulfillment_location และ fulfillment_status สำหรับการแยกบทบาท Sales vs Warehouse
-- Sales สร้างใบสั่ง (customer + products)
-- Warehouse เลือก location และจัดส่ง

-- เพิ่มคอลัมน์ใหม่ใน order_items table
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS fulfillment_location TEXT,
ADD COLUMN IF NOT EXISTS fulfillment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fulfilled_by TEXT;

-- สร้าง enum สำหรับ fulfillment_status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fulfillment_status_enum') THEN
        CREATE TYPE fulfillment_status_enum AS ENUM (
            'pending',     -- รอจัด (เซลสร้างใบสั่งแล้ว)
            'assigned',    -- คลังเลือก location แล้ว
            'picking',     -- กำลังเบิก
            'picked',      -- เบิกเสร็จแล้ว
            'shipped',     -- จัดส่งแล้ว
            'cancelled'    -- ยกเลิก
        );
    END IF;
END $$;

-- อัปเดต column เพื่อใช้ enum
ALTER TABLE public.order_items
ALTER COLUMN fulfillment_status SET DATA TYPE fulfillment_status_enum
USING fulfillment_status::fulfillment_status_enum;

-- เพิ่ม comment อธิบายการใช้งาน
COMMENT ON COLUMN public.order_items.fulfillment_location IS 'Location ที่คลังเลือกสำหรับการจัดส่ง (แยกจาก location ของ inventory_item)';
COMMENT ON COLUMN public.order_items.fulfillment_status IS 'สถานะการจัดส่งที่แยกจาก order status';
COMMENT ON COLUMN public.order_items.fulfilled_at IS 'เวลาที่จัดส่งเสร็จ';
COMMENT ON COLUMN public.order_items.fulfilled_by IS 'ผู้ที่ทำการจัดส่ง';

-- สร้าง index สำหรับ query ที่มีประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment_status
ON public.order_items(fulfillment_status);

CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment_location
ON public.order_items(fulfillment_location);

-- อัปเดตข้อมูลเก่าให้มี fulfillment_status = 'pending'
UPDATE public.order_items
SET fulfillment_status = 'pending'
WHERE fulfillment_status IS NULL;

-- สร้าง view สำหรับ order items ที่รอจัด
CREATE OR REPLACE VIEW public.pending_fulfillment_items AS
SELECT
    oi.*,
    co.order_number,
    co.customer_id,
    co.order_date,
    co.priority,
    c.company_name as customer_name
FROM public.order_items oi
JOIN public.customer_orders co ON oi.order_id = co.id
LEFT JOIN public.customers c ON co.customer_id = c.id
WHERE oi.fulfillment_status = 'pending'
ORDER BY co.order_date DESC, co.priority DESC;

-- สร้าง view สำหรับ fulfillment dashboard
CREATE OR REPLACE VIEW public.fulfillment_dashboard AS
SELECT
    fulfillment_status,
    COUNT(*) as item_count,
    COUNT(DISTINCT order_id) as order_count
FROM public.order_items
GROUP BY fulfillment_status;

SELECT 'Migration completed: เพิ่ม fulfillment fields สำเร็จแล้ว!' as status;