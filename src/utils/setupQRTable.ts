import { supabase } from '@/integrations/supabase/client';

export async function setupQRTable() {
  try {
    console.log('🔧 Setting up location_qr_codes table...');

    // Since automatic SQL execution isn't available, we'll provide clear instructions
    // and try to create a simple approach

    // First, let's try to check if the table exists by attempting a simple operation
    console.log('🔍 Checking if table exists...');

    try {
      const { data, error } = await supabase
        .from('location_qr_codes')
        .select('id')
        .limit(1);

      if (!error) {
        console.log('✅ Table already exists and is accessible');
        return true;
      }

      if (error.code !== '42P01') {
        // Some other error, not table missing
        throw error;
      }
    } catch (checkError) {
      console.log('Table does not exist, need to create manually');
    }

    // Since we can't create tables automatically, let's provide helpful guidance
    const sqlScript = `-- Run this SQL in Supabase Dashboard → SQL Editor
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

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_qr_codes_location_active
ON public.location_qr_codes (location)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_location_qr_codes_location
ON public.location_qr_codes (location);

-- Enable RLS and create policy
ALTER TABLE public.location_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow full access to location_qr_codes"
ON public.location_qr_codes FOR ALL USING (true);`;

    console.log('📋 SQL Script to run manually:');
    console.log(sqlScript);

    // Copy to clipboard if possible
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(sqlScript);
        console.log('📋 SQL script copied to clipboard');
      } catch (clipboardError) {
        console.log('Could not copy to clipboard');
      }
    }

    // Show user-friendly error with instructions
    throw new Error(`
การสร้างตารางอัตโนมัติไม่สามารถทำได้
กรุณาทำตามขั้นตอนเหล่านี้:

1. เข้า Supabase Dashboard: https://supabase.com/dashboard
2. เลือกโปรเจค warehousereport-magic
3. ไปที่ SQL Editor
4. Copy & Paste SQL script ที่แสดงใน Console
5. กด RUN เพื่อสร้างตาราง

SQL script ได้ถูก copy ไปยัง clipboard แล้ว (ถ้า browser รองรับ)
    `);

  } catch (error) {
    console.error('❌ Failed to setup QR table:', error);
    throw error;
  }
}