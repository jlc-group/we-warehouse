import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomers } from '@/hooks/useCustomers';
import { useSalesOrders } from '@/hooks/useSalesOrders';
import { useAvailableProductsForSales } from '@/hooks/useProductsSummary';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Users,
  Package,
  ShoppingCart,
  Copy,
  ExternalLink,
  RefreshCw,
  Terminal,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Emergency Database Status Component
export const DatabaseMigrationStatus: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  // Check database connections
  const { data: customers, isLoading: customersLoading, error: customersError } = useCustomers({ limit: 1 });
  const { data: orders, isLoading: ordersLoading, error: ordersError } = useSalesOrders({ limit: 1 });
  const { data: products, isLoading: productsLoading, error: productsError } = useAvailableProductsForSales();

  // Analyze the current state
  const analyzeStatus = () => {
    const hasCustomersTable = !customersError;
    const hasOrdersTable = !ordersError;
    const hasProductsView = !productsError;

    const has404Error = [customersError, ordersError, productsError]
      .some(error => error?.message?.includes('404') || error?.message?.includes('does not exist'));

    const has400Error = [customersError, ordersError, productsError]
      .some(error => error?.message?.includes('400') || error?.message?.includes('relationship'));

    return {
      hasCustomersTable,
      hasOrdersTable,
      hasProductsView,
      has404Error,
      has400Error,
      allTablesExist: hasCustomersTable && hasOrdersTable && hasProductsView,
      anyErrors: customersError || ordersError || productsError
    };
  };

  const status = analyzeStatus();

  // Copy SQL to clipboard
  const copySQLToClipboard = (sql: string, description: string) => {
    navigator.clipboard.writeText(sql).then(() => {
      toast.success(`คัดลอกแล้ว: ${description}`, {
        description: 'ไปวางใน Supabase SQL Editor ได้เลย'
      });
    });
  };

  // Test database connection
  const testConnection = async () => {
    setIsRefreshing(true);
    try {
      // Force refresh all queries
      window.location.reload();
    } finally {
      setIsRefreshing(false);
    }
  };

  // SQL Scripts
  const salesSystemSQL = `-- ==========================================
-- URGENT: Sales System Database Migration
-- Fix 404/400 errors by creating all required tables
-- ==========================================

-- ====================================
-- 1. Create Custom Types
-- ====================================
DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM (
        'draft', 'confirmed', 'picking', 'packed', 'shipping', 'delivered', 'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM (
        'pending', 'partial', 'paid', 'overdue'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ====================================
-- 2. Create Customers Table
-- ====================================
CREATE TABLE IF NOT EXISTS public.customers (
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

-- ====================================
-- 3. Create Sales Orders Table
-- ====================================
CREATE TABLE IF NOT EXISTS public.sales_orders (
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

-- ====================================
-- 4. Create Order Items Table
-- ====================================
CREATE TABLE IF NOT EXISTS public.sales_order_items (
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

-- ====================================
-- 5. Create Views
-- ====================================
CREATE OR REPLACE VIEW public.sales_orders_with_customer AS
SELECT
    so.*,
    c.name as customer_name,
    c.phone as customer_phone,
    c.email as customer_email,
    c.company_name as customer_company
FROM public.sales_orders so
LEFT JOIN public.customers c ON so.customer_id = c.id;

-- ====================================
-- 6. Enable RLS and Create Policies
-- ====================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.customers;
    CREATE POLICY "Allow all for authenticated users" ON public.customers
        FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for anon users" ON public.customers;
    CREATE POLICY "Allow all for anon users" ON public.customers
        FOR ALL TO anon USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.sales_orders;
    CREATE POLICY "Allow all for authenticated users" ON public.sales_orders
        FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for anon users" ON public.sales_orders;
    CREATE POLICY "Allow all for anon users" ON public.sales_orders
        FOR ALL TO anon USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.sales_order_items;
    CREATE POLICY "Allow all for authenticated users" ON public.sales_order_items
        FOR ALL TO authenticated USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all for anon users" ON public.sales_order_items;
    CREATE POLICY "Allow all for anon users" ON public.sales_order_items
        FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some policies already exist: %', SQLERRM;
END $$;

-- ====================================
-- 7. Insert Sample Data
-- ====================================
INSERT INTO public.customers (name, phone, email, address, contact_person, is_active)
VALUES
    ('บริษัท ABC จำกัด', '02-123-4567', 'contact@abc.com', '123 ถนนสุขุมวิท กรุงเทพฯ', 'คุณสมชาย ใจดี', true),
    ('ร้านค้าปลีก XYZ', '08-1234-5678', 'xyz@shop.com', '456 ถนนรัชดา กรุงเทพฯ', 'คุณสมหญิง รักสะอาด', true),
    ('โรงแรม Grand Palace', '02-987-6543', 'procurement@grandpalace.com', '789 ถนนพระราม 1 กรุงเทพฯ', 'คุณสมศักดิ์ จัดการ', true),
    ('ร้านค้าส่ง Warehouse Plus', '02-555-1234', 'orders@warehouseplus.com', '321 ถนนลาดพร้าว กรุงเทพฯ', 'คุณสมศรี จัดซื้อ', true),
    ('บริษัท Tech Solutions จำกัด', '02-666-7890', 'purchasing@techsol.com', '654 ถนนสีลม กรุงเทพฯ', 'คุณสมพงษ์ เทคโนโลยี', true)
ON CONFLICT (id) DO NOTHING;

-- ====================================
-- 8. Auto-increment Order Numbers
-- ====================================
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

DROP TRIGGER IF EXISTS trigger_generate_order_number ON public.sales_orders;
CREATE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON public.sales_orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
    EXECUTE FUNCTION public.generate_order_number();

-- ====================================
-- SUCCESS MESSAGE
-- ====================================
SELECT 'SUCCESS: Sales System Database Created!' as status,
       (SELECT COUNT(*) FROM public.customers) as customer_count,
       'All 404/400 errors should now be fixed!' as message;`;

  const productsViewSQL = `-- ==========================================
-- Products Summary Views Migration
-- Fix products availability for Sales
-- ==========================================

-- Drop existing views
DROP VIEW IF EXISTS public.available_products_for_sales;
DROP VIEW IF EXISTS public.products_summary;

-- Create products_summary view
CREATE OR REPLACE VIEW public.products_summary AS
SELECT
    p.id as product_id,
    p.sku_code as sku,
    p.product_name,
    p.category,
    p.subcategory,
    p.brand,
    p.product_type,
    p.unit_of_measure,
    p.unit_cost,
    p.description,

    -- รวมจำนวนสต็อกจากทุก location
    COALESCE(SUM(inv.unit_level1_quantity), 0) as total_level1_quantity,
    COALESCE(SUM(inv.unit_level2_quantity), 0) as total_level2_quantity,
    COALESCE(SUM(inv.unit_level3_quantity), 0) as total_level3_quantity,

    -- คำนวณจำนวนรวมทั้งหมด (เป็น pieces)
    COALESCE(
        SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0
    ) as total_pieces,

    -- ข้อมูลการแปลงหน่วย
    COALESCE(pcr.unit_level1_name, 'ลัง') as unit_level1_name,
    COALESCE(pcr.unit_level2_name, 'กล่อง') as unit_level2_name,
    COALESCE(pcr.unit_level3_name, 'ชิ้น') as unit_level3_name,
    COALESCE(pcr.unit_level1_rate, 24) as unit_level1_rate,
    COALESCE(pcr.unit_level2_rate, 1) as unit_level2_rate,

    -- เพิ่มข้อมูลราคาสำหรับการขาย
    ROUND(p.unit_cost * 1.30, 2) as unit_price,
    ROUND(p.unit_cost * 1.30, 2) as selling_price,

    -- จำนวน location ที่มีสินค้านี้
    COUNT(DISTINCT inv.location) as location_count,

    -- location ที่มีสต็อกมากที่สุด
    (
        SELECT inv2.location
        FROM inventory_items inv2
        LEFT JOIN product_conversion_rates pcr2 ON inv2.sku = pcr2.sku
        WHERE inv2.sku = p.sku_code
        ORDER BY (
            (inv2.unit_level1_quantity * COALESCE(pcr2.unit_level1_rate, 24)) +
            (inv2.unit_level2_quantity * COALESCE(pcr2.unit_level2_rate, 1)) +
            inv2.unit_level3_quantity
        ) DESC
        LIMIT 1
    ) as primary_location,

    -- สถานะสต็อก
    CASE
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) = 0 THEN 'out_of_stock'
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) < 10 THEN 'low_stock'
        WHEN COALESCE(SUM(
            (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
            (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
            inv.unit_level3_quantity
        ), 0) < 50 THEN 'medium_stock'
        ELSE 'high_stock'
    END as stock_status,

    -- เวลาอัปเดตล่าสุด
    MAX(inv.updated_at) as last_updated,

    -- สถานะสินค้า
    p.is_active

FROM public.products p
LEFT JOIN public.inventory_items inv ON p.sku_code = inv.sku
LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku
WHERE p.is_active = true
GROUP BY
    p.id, p.sku_code, p.product_name, p.category, p.subcategory,
    p.brand, p.product_type, p.unit_of_measure, p.unit_cost,
    p.description, p.is_active,
    pcr.unit_level1_name, pcr.unit_level2_name, pcr.unit_level3_name,
    pcr.unit_level1_rate, pcr.unit_level2_rate
ORDER BY p.product_type, p.product_name;

-- Create available products view
CREATE OR REPLACE VIEW public.available_products_for_sales AS
SELECT *
FROM public.products_summary
WHERE total_pieces > 0
ORDER BY product_type, stock_status DESC, product_name;

-- Add comments
COMMENT ON VIEW public.products_summary IS 'สรุปสินค้าสำหรับ Sales - มีราคาขายและข้อมูลสต็อกครบถ้วน';
COMMENT ON VIEW public.available_products_for_sales IS 'สินค้าที่มีสต็อกสำหรับการขาย';

-- Test the views
SELECT 'SUCCESS: Products Summary Views Created!' as status,
       (SELECT COUNT(*) FROM public.products_summary) as total_products,
       (SELECT COUNT(*) FROM public.available_products_for_sales) as available_products;`;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Main Status Alert */}
      <Alert variant={status.allTablesExist ? "default" : "destructive"} className="border-2">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-lg font-semibold">
          {status.allTablesExist ? '✅ ระบบขายพร้อมใช้งาน' : '🚨 ระบบขายต้องการการติดตั้ง'}
        </AlertTitle>
        <AlertDescription className="mt-2">
          {status.allTablesExist
            ? 'ฐานข้อมูลระบบขายพร้อมใช้งานเรียบร้อยแล้ว สามารถสร้างใบสั่งซื้อและจัดการลูกค้าได้'
            : 'ตารางฐานข้อมูลสำหรับระบบขายยังไม่ถูกสร้าง กรุณา apply migrations ด้านล่างเพื่อแก้ไขปัญหา'
          }
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">สถานะระบบ</TabsTrigger>
          <TabsTrigger value="migrations">Migration Scripts</TabsTrigger>
          <TabsTrigger value="guide">คู่มือการแก้ไข</TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                ตรวจสอบสถานะฐานข้อมูล
              </CardTitle>
              <CardDescription>
                ตรวจสอบการเชื่อมต่อและสถานะตารางต่างๆ ในระบบขาย
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Connection Tests */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customers Test */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">ตารางลูกค้า</span>
                  </div>
                  {customersLoading ? (
                    <Badge variant="secondary">กำลังโหลด...</Badge>
                  ) : customersError ? (
                    <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />ไม่พบตาราง</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />พร้อมใช้งาน ({customers?.length || 0})
                    </Badge>
                  )}
                </div>

                {/* Orders Test */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="font-medium">ตารางใบสั่งซื้อ</span>
                  </div>
                  {ordersLoading ? (
                    <Badge variant="secondary">กำลังโหลด...</Badge>
                  ) : ordersError ? (
                    <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />ไม่พบตาราง</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />พร้อมใช้งาน ({orders?.length || 0})
                    </Badge>
                  )}
                </div>

                {/* Products Test */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">View สินค้า</span>
                  </div>
                  {productsLoading ? (
                    <Badge variant="secondary">กำลังโหลด...</Badge>
                  ) : productsError ? (
                    <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />ไม่พบ View</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />พร้อมใช้งาน ({products?.length || 0})
                    </Badge>
                  )}
                </div>
              </div>

              {/* Error Details */}
              {status.anyErrors && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">รายละเอียดข้อผิดพลาด:</h4>
                  <div className="space-y-1 text-sm text-red-700">
                    {customersError && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Customers: {customersError.message}</span>
                      </div>
                    )}
                    {ordersError && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Orders: {ordersError.message}</span>
                      </div>
                    )}
                    {productsError && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Products: {productsError.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Test Button */}
              <Button
                onClick={testConnection}
                disabled={isRefreshing}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'กำลังตรวจสอบ...' : 'ทดสอบการเชื่อมต่ออีกครั้ง'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Migrations Tab */}
        <TabsContent value="migrations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sales System Migration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 1: Sales System Tables</CardTitle>
                <CardDescription>
                  สร้างตาราง customers, sales_orders และ sales_order_items
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted rounded font-mono text-sm">
                  20250929_create_sales_system.sql
                </div>
                <Button
                  onClick={() => copySQLToClipboard(salesSystemSQL, 'Sales System Migration')}
                  className="w-full"
                  variant="default"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  คัดลอก SQL Script
                </Button>
              </CardContent>
            </Card>

            {/* Products View Migration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 2: Products Summary Views</CardTitle>
                <CardDescription>
                  สร้าง views สำหรับแสดงสินค้าในระบบขาย
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-muted rounded font-mono text-sm">
                  products_summary_views.sql
                </div>
                <Button
                  onClick={() => copySQLToClipboard(productsViewSQL, 'Products Summary Views')}
                  className="w-full"
                  variant="default"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  คัดลอก SQL Script
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Guide Tab */}
        <TabsContent value="guide" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                คู่มือการแก้ไขปัญหา 404/400 Errors
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">1</div>
                  <div>
                    <h4 className="font-semibold mb-2">เปิด Supabase Dashboard</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      ไปที่ dashboard ของ project และเข้าสู่ SQL Editor
                    </p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        เปิด Supabase Dashboard
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">2</div>
                  <div>
                    <h4 className="font-semibold mb-2">Run Sales System Migration</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      ไปที่แท็บ "Migration Scripts" คัดลอก SQL script แรกและรันใน SQL Editor
                    </p>
                    <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                      ⚠️ รันทีละ script และรอให้เสร็จก่อนรัน script ถัดไป
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-semibold">3</div>
                  <div>
                    <h4 className="font-semibold mb-2">Run Products Views Migration</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      คัดลอกและรัน SQL script ที่สองสำหรับ products summary views
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-semibold">4</div>
                  <div>
                    <h4 className="font-semibold mb-2">ทดสอบระบบ</h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      กลับมาที่แท็บ "สถานะระบบ" และกดปุ่ม "ทดสอบการเชื่อมต่ออีกครั้ง"
                    </p>
                    <p className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      ✅ ถ้าสำเร็จจะเห็น badge สีเขียว "พร้อมใช้งาน" ทุกรายการ
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">💡 หลังจากแก้ไขเสร็จแล้ว:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• ระบบขายจะเชื่อมต่อกับฐานข้อมูลจริง</li>
                    <li>• สามารถเลือกลูกค้าและสินค้าได้จากข้อมูลจริง</li>
                    <li>• สร้างใบสั่งซื้อและบันทึกลงฐานข้อมูลได้</li>
                    <li>• ไม่มี 404/400 errors ใน browser console อีกต่อไป</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DatabaseMigrationStatus;