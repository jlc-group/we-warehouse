-- Migration: Create location_qr_codes table
-- Run this SQL in Supabase Dashboard → SQL Editor

-- Create the table
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    url TEXT, -- New field for direct URL access
    description TEXT -- New field for location description
);

-- Create indexes for better performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_qr_codes_location_active
ON public.location_qr_codes (location)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_location_qr_codes_location
ON public.location_qr_codes (location);

CREATE INDEX IF NOT EXISTS idx_location_qr_codes_user_id
ON public.location_qr_codes (user_id);

CREATE INDEX IF NOT EXISTS idx_location_qr_codes_created_at
ON public.location_qr_codes (created_at);

-- Enable Row Level Security
ALTER TABLE public.location_qr_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for full access (adjust based on your security needs)
DROP POLICY IF EXISTS "Allow full access to location_qr_codes" ON public.location_qr_codes;
CREATE POLICY "Allow full access to location_qr_codes"
ON public.location_qr_codes FOR ALL USING (true);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_location_qr_codes_updated_at ON public.location_qr_codes;
CREATE TRIGGER update_location_qr_codes_updated_at
    BEFORE UPDATE ON public.location_qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- INSERT INTO public.location_qr_codes (location, qr_code_data, description, is_active)
-- VALUES
--     ('A/1/01', 'sample_qr_data_a101', 'ชั้น A แถว 1 ตำแหน่ง 01', true),
--     ('A/1/02', 'sample_qr_data_a102', 'ชั้น A แถว 1 ตำแหน่ง 02', true),
--     ('B/1/01', 'sample_qr_data_b101', 'ชั้น B แถว 1 ตำแหน่ง 01', true);

-- Verify table creation
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'location_qr_codes'
ORDER BY ordinal_position;