-- Create warehouses table
-- This table is referenced throughout the codebase but was missing

CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Location configuration
  location_prefix_start VARCHAR(10) DEFAULT 'A',
  location_prefix_end VARCHAR(10) DEFAULT 'Z',
  max_levels INTEGER DEFAULT 10 CHECK (max_levels > 0),
  max_positions INTEGER DEFAULT 50 CHECK (max_positions > 0),
  
  -- Address and contact info
  address TEXT,
  phone VARCHAR(20),
  manager_name VARCHAR(100),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON public.warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON public.warehouses(is_active);
CREATE INDEX IF NOT EXISTS idx_warehouses_created_at ON public.warehouses(created_at);

-- Enable RLS but allow all access for now
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies
CREATE POLICY "Allow all access to warehouses" ON public.warehouses
  FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON public.warehouses TO authenticated;
GRANT ALL ON public.warehouses TO anon;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_warehouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_warehouses_updated_at
    BEFORE UPDATE ON public.warehouses
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouses_updated_at();

-- Insert sample warehouse data
INSERT INTO public.warehouses (code, name, description, is_active, location_prefix_start, location_prefix_end, max_levels, max_positions, created_at, updated_at)
VALUES
  ('A', 'Warehouse A', 'คลังสินค้า A - หลัก', true, 'A', 'A', 10, 50, NOW(), NOW()),
  ('B', 'Warehouse B', 'คลังสินค้า B - รอง', true, 'B', 'B', 10, 50, NOW(), NOW()),
  ('C', 'Warehouse C', 'คลังสินค้า C - พิเศษ', true, 'C', 'C', 8, 40, NOW(), NOW()),
  ('D', 'Warehouse D', 'คลังสินค้า D - สำรอง', true, 'D', 'D', 12, 60, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  location_prefix_start = EXCLUDED.location_prefix_start,
  location_prefix_end = EXCLUDED.location_prefix_end,
  max_levels = EXCLUDED.max_levels,
  max_positions = EXCLUDED.max_positions,
  updated_at = NOW();

-- Add comments for documentation
COMMENT ON TABLE public.warehouses IS 'Master warehouse configuration table';
COMMENT ON COLUMN public.warehouses.code IS 'Unique warehouse code (A, B, C, D, etc.)';
COMMENT ON COLUMN public.warehouses.name IS 'Display name for the warehouse';
COMMENT ON COLUMN public.warehouses.location_prefix_start IS 'Starting prefix for location codes in this warehouse';
COMMENT ON COLUMN public.warehouses.location_prefix_end IS 'Ending prefix for location codes in this warehouse';
COMMENT ON COLUMN public.warehouses.max_levels IS 'Maximum number of levels/shelves in this warehouse';
COMMENT ON COLUMN public.warehouses.max_positions IS 'Maximum number of positions per level in this warehouse';
