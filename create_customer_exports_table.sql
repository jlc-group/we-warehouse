-- ============================================================================
-- CREATE CUSTOMER EXPORTS TABLE
-- สำหรับเก็บประวัติการส่งออกสินค้าไปยังลูกค้า
-- ============================================================================

-- Create customer_exports table
CREATE TABLE IF NOT EXISTS public.customer_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Export information
  export_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  export_number VARCHAR(50) UNIQUE, -- เลขที่ใบส่งสินค้า (สร้างอัตโนมัติ)

  -- Customer information
  customer_id UUID, -- Foreign key to customers table
  customer_name VARCHAR(255) NOT NULL,
  customer_code VARCHAR(50),

  -- Product information
  product_name VARCHAR(255) NOT NULL,
  product_code VARCHAR(100),
  inventory_item_id UUID,

  -- Quantity and location
  quantity_exported INTEGER NOT NULL,
  unit VARCHAR(50),
  from_location VARCHAR(100),

  -- Additional info
  notes TEXT,
  po_reference VARCHAR(100), -- อ้างอิงใบสั่งซื้อของลูกค้า

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::uuid,

  -- Foreign key constraints
  CONSTRAINT fk_customer
    FOREIGN KEY (customer_id)
    REFERENCES public.customers(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_inventory_item
    FOREIGN KEY (inventory_item_id)
    REFERENCES public.inventory_items(id)
    ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_exports_export_date
  ON public.customer_exports(export_date DESC);

CREATE INDEX IF NOT EXISTS idx_customer_exports_customer_name
  ON public.customer_exports(customer_name);

CREATE INDEX IF NOT EXISTS idx_customer_exports_customer_code
  ON public.customer_exports(customer_code);

CREATE INDEX IF NOT EXISTS idx_customer_exports_customer_id
  ON public.customer_exports(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_exports_product_name
  ON public.customer_exports(product_name);

CREATE INDEX IF NOT EXISTS idx_customer_exports_inventory_item
  ON public.customer_exports(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_customer_exports_from_location
  ON public.customer_exports(from_location);

CREATE INDEX IF NOT EXISTS idx_customer_exports_export_number
  ON public.customer_exports(export_number);

-- Create function to generate export number
CREATE OR REPLACE FUNCTION generate_export_number()
RETURNS TEXT AS $$
DECLARE
  next_number INTEGER;
  export_number TEXT;
  today_date TEXT;
BEGIN
  -- Format: EXP-YYYYMMDD-XXXX
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Get next number for today
  SELECT COALESCE(MAX(CAST(SUBSTRING(export_number FROM 14) AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.customer_exports
  WHERE export_number LIKE 'EXP-' || today_date || '-%';

  -- Generate export number
  export_number := 'EXP-' || today_date || '-' || LPAD(next_number::TEXT, 4, '0');

  RETURN export_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate export number
CREATE OR REPLACE FUNCTION set_export_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.export_number IS NULL THEN
    NEW.export_number := generate_export_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_export_number ON public.customer_exports;
CREATE TRIGGER trigger_set_export_number
  BEFORE INSERT ON public.customer_exports
  FOR EACH ROW
  EXECUTE FUNCTION set_export_number();

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_customer_exports_updated_at ON public.customer_exports;
CREATE TRIGGER update_customer_exports_updated_at
  BEFORE UPDATE ON public.customer_exports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.customer_exports ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (allow all for now)
DROP POLICY IF EXISTS "Enable all access for customer_exports" ON public.customer_exports;
CREATE POLICY "Enable all access for customer_exports"
  ON public.customer_exports
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE public.customer_exports IS 'บันทึกประวัติการส่งออกสินค้าไปยังลูกค้า';
COMMENT ON COLUMN public.customer_exports.export_number IS 'เลขที่ใบส่งสินค้า (สร้างอัตโนมัติ)';
COMMENT ON COLUMN public.customer_exports.customer_name IS 'ชื่อลูกค้า';
COMMENT ON COLUMN public.customer_exports.customer_code IS 'รหัสลูกค้า';
COMMENT ON COLUMN public.customer_exports.po_reference IS 'เลขที่ใบสั่งซื้อของลูกค้า';

-- Done!
SELECT 'Customer exports table created successfully!' AS result;
