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

async function finalQRCleanup() {
  console.log('🧹 Final QR Code Format Cleanup...\n');

  try {
    // Get all QR codes
    const { data: qrCodes, error: qrError } = await supabase
      .from('location_qr_codes')
      .select('id, location')
      .eq('is_active', true);

    if (qrError) {
      console.error('❌ Error accessing QR codes:', qrError);
      return;
    }

    console.log(`📊 Found ${qrCodes?.length || 0} QR codes to check`);

    let updateCount = 0;

    for (const qr of qrCodes || []) {
      const oldLocation = qr.location;
      let newLocation = oldLocation;

      // Remove leading zeros from position: A1/01 → A1/1, A1/05 → A1/5
      if (/^[A-N]\d+\/0\d+$/.test(oldLocation)) {
        newLocation = oldLocation.replace(/\/0(\d+)$/, '/$1');
      }

      if (newLocation !== oldLocation) {
        console.log(`  🔄 QR Fix: "${oldLocation}" → "${newLocation}"`);

        const { error: updateError } = await supabase
          .from('location_qr_codes')
          .update({ location: newLocation })
          .eq('id', qr.id);

        if (updateError) {
          console.error(`    ❌ Failed to update QR ${qr.id}:`, updateError);
        } else {
          updateCount++;
        }
      }
    }

    console.log(`✅ Updated ${updateCount} QR codes`);

    // Final verification
    console.log('\n🔍 Final QR verification:');
    const { data: finalQR, error: finalError } = await supabase
      .from('location_qr_codes')
      .select('location')
      .eq('is_active', true)
      .limit(10);

    if (finalError) {
      console.error('❌ Final QR check error:', finalError);
    } else {
      const targetFormat = /^[A-N][1-4]\/([1-9]|1[0-9]|20)$/;
      const validQR = finalQR?.filter(qr => targetFormat.test(qr.location)) || [];
      const invalidQR = finalQR?.filter(qr => !targetFormat.test(qr.location)) || [];

      console.log(`📊 QR Format Results:`);
      console.log(`   ✅ Valid (A1/1): ${validQR.length}`);
      console.log(`   ❌ Invalid: ${invalidQR.length}`);

      if (invalidQR.length > 0) {
        console.log('   🔍 Remaining invalid QR formats:');
        invalidQR.slice(0, 5).forEach((qr, index) => {
          console.log(`      ${index + 1}. "${qr.location}"`);
        });
      }

      if (validQR.length > 0) {
        console.log('   ✅ Sample valid QR formats:');
        validQR.slice(0, 5).forEach((qr, index) => {
          console.log(`      ${index + 1}. "${qr.location}"`);
        });
      }
    }

    console.log('\n🎉 Final QR cleanup completed!');

  } catch (error) {
    console.error('❌ QR cleanup failed:', error);
  }
}

finalQRCleanup().catch(console.error);