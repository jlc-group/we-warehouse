-- Create products table for comprehensive product management
-- This table will serve as the master data for all products in the warehouse

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_code VARCHAR(50) UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  product_type VARCHAR(10) NOT NULL CHECK (product_type IN ('FG', 'PK')),
  category VARCHAR(50),
  subcategory VARCHAR(50),
  brand VARCHAR(50) DEFAULT 'Chulaherb',
  description TEXT,
  unit_of_measure VARCHAR(20) DEFAULT 'pieces',
  weight DECIMAL(10,3),
  dimensions TEXT,
  storage_conditions TEXT DEFAULT 'อุณหภูมิห้อง',
  manufacturing_country VARCHAR(50) DEFAULT 'Thailand',
  reorder_level INTEGER DEFAULT 10,
  max_stock_level INTEGER DEFAULT 100,
  unit_cost DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_sku_code ON products(sku_code);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Enable read access for all users" ON products
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON products
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON products
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON products
    FOR DELETE USING (true);

-- Add comments for documentation
COMMENT ON TABLE products IS 'Master table containing all product information for warehouse management';
COMMENT ON COLUMN products.sku_code IS 'Unique SKU code for the product (e.g., FG-001, PK-CAP-001)';
COMMENT ON COLUMN products.product_type IS 'Product type: FG (Finished Goods) or PK (Packaging)';
COMMENT ON COLUMN products.category IS 'Product category (e.g., cosmetics, packaging)';
COMMENT ON COLUMN products.subcategory IS 'Product subcategory for further classification';