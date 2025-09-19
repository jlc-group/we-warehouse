import { supabase } from '@/integrations/supabase/client';

export async function createLocationQRTable() {
  try {

    // Check if table exists first
    const { data: tables, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'location_qr_codes');

    if (checkError) {
      console.error('Error checking table existence:', checkError);
    }

    if (tables && tables.length > 0) {
      return true;
    }

    // Create table using SQL
    const createTableSQL = `
      -- Create location_qr_codes table
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

      -- Create unique index
      CREATE UNIQUE INDEX IF NOT EXISTS idx_location_qr_codes_location_active
      ON public.location_qr_codes (location)
      WHERE is_active = TRUE;

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_location_qr_codes_location ON public.location_qr_codes (location);
      CREATE INDEX IF NOT EXISTS idx_location_qr_codes_generated_at ON public.location_qr_codes (generated_at DESC);

      -- Enable RLS
      ALTER TABLE public.location_qr_codes ENABLE ROW LEVEL SECURITY;

      -- Create RLS policy
      CREATE POLICY IF NOT EXISTS "Allow full access to location_qr_codes" ON public.location_qr_codes
          FOR ALL USING (true);

      -- Create function for updated_at
      CREATE OR REPLACE FUNCTION public.handle_qr_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          NEW.last_updated = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create trigger
      DROP TRIGGER IF EXISTS handle_location_qr_codes_updated_at ON public.location_qr_codes;
      CREATE TRIGGER handle_location_qr_codes_updated_at
          BEFORE UPDATE ON public.location_qr_codes
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_qr_updated_at();
    `;

    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });

    if (error) {
      console.error('❌ Error creating table:', error);

      // Try alternative method - direct table creation

      // Use individual operations
      const { error: createError } = await supabase.rpc('exec', {
        sql: `CREATE TABLE IF NOT EXISTS public.location_qr_codes (
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
        )`
      });

      if (createError) {
        console.error('❌ Alternative table creation failed:', createError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to create table:', error);
    return false;
  }
}