-- Create location_qr_codes table for storing QR code data
CREATE TABLE IF NOT EXISTS public.location_qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location TEXT NOT NULL,
    qr_code_data TEXT NOT NULL,
    qr_image_url TEXT,
    inventory_snapshot JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on location (only one active QR per location)
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_qr_codes_location_active
ON public.location_qr_codes (location)
WHERE is_active = TRUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_location_qr_codes_location ON public.location_qr_codes (location);
CREATE INDEX IF NOT EXISTS idx_location_qr_codes_generated_at ON public.location_qr_codes (generated_at DESC);

-- Enable RLS
ALTER TABLE public.location_qr_codes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now - no authentication required)
CREATE POLICY "Allow full access to location_qr_codes" ON public.location_qr_codes
    FOR ALL USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS handle_location_qr_codes_updated_at ON public.location_qr_codes;
CREATE TRIGGER handle_location_qr_codes_updated_at
    BEFORE UPDATE ON public.location_qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Add comment to table
COMMENT ON TABLE public.location_qr_codes IS 'Stores QR codes for warehouse locations with inventory snapshots';
COMMENT ON COLUMN public.location_qr_codes.location IS 'Warehouse location (e.g., A/1/1)';
COMMENT ON COLUMN public.location_qr_codes.qr_code_data IS 'JSON data encoded in QR code';
COMMENT ON COLUMN public.location_qr_codes.qr_image_url IS 'URL to QR code image file (optional)';
COMMENT ON COLUMN public.location_qr_codes.inventory_snapshot IS 'Snapshot of inventory data at time of QR generation';
COMMENT ON COLUMN public.location_qr_codes.is_active IS 'Whether this QR code is currently active';