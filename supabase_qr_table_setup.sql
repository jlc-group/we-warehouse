-- ==========================================
-- Create location_qr_codes table for QR code management
-- Execute this SQL in Supabase Dashboard → SQL Editor
-- ==========================================

-- Create the main table
CREATE TABLE IF NOT EXISTS public.location_qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location TEXT NOT NULL,
    qr_code_data TEXT NOT NULL,
    qr_image_url TEXT,
    inventory_snapshot JSONB,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_qr_codes_location_active
ON public.location_qr_codes (location)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_location_qr_codes_location
ON public.location_qr_codes (location);

CREATE INDEX IF NOT EXISTS idx_location_qr_codes_generated_at
ON public.location_qr_codes (generated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.location_qr_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public access (since no auth is used)
DROP POLICY IF EXISTS "Allow full access to location_qr_codes" ON public.location_qr_codes;
CREATE POLICY "Allow full access to location_qr_codes"
ON public.location_qr_codes FOR ALL USING (true);

-- Create function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_qr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS handle_location_qr_codes_updated_at ON public.location_qr_codes;
CREATE TRIGGER handle_location_qr_codes_updated_at
    BEFORE UPDATE ON public.location_qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_qr_updated_at();

-- Insert a test record to verify everything works
INSERT INTO public.location_qr_codes (
    location,
    qr_code_data,
    qr_image_url,
    inventory_snapshot,
    is_active
) VALUES (
    'TEST-LOCATION',
    '{"type":"WAREHOUSE_LOCATION","location":"TEST-LOCATION","timestamp":"2025-01-17T00:00:00.000Z"}',
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    '{"summary":{"total_items":0,"total_boxes":0,"total_loose":0,"product_types":0},"items":[]}',
    true
) ON CONFLICT DO NOTHING;

-- Verify the table was created successfully
SELECT 
    'SUCCESS: location_qr_codes table created with ' || COUNT(*) || ' test records' as result
FROM public.location_qr_codes;
