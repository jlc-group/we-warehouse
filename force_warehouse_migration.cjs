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

async function forceWarehouseMigration() {
  console.log('🔧 Force updating warehouse_locations to A1/1 format...\n');

  try {
    // Get all records one by one and update
    const { data: locations, error: fetchError } = await supabase
      .from('warehouse_locations')
      .select('id, location_code')
      .order('id');

    if (fetchError) {
      console.error('❌ Error fetching locations:', fetchError);
      return;
    }

    console.log(`📊 Found ${locations.length} locations to update`);

    let updateCount = 0;
    for (const location of locations) {
      const oldCode = location.location_code;
      let newCode = oldCode;

      // Convert A/1/01 format to A1/1
      if (/^[A-Z]\/[1-4]\/([0-9]|[01][0-9]|20)$/.test(oldCode)) {
        const [row, level, position] = oldCode.split('/');
        const positionNum = parseInt(position);
        newCode = `${row}${level}/${positionNum}`;

        console.log(`🔄 ${updateCount + 1}/${locations.length}: "${oldCode}" → "${newCode}"`);

        const { error: updateError } = await supabase
          .from('warehouse_locations')
          .update({ location_code: newCode })
          .eq('id', location.id);

        if (updateError) {
          console.error(`❌ Failed to update ${location.id}:`, updateError);
        } else {
          updateCount++;
        }
      }
    }

    console.log(`\n✅ Updated ${updateCount} locations`);

    // Verify results
    const { data: verifyData, error: verifyError } = await supabase
      .from('warehouse_locations')
      .select('location_code')
      .limit(10);

    if (!verifyError) {
      console.log('\n🔍 Sample results:');
      verifyData.forEach((loc, i) => {
        const isValid = /^[A-N][1-4]\/([1-9]|1[0-9]|20)$/.test(loc.location_code);
        console.log(`   ${i + 1}. "${loc.location_code}" ${isValid ? '✅' : '❌'}`);
      });
    }

  } catch (error) {
    console.error('❌ Force migration failed:', error);
  }
}

forceWarehouseMigration().catch(console.error);