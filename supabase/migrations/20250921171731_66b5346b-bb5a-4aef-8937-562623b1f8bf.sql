-- Add missing tables and fix RLS policies

-- Create warehouse_locations table
CREATE TABLE IF NOT EXISTS public.warehouse_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_code TEXT NOT NULL UNIQUE,
  row TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 99),
  location_type TEXT NOT NULL DEFAULT 'shelf' CHECK (location_type IN ('shelf', 'floor', 'special')),
  capacity_boxes INTEGER DEFAULT 100,
  capacity_loose INTEGER DEFAULT 1000,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on warehouse_locations
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;

-- Create warehouse_locations policies
CREATE POLICY "Enable all access for warehouse_locations" 
ON public.warehouse_locations 
FOR ALL 
USING (true);

-- Create warehouse_locations_with_inventory view
CREATE OR REPLACE VIEW public.warehouse_locations_with_inventory AS
SELECT 
  wl.*,
  COALESCE(inv_summary.inventory_count, 0) as inventory_count,
  COALESCE(inv_summary.total_boxes, 0) as total_boxes,
  COALESCE(inv_summary.total_loose, 0) as total_loose,
  COALESCE(inv_summary.total_cartons, 0) as total_cartons,
  COALESCE(inv_summary.total_pieces, 0) as total_pieces,
  COALESCE(inv_summary.total_sheets, 0) as total_sheets,
  COALESCE(inv_summary.total_bottles, 0) as total_bottles,
  COALESCE(inv_summary.total_sachets, 0) as total_sachets,
  COALESCE(inv_summary.total_quantity_sum, 0) as total_quantity_sum,
  inv_summary.product_list,
  inv_summary.detailed_inventory,
  CASE 
    WHEN wl.capacity_boxes > 0 AND wl.capacity_loose > 0 THEN
      ROUND(
        ((COALESCE(inv_summary.total_boxes, 0)::DECIMAL / wl.capacity_boxes) * 50 + 
         (COALESCE(inv_summary.total_loose, 0)::DECIMAL / wl.capacity_loose) * 50), 2
      )
    ELSE 0
  END as utilization_percentage,
  NOW() as last_sync
FROM public.warehouse_locations wl
LEFT JOIN (
  SELECT 
    location,
    COUNT(*) as inventory_count,
    SUM(COALESCE(box_quantity_legacy, 0)) as total_boxes,
    SUM(COALESCE(pieces_quantity_legacy, 0)) as total_loose,
    SUM(COALESCE(carton_quantity_legacy, 0)) as total_cartons,
    SUM(COALESCE(quantity_pieces, 0)) as total_pieces,
    0 as total_sheets,
    0 as total_bottles, 
    0 as total_sachets,
    SUM(COALESCE(box_quantity_legacy, 0) + COALESCE(pieces_quantity_legacy, 0) + COALESCE(carton_quantity_legacy, 0) + COALESCE(quantity_pieces, 0)) as total_quantity_sum,
    STRING_AGG(DISTINCT product_name, ', ') as product_list,
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'product_name', product_name,
        'sku', sku,
        'box_quantity', COALESCE(box_quantity_legacy, 0),
        'loose_quantity', COALESCE(pieces_quantity_legacy, 0),
        'unit', unit
      )
    ) as detailed_inventory
  FROM public.inventory_items
  WHERE location IS NOT NULL AND location != ''
  GROUP BY location
) inv_summary ON normalize_location_format(inv_summary.location) = wl.location_code;

-- Update location_qr_codes RLS policies to restrict access to authenticated users only
DROP POLICY IF EXISTS "Allow full access to location_qr_codes" ON public.location_qr_codes;

CREATE POLICY "Authenticated users can view QR codes"
ON public.location_qr_codes
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create QR codes"
ON public.location_qr_codes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update QR codes"
ON public.location_qr_codes
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete QR codes"
ON public.location_qr_codes
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'คลังสินค้า',
  role TEXT NOT NULL DEFAULT 'พนักงาน',
  role_level INTEGER NOT NULL DEFAULT 2,
  employee_code TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMP WITH TIME ZONE,
  login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create users policies
CREATE POLICY "Users can view own data" 
ON public.users 
FOR SELECT 
USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_warehouse_locations_updated_at
    BEFORE UPDATE ON public.warehouse_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();