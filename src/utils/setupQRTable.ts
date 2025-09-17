import { supabase } from '@/integrations/supabase/client';

export async function setupQRTable() {
  try {
    console.log('🔧 Setting up location_qr_codes table...');

    // Create table using raw SQL execution
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
      DROP POLICY IF EXISTS "Allow full access to location_qr_codes" ON public.location_qr_codes;
      CREATE POLICY "Allow full access to location_qr_codes" ON public.location_qr_codes
          FOR ALL USING (true);

      -- Create trigger function for updated_at
      CREATE OR REPLACE FUNCTION public.handle_qr_updated_at()
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
          EXECUTE FUNCTION public.handle_qr_updated_at();
    `;

    // Execute the SQL directly
    const response = await fetch(`${supabase.supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabase.supabaseKey}`,
        'apikey': supabase.supabaseKey || '',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        sql: createTableSQL
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Direct SQL execution failed:', response.status, errorText);

      // Try alternative approach - individual table creation
      console.log('🔄 Trying alternative table creation approach...');

      const simpleCreateSQL = `
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

        ALTER TABLE public.location_qr_codes ENABLE ROW LEVEL SECURITY;

        CREATE POLICY IF NOT EXISTS "location_qr_codes_policy" ON public.location_qr_codes
        FOR ALL USING (true);
      `;

      const simpleResponse = await fetch(`${supabase.supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`,
          'apikey': supabase.supabaseKey || ''
        },
        body: JSON.stringify({
          sql: simpleCreateSQL
        })
      });

      if (!simpleResponse.ok) {
        throw new Error(`Alternative table creation failed: ${simpleResponse.statusText}`);
      }

      console.log('✅ Alternative table creation succeeded');
    } else {
      console.log('✅ Full table setup completed successfully');
    }

    // Verify table was created by trying to query it
    const { data, error } = await supabase
      .from('location_qr_codes')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Table verification failed:', error);
      throw error;
    }

    console.log('✅ Table location_qr_codes verified and ready to use');
    return true;

  } catch (error) {
    console.error('❌ Failed to setup QR table:', error);
    throw error;
  }
}