-- Apply Sales System Migration
-- Run this SQL in Supabase Dashboard SQL Editor
-- This will create all necessary tables for the sales system

-- Migration: แก้ไขและสร้างระบบขาย (Final Fix)
-- Created: 2025-09-29
-- Description: สร้างตารางสำหรับระบบขายโดยลบ function เก่าก่อน

-- ====================================
-- 0. Clean up existing functions and tables
-- ====================================
DROP FUNCTION IF EXISTS public.generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.log_order_status_change() CASCADE;

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
    'overdue',
    'cancelled'
);

CREATE TABLE public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE,
    customer_id UUID REFERENCES public.customers(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    order_date DATE DEFAULT CURRENT_DATE,
    delivery_date DATE,
    status public.order_status DEFAULT 'draft',
    payment_status public.payment_status DEFAULT 'pending',
    subtotal DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    shipping_cost DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Index สำหรับการค้นหา
CREATE INDEX idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX idx_sales_orders_date ON public.sales_orders(order_date);
CREATE INDEX idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX idx_sales_orders_number ON public.sales_orders(order_number);

-- ====================================
-- 3. ตารางรายการสินค้าในใบสั่งซื้อ
-- ====================================
CREATE TABLE public.sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    product_sku VARCHAR(100),
    quantity DECIMAL(10,3) NOT NULL,
    unit_name VARCHAR(50) DEFAULT 'ชิ้น',
    unit_price DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_order_items_order ON public.sales_order_items(order_id);
CREATE INDEX idx_sales_order_items_sku ON public.sales_order_items(product_sku);

-- ====================================
-- 4. Functions และ Triggers
-- ====================================

-- Function สำหรับสร้างเลขที่ใบสั่งซื้อ
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT := 'SO';
    year_month TEXT;
    sequence_num INTEGER;
    new_number TEXT;
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

-- ====================================
-- 5. Views สำหรับการแสดงผล
-- ====================================

-- View สำหรับรายการใบสั่งซื้อพร้อมข้อมูลลูกค้า
CREATE VIEW public.sales_orders_with_customer AS
SELECT
    so.id,
    so.order_number,
    so.customer_id,
    so.customer_name,
    so.customer_phone,
    so.customer_email,
    c.company_name as customer_company,
    c.address as customer_address,
    so.order_date,
    so.delivery_date,
    so.status,
    so.payment_status,
    so.subtotal,
    so.tax_amount,
    so.discount_amount,
    so.shipping_cost,
    so.total_amount,
    so.notes,
    so.created_at,
    so.updated_at
FROM public.sales_orders so
LEFT JOIN public.customers c ON so.customer_id = c.id;

-- View สำหรับรายการสินค้าในใบสั่งซื้อพร้อมรายละเอียด
CREATE VIEW public.sales_order_items_detail AS
SELECT
    soi.id,
    soi.order_id,
    so.order_number,
    so.customer_name,
    soi.product_name,
    soi.product_sku,
    soi.quantity,
    soi.unit_name,
    soi.unit_price,
    soi.line_total,
    soi.notes as item_notes,
    so.status as order_status,
    soi.created_at,
    soi.updated_at
FROM public.sales_order_items soi
JOIN public.sales_orders so ON soi.order_id = so.id;

-- ====================================
-- 6. RLS Policies
-- ====================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- Policy สำหรับ customers
CREATE POLICY "Allow all operations on customers" ON public.customers
    FOR ALL USING (true) WITH CHECK (true);

-- Policy สำหรับ sales_orders
CREATE POLICY "Allow all operations on sales_orders" ON public.sales_orders
    FOR ALL USING (true) WITH CHECK (true);

-- Policy สำหรับ sales_order_items
CREATE POLICY "Allow all operations on sales_order_items" ON public.sales_order_items
    FOR ALL USING (true) WITH CHECK (true);

-- ====================================
-- 7. Sample Data
-- ====================================

-- ข้อมูลลูกค้าตัวอย่าง
INSERT INTO public.customers (name, phone, email, address, contact_person, company_name, tax_id, credit_limit, payment_terms, notes) VALUES
('บริษัท สยามเทรดดิ้ง จำกัด', '02-123-4567', 'contact@siamtrading.com', '123 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110', 'คุณสมชาย ใจดี', 'บริษัท สยามเทรดดิ้ง จำกัด', '0123456789012', 500000.00, 30, 'ลูกค้า VIP - จ่ายตรงเวลา'),
('ร้านค้าปลีก ABC', '08-1234-5678', 'abc@retail.com', '456 ถ.รัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310', 'คุณสมหญิง รักสะอาด', 'ห้างหุ้นส่วน ABC', '1234567890123', 200000.00, 15, 'ขายปลีกสินค้าอุปโภค บริโภค'),
('โรงแรม แกรนด์ พาเลซ', '02-987-6543', 'procurement@grandpalace.co.th', '789 ถ.พระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ 10330', 'คุณสมศักดิ์ จัดการดี', 'โรงแรม แกรนด์ พาเลซ จำกัด', '2345678901234', 1000000.00, 45, 'โรงแรม 5 ดาว - สั่งซื้อเป็นงวดใหญ่'),
('บริษัท ไฮเทค โซลูชัน จำกัด', '02-555-0123', 'orders@hitech.co.th', '321 ถ.พหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ 10400', 'คุณทวีป เทคโนโลยี', 'บริษัท ไฮเทค โซลูชัน จำกัด', '3456789012345', 750000.00, 60, 'บริษัทเทคโนโลยี - ความต้องการพิเศษ'),
('ร้าน มินิมาร์ท 24', '08-9876-5432', 'minimart24@gmail.com', '654 ถ.ลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900', 'คุณประยุทธ์ ขยันทำงาน', 'ร้าน มินิมาร์ท 24', '4567890123456', 150000.00, 7, 'ร้านสะดวกซื้อ - จ่ายเงินสดเป็นหลัก'),
('บริษัท เฟรช ฟู้ด ซัพพลาย จำกัด', '02-777-8888', 'supply@freshfood.com', '987 ถ.บางนา-ตราด แขวงบังนา เขตบางนา กรุงเทพฯ 10260', 'คุณสุนีย์ สดใส', 'บริษัท เฟรช ฟู้ด ซัพพลาย จำกัด', '5678901234567', 300000.00, 21, 'ซัพพลายเออร์อาหารสด - ต้องการความเย็น'),
('ศูนย์การค้า เมกาพลาซ่า', '02-444-5555', 'purchasing@megaplaza.co.th', '159 ถ.รังสิต-นครนายก แขวงประชาธิปัตย์ เขตธัญบุรี ปทุมธานี 12130', 'คุณมานิตย์ จัดซื้อ', 'บริษัท เมกาพลาซ่า จำกัด (มหาชน)', '6789012345678', 2000000.00, 90, 'ศูนย์การค้าขนาดใหญ่ - ใบสั่งซื้อปริมาณมาก'),
('ร้าน คอฟฟี่ เฮ้าส์', '08-1111-2222', 'coffeehouse@cafe.com', '753 ถ.ทองหล่อ แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110', 'คุณกาแฟ หอมกรุ่น', 'ร้าน คอฟฟี่ เฮ้าส์', '7890123456789', 80000.00, 14, 'ร้านกาแฟสไตล์บูติก - สั่งของพิเศษ'),
('บริษัท โลจิสติกส์ เอ็กซ์เพรส จำกัด', '02-333-4444', 'admin@logistics.co.th', '852 ถ.กิ่งแก้ว แขวงราชาเทวะ เขตบางพลี สมุทรปราการ 10540', 'คุณเร็ว ส่งถึงใจ', 'บริษัท โลจิสติกส์ เอ็กซ์เพรส จำกัด', '8901234567890', 600000.00, 30, 'บริษัทขนส่ง - ต้องการอุปกรณ์คลังสินค้า'),
('ห้างสรรพสินค้า ไดมอนด์', '02-666-7777', 'buyer@diamond.co.th', '741 ถ.ราชดำริ แขวงลุมพินี เขตปทุมวัน กรุงเทพฯ 10330', 'คุณเพชร ราคาดี', 'บริษัท ไดมอนด์ รีเทล จำกัด', '9012345678901', 1500000.00, 60, 'ห้างสรรพสินค้าหรู - มาตรฐานสูง');

-- ====================================
-- 8. Verification
-- ====================================

-- ตรวจสอบว่าข้อมูลถูกสร้างสำเร็จ
DO $$
DECLARE
    customer_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO customer_count FROM public.customers;
    RAISE NOTICE 'Created % customer records', customer_count;
END $$;

-- แสดงข้อความสำเร็จ
SELECT
    'Sales system tables created successfully!' as status,
    COUNT(*) as customer_count
FROM public.customers;

-- Verify tables exist
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('customers', 'sales_orders', 'sales_order_items')
ORDER BY tablename;

-- Verify views exist
SELECT
    schemaname,
    viewname,
    viewowner
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN ('sales_orders_with_customer', 'sales_order_items_detail')
ORDER BY viewname;