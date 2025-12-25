const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', !!supabaseKey);
  console.error('\n📝 Please ensure you have a .env file with your Supabase credentials.');
  console.error('💡 Copy .env.example to .env and add your credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDuplicateQR() {
  console.log('🔧 Fixing duplicate QR codes...\n');

  try {
    // Find all QR codes for A1 location variants
    const { data: qrCodes, error: qrError } = await supabase
      .from('location_qr_codes')
      .select('id, location, created_at')
      .eq('is_active', true)
      .in('location', ['A1/1', 'A1/01']);

    if (qrError) {
      console.error('❌ Error accessing QR codes:', qrError);
      return;
    }

    console.log(`📊 Found ${qrCodes?.length || 0} QR codes for A1 location`);
    qrCodes?.forEach((qr, index) => {
      console.log(`   ${index + 1}. ID: ${qr.id.slice(0, 8)}... Location: "${qr.location}" Created: ${new Date(qr.created_at).toISOString().slice(0, 19)}`);
    });

    if (qrCodes && qrCodes.length > 1) {
      // Keep the newest QR with correct format A1/1, delete others
      const correctQR = qrCodes.find(qr => qr.location === 'A1/1');
      const oldQR = qrCodes.find(qr => qr.location === 'A1/01');

      if (correctQR && oldQR) {
        console.log(`\n🗑️ Deleting duplicate QR: "${oldQR.location}" (ID: ${oldQR.id.slice(0, 8)}...)`);

        const { error: deleteError } = await supabase
          .from('location_qr_codes')
          .delete()
          .eq('id', oldQR.id);

        if (deleteError) {
          console.error('❌ Failed to delete duplicate QR:', deleteError);
        } else {
          console.log('✅ Successfully deleted duplicate QR');
        }
      }
    }

    console.log('\n🎉 QR cleanup completed!');

  } catch (error) {
    console.error('❌ QR cleanup failed:', error);
  }
}

fixDuplicateQR().catch(console.error);