-- Migration: สร้างระบบขาย-คลัง-จัดส่งแบบครบวงจร (Fixed Version)
-- Created: 2025-09-29
-- Description: ตารางสำหรับระบบขาย การจัดการลูกค้า ใบสั่งซื้อ และการจัดส่ง
-- Fix: ลบ dependencies และแก้ไขปัญหา column name

-- ====================================
-- 0. Clean up existing tables (if any)
-- ====================================
DROP VIEW IF EXISTS public.sales_order_items_detail CASCADE;
DROP VIEW IF EXISTS public.sales_orders_with_customer CASCADE;
DROP TABLE IF EXISTS public.warehouse_tasks CASCADE;
DROP TABLE IF EXISTS public.sales_order_status_history CASCADE;
DROP TABLE IF EXISTS public.sales_order_items CASCADE;
DROP TABLE IF EXISTS public.sales_orders CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TYPE IF EXISTS public.warehouse_task_status CASCADE;
DROP TYPE IF EXISTS public.payment_status CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;

-- ====================================
-- 1. ตารางลูกค้า (Customers)
-- ====================================
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    contact_person VARCHAR(255),
    company_name VARCHAR(255),
    tax_id VARCHAR(20),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    payment_terms INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Index สำหรับการค้นหา
CREATE INDEX idx_customers_name ON public.customers(name);
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_active ON public.customers(is_active);

-- ====================================
-- 2. ตารางใบสั่งซื้อ (Sales Orders)
-- ====================================
CREATE TYPE public.order_status AS ENUM (
    'draft',
    'confirmed',
    'picking',
    'packed',
    'shipping',
    'delivered',
    'cancelled'
);

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'partial',
    'paid',
    'overdue'
);

CREATE TABLE public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,

    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,

    status public.order_status NOT NULL DEFAULT 'draft',
    payment_status public.payment_status NOT NULL DEFAULT 'pending',

    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    required_date DATE,
    shipped_date DATE,
    delivered_date DATE,

    notes TEXT,
    delivery_address TEXT,
    delivery_instructions TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,

    sales_person_id UUID,
    warehouse_person_id UUID,
    shipping_person_id UUID
);

-- Indexes
CREATE INDEX idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX idx_sales_orders_payment_status ON public.sales_orders(payment_status);
CREATE INDEX idx_sales_orders_order_date ON public.sales_orders(order_date);
CREATE INDEX idx_sales_orders_number ON public.sales_orders(order_number);

-- ====================================
-- 3. ตารางรายการสินค้าในใบสั่งซื้อ (Order Items)
-- ====================================
CREATE TABLE public.sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    product_id UUID,

    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),

    quantity_cartons INTEGER DEFAULT 0,
    quantity_boxes INTEGER DEFAULT 0,
    quantity_pieces INTEGER DEFAULT 0,
    total_pieces INTEGER NOT NULL,

    unit_price DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,

    picked_cartons INTEGER DEFAULT 0,
    picked_boxes INTEGER DEFAULT 0,
    picked_pieces INTEGER DEFAULT 0,
    total_picked INTEGER DEFAULT 0,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sales_order_items_order ON public.sales_order_items(order_id);
CREATE INDEX idx_sales_order_items_product ON public.sales_order_items(product_id);

-- ====================================
-- 4. ตารางประวัติสถานะใบสั่งซื้อ (Order Status History)
-- ====================================
CREATE TABLE public.sales_order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    old_status public.order_status,
    new_status public.order_status NOT NULL,
    notes TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID
);

-- Index
CREATE INDEX idx_order_status_history_order ON public.sales_order_status_history(order_id);
CREATE INDEX idx_order_status_history_date ON public.sales_order_status_history(changed_at);

