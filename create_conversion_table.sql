-- Create product conversion rates table
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
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'
);

-- Enable RLS
ALTER TABLE public.product_conversion_rates ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on product_conversion_rates"
ON public.product_conversion_rates FOR ALL USING (true) WITH CHECK (true);

-- Insert sample data
INSERT INTO public.product_conversion_rates (
  sku, product_name, unit_level1_name, unit_level1_rate, unit_level2_name, unit_level2_rate, unit_level3_name
) VALUES
('L3-8G', 'จุฬาเฮิร์บ ดีดี วอเตอร์เมลอน ซันสกรีน 8ก', 'ลัง', 504, 'กล่อง', 6, 'ชิ้น'),
('L8A-6G', 'จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 6 ก.รุ่นซอง', 'ลัง', 300, 'กล่อง', 12, 'ชิ้น'),
('T1-2G', 'จุฬาเฮิร์บ วอเตอร์เมลอน เมจิก ลิป ทินท์ 01 โกเด้นท์ควีน 2ก', NULL, 0, 'กล่อง', 12, 'ชิ้น')
ON CONFLICT (sku) DO NOTHING;