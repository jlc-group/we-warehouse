-- Create table for storing product unit conversion rates
-- This table will store predefined conversion rates for each product SKU

CREATE TABLE IF NOT EXISTS public.product_conversion_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL, -- Product SKU code (e.g., 'L3-8G', 'L8A-6G')
  product_name TEXT NOT NULL, -- Product display name

  -- Unit Level 1 (Largest unit - e.g., %1, +5)
  unit_level1_name TEXT, -- e.g., "%1"
  unit_level1_rate INTEGER DEFAULT 0, -- How many base units (level 3) in one level 1 unit

  -- Unit Level 2 (Middle unit - e.g., %H-, AG)
  unit_level2_name TEXT, -- e.g., "%H-"
  unit_level2_rate INTEGER DEFAULT 0, -- How many base units (level 3) in one level 2 unit

  -- Unit Level 3 (Base unit - e.g., 
4I, +%'!)
  unit_level3_name TEXT DEFAULT '
4I', -- Base unit name

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000',

  -- Constraints
  CONSTRAINT product_conversion_rates_sku_unique UNIQUE (sku),
  CONSTRAINT product_conversion_rates_rates_positive CHECK (
    unit_level1_rate >= 0 AND
    unit_level2_rate >= 0
  )
);

-- Enable Row Level Security
ALTER TABLE public.product_conversion_rates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now since no authentication is required)
CREATE POLICY "Allow all operations on product_conversion_rates"
ON public.product_conversion_rates
FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_conversion_rates_sku ON public.product_conversion_rates(sku);
CREATE INDEX IF NOT EXISTS idx_product_conversion_rates_user_id ON public.product_conversion_rates(user_id);

-- Create trigger for automatic timestamp updates
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

-- Insert sample data for testing based on your examples
INSERT INTO public.product_conversion_rates (
  sku, product_name,
  unit_level1_name, unit_level1_rate,
  unit_level2_name, unit_level2_rate,
  unit_level3_name,
  user_id
) VALUES
-- L3-8G example: 1 %1 = 504 
4I, 1 %H- = 6 
4I
('L3-8G', '8,2@.4#L 55 '-@-#L@!%- 1*#5 8', '%1', 504, '%H-', 6, '
4I', '00000000-0000-0000-0000-000000000000'),

-- More sample products with different conversion rates
('L8A-6G', '8,2@.4#L '-@-#L@!%- -5-5 9
1H 01 6 .#8H-', '%1', 300, '%H-', 12, '
4I', '00000000-0000-0000-0000-000000000000'),
('L8B-6G', '8,2@.4#L '-@-#L@!%- -5-5 9
1H 02 6 .#8H-', '%1', 300, '%H-', 12, '
4I', '00000000-0000-0000-0000-000000000000'),
('A1-40G', '8,2@.4#L 55 -5IB%
1H 40.#8H-', '%1', 144, '%H-', 24, '
4I', '00000000-0000-0000-0000-000000000000'),

-- Products with only one level (no %1)
('T1-2G', '8,2@.4#L '-@-#L@!%- @!4 %4 4L 01 B@IL'5 2', NULL, 0, '%H-', 12, '
4I', '00000000-0000-0000-0000-000000000000'),
('T2-2G', '8,2@.4#L '-@-#L@!%- @!4 %4 4L 02 
9I2#L @5I 2', NULL, 0, '%H-', 12, '
4I', '00000000-0000-0000-0000-000000000000'),

-- Products with different unit names
('PILL001', '"2@!GAI'+1'', '+5', 200, 'A', 10, '@!G', '00000000-0000-0000-0000-000000000000'),
('WATER001', 'I37H! Singha 500ml', '%1', 24, NULL, 0, ''', '00000000-0000-0000-0000-000000000000')

ON CONFLICT (sku) DO NOTHING;

-- Create a view for easier querying with calculated examples
CREATE OR REPLACE VIEW product_conversion_examples AS
SELECT
  *,
  -- Example calculation: if we have 10 level1 + 2 level2 + 5 level3 units
  CASE
    WHEN unit_level1_name IS NOT NULL AND unit_level2_name IS NOT NULL THEN
      CONCAT('1'-"H2: 10 ', unit_level1_name, ' + 2 ', unit_level2_name, ' + 5 ', unit_level3_name,
             ' = ', (10 * unit_level1_rate + 2 * unit_level2_rate + 5), ' ', unit_level3_name)
    WHEN unit_level1_name IS NOT NULL THEN
      CONCAT('1'-"H2: 10 ', unit_level1_name, ' + 5 ', unit_level3_name,
             ' = ', (10 * unit_level1_rate + 5), ' ', unit_level3_name)
    WHEN unit_level2_name IS NOT NULL THEN
      CONCAT('1'-"H2: 2 ', unit_level2_name, ' + 5 ', unit_level3_name,
             ' = ', (2 * unit_level2_rate + 5), ' ', unit_level3_name)
    ELSE
      CONCAT('1'-"H2: 5 ', unit_level3_name, ' = 5 ', unit_level3_name)
  END as calculation_example
FROM public.product_conversion_rates
ORDER BY sku;

COMMENT ON TABLE public.product_conversion_rates IS 'Stores predefined unit conversion rates for each product SKU';
COMMENT ON COLUMN public.product_conversion_rates.sku IS 'Product SKU code - must be unique';
COMMENT ON COLUMN public.product_conversion_rates.unit_level1_rate IS 'How many base units (level 3) equal one level 1 unit';
COMMENT ON COLUMN public.product_conversion_rates.unit_level2_rate IS 'How many base units (level 3) equal one level 2 unit';
COMMENT ON VIEW product_conversion_examples IS 'Shows conversion rates with calculation examples';

SELECT 'Product conversion rates table created successfully!' as status;