-- ====================================
-- 5. ตารางงานคลัง (Warehouse Tasks)
-- ====================================
CREATE TYPE public.warehouse_task_status AS ENUM (
    'pending',
    'assigned',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TABLE public.warehouse_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    task_type VARCHAR(50) NOT NULL DEFAULT 'picking',
    status public.warehouse_task_status NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 3,

    assigned_to UUID,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_warehouse_tasks_order ON public.warehouse_tasks(order_id);
CREATE INDEX idx_warehouse_tasks_status ON public.warehouse_tasks(status);
CREATE INDEX idx_warehouse_tasks_assigned ON public.warehouse_tasks(assigned_to);

-- ====================================
-- 6. Functions และ Triggers
-- ====================================

-- Function สำหรับสร้างเลขที่ใบสั่งซื้อ
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    new_number VARCHAR(50);
    prefix VARCHAR(10) := 'SO';
    year_month VARCHAR(6);
    sequence_num INTEGER;
BEGIN
    year_month := TO_CHAR(CURRENT_DATE, 'YYYYMM');

    SELECT COALESCE(MAX(CAST(RIGHT(order_number, 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM public.sales_orders
    WHERE order_number LIKE prefix || year_month || '%';

    new_number := prefix || year_month || LPAD(sequence_num::TEXT, 4, '0');
    NEW.order_number := new_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger สำหรับสร้างเลขที่อัตโนมัติ
CREATE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON public.sales_orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
    EXECUTE FUNCTION public.generate_order_number();

-- Function สำหรับอัปเดท updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers สำหรับ updated_at
CREATE TRIGGER trigger_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_sales_orders_updated_at
    BEFORE UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_sales_order_items_updated_at
    BEFORE UPDATE ON public.sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function สำหรับบันทึกประวัติสถานะ
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.sales_order_status_history
        (order_id, old_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.updated_by);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger สำหรับบันทึกประวัติสถานะ
CREATE TRIGGER trigger_log_order_status_change
    AFTER UPDATE ON public.sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.log_order_status_change();

-- ====================================
-- 7. Views สำหรับการ Query ข้อมูล
-- ====================================

-- View สำหรับใบสั่งซื้อพร้อมข้อมูลลูกค้า
CREATE VIEW public.sales_orders_with_customer AS
SELECT
    so.*,
    c.name as customer_name,
    c.phone as customer_phone,
    c.email as customer_email,
    c.company_name as customer_company
FROM public.sales_orders so
LEFT JOIN public.customers c ON so.customer_id = c.id;

-- View สำหรับรายการสินค้าในใบสั่งซื้อ
CREATE VIEW public.sales_order_items_detail AS
SELECT
    soi.*,
    so.order_number,
    so.status as order_status,
    so.customer_id,
    c.name as customer_name
FROM public.sales_order_items soi
LEFT JOIN public.sales_orders so ON soi.order_id = so.id
LEFT JOIN public.customers c ON so.customer_id = c.id;

-- ====================================
-- 8. RLS (Row Level Security) Policies
-- ====================================

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_tasks ENABLE ROW LEVEL SECURITY;

-- Policies สำหรับ customers - รองรับทั้ง authenticated และ anon users
CREATE POLICY "Allow public read access to customers" ON public.customers
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Allow authenticated users to insert customers" ON public.customers
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow anon users to insert customers" ON public.customers
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update customers" ON public.customers
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon users to update customers" ON public.customers
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

-- Policies สำหรับ sales_orders - รองรับทั้ง authenticated และ anon users
CREATE POLICY "Allow public read access to sales orders" ON public.sales_orders
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Allow authenticated users to insert sales orders" ON public.sales_orders
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow anon users to insert sales orders" ON public.sales_orders
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update sales orders" ON public.sales_orders
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon users to update sales orders" ON public.sales_orders
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

-- Policies สำหรับ sales_order_items - รองรับทั้ง authenticated และ anon users
CREATE POLICY "Allow public read access to order items" ON public.sales_order_items
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Allow authenticated users to manage order items" ON public.sales_order_items
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon users to manage order items" ON public.sales_order_items
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

-- Policies สำหรับ sales_order_status_history - รองรับทั้ง authenticated และ anon users
CREATE POLICY "Allow public read access to status history" ON public.sales_order_status_history
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Allow authenticated users to manage status history" ON public.sales_order_status_history
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon users to manage status history" ON public.sales_order_status_history
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

-- Policies สำหรับ warehouse_tasks - รองรับทั้ง authenticated และ anon users
CREATE POLICY "Allow public read access to warehouse tasks" ON public.warehouse_tasks
    FOR SELECT TO public
    USING (true);

CREATE POLICY "Allow authenticated users to manage warehouse tasks" ON public.warehouse_tasks
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon users to manage warehouse tasks" ON public.warehouse_tasks
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

-- ====================================
-- 9. ข้อมูลตัวอย่าง (Sample Data)
-- ====================================

-- ลูกค้าตัวอย่าง (เพิ่มข้อมูลให้ครบถ้วนและหลากหลาย)
INSERT INTO public.customers (name, phone, email, address, contact_person, company_name, tax_id, credit_limit, payment_terms, is_active, notes)
VALUES
    ('บริษัท ABC จำกัด', '02-123-4567', 'contact@abc.com', '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110', 'คุณสมชาย ใจดี', 'บริษัท ABC จำกัด', '0105534123456', 500000.00, 30, true, 'ลูกค้าประจำ - จ่ายตรงเวลา ประกอบธุรกิจค้าขาย'),

    ('ร้านค้าปลีก XYZ', '08-1234-5678', 'xyz@shop.com', '456 ถนนรัชดาภิเษก แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900', 'คุณสมหญิง รักสะอาด', 'ห้างหุ้นส่วน XYZ', '0995534789012', 200000.00, 15, true, 'ขายปลีกสินค้าอุปโภค ลูกค้าใหม่'),

    ('โรงแรม Grand Palace', '02-987-6543', 'procurement@grandpalace.com', '789 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ 10330', 'คุณสมศักดิ์ จัดการ', 'โรงแรม Grand Palace Co., Ltd.', '0105534567890', 1000000.00, 45, true, 'โรงแรม 5 ดาว - สั่งซื้อเป็นงวดใหญ่'),

    ('บริษัท เทคโนโลยี ไอที จำกัด', '02-555-7890', 'orders@ittech.co.th', '321 อาคารสยามทาวเวอร์ ถนนราชปรารภ แขวงมักกะสัน เขตราชเทวี กรุงเทพฯ 10400', 'คุณวิทยา สมาร์ท', 'บริษัท เทคโนโลยี ไอที จำกัด', '0105534999888', 750000.00, 30, true, 'บริษัทเทคโนโลยี ซื้อเครื่องใช้สำนักงาน'),

    ('ร้านอาหาร ต้มยำกุ้ง', '08-9876-5432', 'restaurant@tomyum.com', '88 ถนนสีลม แขวงสุริยวงศ์ เขตบางรัก กรุงเทพฯ 10500', 'คุณสมปอง รสเด็ด', 'ห้างหุ้นส่วน ต้มยำกุ้ง', '0995534111222', 100000.00, 7, true, 'ร้านอาหารไทย ซื้อวัตถุดิบ'),

    ('โรงเรียน สายน้ำใส', '02-444-3333', 'supply@school.ac.th', '555 ถนนลาดพร้าว แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900', 'คุณสมหวัง เรียนดี', 'มูลนิธิโรงเรียน สายน้ำใส', '0994445556667', 300000.00, 60, true, 'โรงเรียนเอกชน จัดซื้ออุปกรณ์การศึกษา'),

    ('คลีนิค แสงใส', '02-777-8888', 'clinic@sangsai.com', '999 ถนนพหลโยธิน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900', 'คุณหมอสมใส รักษาดี', 'คลีนิค แสงใส จำกัด', '0105534333444', 400000.00, 30, true, 'คลีนิคเวชกรรม ซื้ออุปกรณ์การแพทย์'),

    ('ออฟฟิศ เซ็นเตอร์', '08-5555-6666', 'purchase@office-center.com', '777 ถนนสาทร แขวงยานนาวา เขตสาทร กรุงเทพฯ 10120', 'คุณสมศรี จัดซื้อ', 'บริษัท ออฟฟิศ เซ็นเตอร์ จำกัด', '0105534777888', 600000.00, 21, true, 'จำหน่ายเครื่องใช้สำนักงาน ซื้อเป็นจำนวนมาก'),

    ('โรงงาน ผลิตภัณฑ์ใส', '02-222-1111', 'factory@product.co.th', '1234 นิคมอุตสาหกรรม ลาดกระบัง แขวงลาดกระบัง เขตลาดกระบัง กรุงเทพฯ 10520', 'คุณสมคิด ผลิตดี', 'บริษัท ผลิตภัณฑ์ใส จำกัด (มหาชน)', '0105534555666', 2000000.00, 45, true, 'โรงงานผลิต ซื้อวัตถุดิบและบรรจุภัณฑ์'),

    ('ร้าน เบเกอรี่ หวานใจ', '08-3333-4444', 'bakery@sweetheart.com', '456 ถนนท่าพระ แขวงท่าพระ เขตธนบุรี กรุงเทพฯ 10600', 'คุณสมหวาน อร่อยดี', 'ห้างหุ้นส่วน เบเกอรี่ หวานใจ', '0995534222333', 150000.00, 14, true, 'เบเกอรี่ ซื้อแป้งและวัตถุดิบทำขนม');

-- สร้าง comment สำหรับเอกสาร
COMMENT ON TABLE public.customers IS 'ตารางข้อมูลลูกค้า';
COMMENT ON TABLE public.sales_orders IS 'ตารางใบสั่งซื้อ/ขาย';
COMMENT ON TABLE public.sales_order_items IS 'ตารางรายการสินค้าในใบสั่งซื้อ';
COMMENT ON TABLE public.sales_order_status_history IS 'ตารางประวัติการเปลี่ยนสถานะใบสั่งซื้อ';
COMMENT ON TABLE public.warehouse_tasks IS 'ตารางงานคลัง (จัดเก็บ, แพ็ค, จัดส่ง)';

-- สำเร็จ!
SELECT 'Sales System Database Schema created successfully! พร้อม 10 ลูกค้าตัวอย่าง' as status;