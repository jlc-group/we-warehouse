-- คำสั่ง SQL สำหรับสร้างตาราง product_conversion_rates ใน Supabase
-- คัดลอกและรันใน SQL Editor ของ Supabase Dashboard

-- สร้างตาราง product_conversion_rates
CREATE TABLE IF NOT EXISTS public.product_conversion_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  unit_level1_name TEXT,
  unit_level1_rate INTEGER DEFAULT 0,
  unit_level2_name TEXT,
  unit_level2_rate INTEGER DEFAULT 0,
  unit_level3_name TEXT DEFAULT 'ชิ้น',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',
  CONSTRAINT product_conversion_rates_rates_positive CHECK (
    unit_level1_rate >= 0 AND unit_level2_rate >= 0
  )
);

-- เปิดใช้งาน Row Level Security
ALTER TABLE public.product_conversion_rates ENABLE ROW LEVEL SECURITY;

-- สร้าง RLS policy
CREATE POLICY "Allow all operations on product_conversion_rates"
ON public.product_conversion_rates
FOR ALL
USING (true)
WITH CHECK (true);

-- สร้าง index เพื่อประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_product_conversion_rates_sku ON public.product_conversion_rates(sku);
CREATE INDEX IF NOT EXISTS idx_product_conversion_rates_user_id ON public.product_conversion_rates(user_id);

-- สร้าง trigger สำหรับ auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_product_conversion_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_conversion_rates_updated_at
  BEFORE UPDATE ON public.product_conversion_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_conversion_rates_updated_at();

-- เพิ่มข้อมูลตัวอย่าง
INSERT INTO public.product_conversion_rates (
  sku, product_name, unit_level1_name, unit_level1_rate, unit_level2_name, unit_level2_rate, unit_level3_name
) VALUES
('L3-8G', 'จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 8ก', 'ลัง', 504, 'กล่อง', 6, 'ชิ้น'),
('L8A-6G', 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 6 ก.รุ่นซอง', 'ลัง', 300, 'กล่อง', 12, 'ชิ้น'),
('L8B-6G', 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 02 6 ก.รุ่นซอง', 'ลัง', 300, 'กล่อง', 12, 'ชิ้น'),
('A1-40G', 'จุฬาเฮิร์บ บีบี บอดี้โลชั่น 40ก.รุ่นซอง', 'ลัง', 144, 'กล่อง', 24, 'ชิ้น'),
('T1-2G', 'จุฬาเฮิร์บ วอเตอร์เมลอน เมจิก ลิป ทินท์ 01 โกเด้นท์ควีน 2ก', NULL, 0, 'กล่อง', 12, 'ชิ้น'),
('T2-2G', 'จุฬาเฮิร์บ วอเตอร์เมลอน เมจิก ลิป ทินท์ 02 ชูก้าร์ เบบี้ 2ก', NULL, 0, 'กล่อง', 12, 'ชิ้น')
ON CONFLICT (sku) DO NOTHING;

-- ตรวจสอบผลลัพธ์
SELECT 'สร้างตาราง product_conversion_rates สำเร็จ!' as status;
SELECT COUNT(*) as total_records FROM public.product_conversion_rates;