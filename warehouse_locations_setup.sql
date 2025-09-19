-- Warehouse Locations Table Setup Script
-- สำหรับรันใน Supabase SQL Editor

-- Create the warehouse_locations table
CREATE TABLE IF NOT EXISTS public.warehouse_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  location_code TEXT NOT NULL UNIQUE,
  row TEXT NOT NULL CHECK (row ~ '^[A-Z]$'),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 99),
  location_type TEXT NOT NULL DEFAULT 'shelf' CHECK (location_type IN ('shelf', 'floor', 'special')),
  capacity_boxes INTEGER DEFAULT 100 CHECK (capacity_boxes >= 0),
  capacity_loose INTEGER DEFAULT 1000 CHECK (capacity_loose >= 0),
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID
);

-- Enable Row Level Security
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;

-- Create policy for all access
CREATE POLICY IF NOT EXISTS "Enable all access for warehouse_locations"
ON public.warehouse_locations FOR ALL USING (true);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS warehouse_locations_location_code_idx
ON public.warehouse_locations(location_code);

CREATE INDEX IF NOT EXISTS warehouse_locations_active_idx
ON public.warehouse_locations(is_active) WHERE is_active = true;

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_warehouse_locations_updated_at ON public.warehouse_locations;
CREATE TRIGGER update_warehouse_locations_updated_at
  BEFORE UPDATE ON public.warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add sample data
INSERT INTO public.warehouse_locations (location_code, row, level, position, location_type, capacity_boxes, capacity_loose, description) VALUES
('A/1/01', 'A', 1, 1, 'shelf', 100, 1000, 'ชั้นวางแถว A ชั้น 1 ตำแหน่ง 1'),
('A/1/02', 'A', 1, 2, 'shelf', 100, 1000, 'ชั้นวางแถว A ชั้น 1 ตำแหน่ง 2'),
('A/2/01', 'A', 2, 1, 'shelf', 150, 1500, 'ชั้นวางแถว A ชั้น 2 ตำแหน่ง 1'),
('B/1/01', 'B', 1, 1, 'shelf', 100, 1000, 'ชั้นวางแถว B ชั้น 1 ตำแหน่ง 1'),
('F/1/01', 'F', 1, 1, 'floor', 500, 5000, 'พื้นเก็บแถว F ตำแหน่ง 1')
ON CONFLICT (location_code) DO NOTHING;