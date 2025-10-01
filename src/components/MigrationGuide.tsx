import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Database,
  Terminal,
  ChevronDown,
  ChevronRight,
  Code,
  Play,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

// Complete migration guide component
export const MigrationGuide: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true
  });
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const markStepCompleted = (step: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [step]: !prev[step]
    }));
    if (!completedSteps[step]) {
      toast.success(`✅ ขั้นตอน ${step} เสร็จสิ้น`);
    }
  };

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`คัดลอกแล้ว: ${description}`, {
        description: 'วางใน Supabase SQL Editor ได้เลย'
      });
    });
  };

  const salesSystemSQL = `-- Sales System Migration
-- Fix 404/400 errors for Sales functionality

-- 1. Create custom types
DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM (
        'draft', 'confirmed', 'picking', 'packed', 'shipping', 'delivered', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Create customers table
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

-- 3. Create sales_orders table
CREATE TABLE IF NOT EXISTS public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    status public.order_status NOT NULL DEFAULT 'draft',
    payment_status public.payment_status NOT NULL DEFAULT 'pending',
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    required_date DATE,
    notes TEXT,
    delivery_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- 4. Create sales_order_items table
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
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create views
CREATE OR REPLACE VIEW public.sales_orders_with_customer AS
SELECT so.*, c.name as customer_name, c.phone as customer_phone,
       c.email as customer_email, c.company_name as customer_company
FROM public.sales_orders so
LEFT JOIN public.customers c ON so.customer_id = c.id;

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON public.sales_order_items(order_id);

-- 7. Enable RLS and create policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- Permissive policies for demo
CREATE POLICY "Allow all" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.sales_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.sales_order_items FOR ALL USING (true) WITH CHECK (true);

-- 8. Insert sample customers
INSERT INTO public.customers (name, phone, email, company_name, is_active) VALUES
('บริษัท ABC จำกัด', '02-123-4567', 'contact@abc.com', 'ABC Company Ltd.', true),
('ร้านค้าปลีก XYZ', '08-1234-5678', 'xyz@shop.com', 'XYZ Retail Shop', true),
('โรงแรม Grand Palace', '02-987-6543', 'procurement@grandpalace.com', 'Grand Palace Hotel', true)
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'SUCCESS: Sales System Created!' as status, COUNT(*) as customers FROM public.customers;`;

  const productsViewSQL = `-- Products Summary Views Migration
-- Create views for Sales product selection

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

    -- Stock from all locations
    COALESCE(SUM(inv.unit_level1_quantity), 0) as total_level1_quantity,
    COALESCE(SUM(inv.unit_level2_quantity), 0) as total_level2_quantity,
    COALESCE(SUM(inv.unit_level3_quantity), 0) as total_level3_quantity,

    -- Total pieces calculation
    COALESCE(SUM(
        (inv.unit_level1_quantity * COALESCE(pcr.unit_level1_rate, 24)) +
        (inv.unit_level2_quantity * COALESCE(pcr.unit_level2_rate, 1)) +
        inv.unit_level3_quantity
    ), 0) as total_pieces,

    -- Unit conversion info
    COALESCE(pcr.unit_level1_name, 'ลัง') as unit_level1_name,
    COALESCE(pcr.unit_level2_name, 'กล่อง') as unit_level2_name,
    COALESCE(pcr.unit_level3_name, 'ชิ้น') as unit_level3_name,
    COALESCE(pcr.unit_level1_rate, 24) as unit_level1_rate,
    COALESCE(pcr.unit_level2_rate, 1) as unit_level2_rate,

    -- Pricing for sales (30% markup)
    ROUND(p.unit_cost * 1.30, 2) as unit_price,
    ROUND(p.unit_cost * 1.30, 2) as selling_price,

    -- Stock status
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
        ELSE 'high_stock'
    END as stock_status,

    COUNT(DISTINCT inv.location) as location_count,
    MAX(inv.updated_at) as last_updated,
    p.is_active

FROM public.products p
LEFT JOIN public.inventory_items inv ON p.sku_code = inv.sku
LEFT JOIN public.product_conversion_rates pcr ON p.sku_code = pcr.sku
WHERE p.is_active = true
GROUP BY p.id, p.sku_code, p.product_name, p.category, p.subcategory,
         p.brand, p.product_type, p.unit_of_measure, p.unit_cost, p.description, p.is_active,
         pcr.unit_level1_name, pcr.unit_level2_name, pcr.unit_level3_name,
         pcr.unit_level1_rate, pcr.unit_level2_rate
ORDER BY p.product_type, p.product_name;

-- Create available products view
CREATE OR REPLACE VIEW public.available_products_for_sales AS
SELECT * FROM public.products_summary
WHERE total_pieces > 0
ORDER BY product_type, stock_status DESC, product_name;

-- Add comments
COMMENT ON VIEW public.products_summary IS 'Product summary for Sales with pricing';
COMMENT ON VIEW public.available_products_for_sales IS 'Products available for sales';

-- Success message
SELECT 'SUCCESS: Product Views Created!' as status,
       COUNT(*) as total_products FROM public.products_summary;`;

  const migrationSteps = [
    {
      id: 'preparation',
      title: 'เตรียมความพร้อม',
      description: 'ตรวจสอบและเตรียมการก่อนเริ่ม migration',
      items: [
        'เปิด Supabase Dashboard',
        'ไปที่ SQL Editor',
        'ตรวจสอบการเชื่อมต่อ project'
      ]
    },
    {
      id: 'sales-system',
      title: 'สร้างระบบขาย',
      description: 'สร้างตาราง customers, sales_orders และ sales_order_items',
      sqlScript: salesSystemSQL,
      items: [
        'สร้างตาราง customers',
        'สร้างตาราง sales_orders',
        'สร้างตาราง sales_order_items',
        'สร้าง views และ indexes',
        'เพิ่มข้อมูลตัวอย่าง'
      ]
    },
    {
      id: 'products-views',
      title: 'สร้าง Products Views',
      description: 'สร้าง views สำหรับแสดงสินค้าในระบบขาย',
      sqlScript: productsViewSQL,
      items: [
        'สร้าง products_summary view',
        'สร้าง available_products_for_sales view',
        'ตรวจสอบการทำงานของ views'
      ]
    },
    {
      id: 'verification',
      title: 'ตรวจสอบผลลัพธ์',
      description: 'ทดสอบการทำงานของระบบหลัง migration',
      items: [
        'ตรวจสอบตารางถูกสร้างแล้ว',
        'ทดสอบการ query ข้อมูล',
        'รีเฟรชแอปพลิเคชัน',
        'ตรวจสอบไม่มี 404/400 errors'
      ]
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            คู่มือการติดตั้งระบบขาย (Sales System Migration)
          </CardTitle>
          <CardDescription>
            แก้ไขปัญหา 404/400 errors โดยการสร้างตารางฐานข้อมูลที่จำเป็น
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>ข้อมูลสำคัญ</AlertTitle>
            <AlertDescription>
              การ migration นี้จะสร้างตารางใหม่ในฐานข้อมูล Supabase ของคุณ
              กรุณาทำตามขั้นตอนอย่างระมัดระวังและตรวจสอบการเชื่อมต่อก่อนเริ่ม
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="steps" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="steps">ขั้นตอนการทำ</TabsTrigger>
              <TabsTrigger value="scripts">SQL Scripts</TabsTrigger>
              <TabsTrigger value="troubleshooting">แก้ไขปัญหา</TabsTrigger>
            </TabsList>

            {/* Steps Tab */}
            <TabsContent value="steps" className="space-y-4">
              {migrationSteps.map((step, index) => (
                <Collapsible
                  key={step.id}
                  open={expandedSections[step.id]}
                  onOpenChange={() => toggleSection(step.id)}
                >
                  <Card className={`border-2 ${completedSteps[step.id] ? 'border-green-200 bg-green-50' : 'border-border'}`}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                              completedSteps[step.id]
                                ? 'bg-green-500 text-white'
                                : 'bg-blue-500 text-white'
                            }`}>
                              {completedSteps[step.id] ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : (
                                index + 1
                              )}
                            </div>
                            <div>
                              <CardTitle className="text-lg">{step.title}</CardTitle>
                              <CardDescription>{step.description}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {completedSteps[step.id] && (
                              <Badge variant="default" className="bg-green-500">เสร็จสิ้น</Badge>
                            )}
                            {expandedSections[step.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {step.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full flex-shrink-0" />
                              <span className="text-sm">{item}</span>
                            </div>
                          ))}

                          {step.sqlScript && (
                            <div className="mt-4 p-3 bg-muted rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Code className="h-4 w-4" />
                                  <span className="font-medium">SQL Script</span>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => copyToClipboard(step.sqlScript!, step.title)}
                                >
                                  <Copy className="h-3 w-3 mr-1" />
                                  คัดลอก
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {step.sqlScript.split('\n').slice(0, 3).join('\n')}...
                              </div>
                            </div>
                          )}

                          <div className="pt-3 border-t flex gap-2">
                            {step.id === 'preparation' && (
                              <Button asChild variant="default">
                                <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  เปิด Supabase
                                </a>
                              </Button>
                            )}

                            <Button
                              onClick={() => markStepCompleted(step.id)}
                              variant={completedSteps[step.id] ? "secondary" : "outline"}
                              size="sm"
                            >
                              {completedSteps[step.id] ? 'ยกเลิกเครื่องหมาย' : 'ทำเสร็จแล้ว'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </TabsContent>

            {/* Scripts Tab */}
            <TabsContent value="scripts" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      Sales System Script
                    </CardTitle>
                    <CardDescription>สร้างตารางหลักของระบบขาย</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-muted rounded text-sm font-mono">
                      CREATE TABLE customers, sales_orders...
                    </div>
                    <Button
                      onClick={() => copyToClipboard(salesSystemSQL, 'Sales System Script')}
                      className="w-full"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      คัดลอก Script ทั้งหมด
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Products Views Script
                    </CardTitle>
                    <CardDescription>สร้าง views สำหรับแสดงสินค้า</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 bg-muted rounded text-sm font-mono">
                      CREATE VIEW products_summary...
                    </div>
                    <Button
                      onClick={() => copyToClipboard(productsViewSQL, 'Products Views Script')}
                      className="w-full"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      คัดลอก Script ทั้งหมด
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Troubleshooting Tab */}
            <TabsContent value="troubleshooting" className="space-y-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>ปัญหาที่พบบ่อยและวิธีแก้ไข</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-red-600 mb-2">❌ Error: relation "customers" does not exist</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          ยังไม่ได้รัน Sales System migration script
                        </p>
                        <p className="text-sm">
                          <strong>วิธีแก้:</strong> รัน script ที่ 1 (Sales System Script) ในแท็บ SQL Scripts
                        </p>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-red-600 mb-2">❌ Error: permission denied for table customers</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          RLS policies ยังไม่ถูกตั้งค่า
                        </p>
                        <p className="text-sm">
                          <strong>วิธีแก้:</strong> ตรวจสอบว่ารัน script ครบถ้วน รวมถึงส่วน RLS policies
                        </p>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold text-red-600 mb-2">❌ Error: view "products_summary" does not exist</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          ยังไม่ได้รัน Products Views migration script
                        </p>
                        <p className="text-sm">
                          <strong>วิธีแก้:</strong> รัน script ที่ 2 (Products Views Script) หลังจากรัน script แรกเสร็จแล้ว
                        </p>
                      </div>
                    </div>

                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>เคล็ดลับ</AlertTitle>
                      <AlertDescription>
                        หากยังมีปัญหา ให้ลองรีเฟรชแอปพลิเคชันและตรวจสอบ browser console สำหรับ error messages เพิ่มเติม
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MigrationGuide;