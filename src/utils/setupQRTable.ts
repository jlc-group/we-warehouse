import { supabase } from '@/integrations/supabase/client';

export async function setupQRTable() {
  try {
    console.log('🔍 Checking if location_qr_codes table exists...');

    // First, try to check if the table exists by attempting a simple operation
    try {
      const { data, error } = await supabase
        .from('location_qr_codes')
        .select('id')
        .limit(1);

      if (!error) {
        console.log('✅ Table exists and is accessible');
        return true;
      }

      if (error.code !== '42P01') {
        // Some other error, not table missing
        console.error('❌ Table exists but has other error:', error);
        throw error;
      }
    } catch (checkError) {
      console.log('⚠️ Table check failed, will provide migration script');
    }

    // Read the migration script from file
    const sqlScript = `-- Migration: Create location_qr_codes table
-- Copy this entire script and run it in Supabase Dashboard → SQL Editor

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
    url TEXT,
    description TEXT
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_qr_codes_location_active
ON public.location_qr_codes (location)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_location_qr_codes_location
ON public.location_qr_codes (location);

CREATE INDEX IF NOT EXISTS idx_location_qr_codes_user_id
ON public.location_qr_codes (user_id);

-- Enable RLS and create policy
ALTER TABLE public.location_qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow full access to location_qr_codes" ON public.location_qr_codes;
CREATE POLICY "Allow full access to location_qr_codes"
ON public.location_qr_codes FOR ALL USING (true);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_location_qr_codes_updated_at ON public.location_qr_codes;
CREATE TRIGGER update_location_qr_codes_updated_at
    BEFORE UPDATE ON public.location_qr_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify table creation
SELECT 'Table created successfully' as status;`;

    console.log('📋 Migration script:');
    console.log(sqlScript);

    // Copy to clipboard if possible
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(sqlScript);
        console.log('📋 Migration script copied to clipboard');
      } catch (clipboardError) {
        console.log('❌ Could not copy to clipboard:', clipboardError);
      }
    }

    // Show user-friendly error with clear instructions
    throw new Error(`🏗️ ต้องสร้างตาราง location_qr_codes

กรุณาทำตามขั้นตอนเหล่านี้:

1. 🌐 เข้า Supabase Dashboard: https://supabase.com/dashboard
2. 📂 เลือกโปรเจค warehousereport-magic
3. 🔧 ไปที่ SQL Editor (เมนูด้านซ้าย)
4. 📋 Copy & Paste migration script จาก Console (F12)
5. ▶️ กด RUN เพื่อสร้างตาราง
6. 🔄 กลับมา refresh หน้านี้

Migration script ได้ถูกแสดงใน Console และ copy ไปยัง clipboard แล้ว
ดูไฟล์: migrations/001_create_location_qr_codes.sql`);

  } catch (error) {
    console.error('❌ Failed to setup QR table:', error);
    throw error;
  }
}