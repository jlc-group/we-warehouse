const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateWarehouseLocations() {
  console.log('🏗️ Migrating warehouse_locations table to A1/1 format...\n');

  try {
    // 1. Get all warehouse locations
    console.log('1️⃣ Fetching warehouse locations...');
    const { data: locations, error: fetchError } = await supabase
      .from('warehouse_locations')
      .select('id, location_code, row, level, position');

    if (fetchError) {
      console.error('❌ Error fetching warehouse locations:', fetchError);
      return false;
    }

    console.log(`📊 Found ${locations?.length || 0} warehouse locations`);

    if (!locations || locations.length === 0) {
      console.log('📭 No warehouse locations found - migration not needed');
      return true;
    }

    // Show current data
    console.log('\n🔍 Current warehouse locations:');
    locations.forEach((location, index) => {
      console.log(`   ${index + 1}. ID: ${location.id.slice(0, 8)}... Code: "${location.location_code}" (${location.row}/${location.level}/${location.position})`);
    });

    // 2. Update location_codes to A1/1 format
    console.log('\n2️⃣ Converting location codes to A1/1 format...');
    let updateCount = 0;

    for (const location of locations) {
      const oldCode = location.location_code;
      let newCode = oldCode;

      // Convert A/1/01 format to A1/1
      if (/^[A-N]\/[1-4]\/([0-9]|[01][0-9]|20)$/.test(oldCode)) {
        const [row, level, position] = oldCode.split('/');
        const positionNum = parseInt(position);
        newCode = `${row}${level}/${positionNum}`;
      }

      if (newCode !== oldCode) {
        console.log(`  🔄 Converting: "${oldCode}" → "${newCode}"`);

        const { error: updateError } = await supabase
          .from('warehouse_locations')
          .update({ location_code: newCode })
          .eq('id', location.id);

        if (updateError) {
          console.error(`    ❌ Failed to update location ${location.id}:`, updateError);
        } else {
          updateCount++;
        }
      }
    }

    console.log(`✅ Updated ${updateCount} warehouse locations`);

    // 3. Verify results
    console.log('\n3️⃣ Verifying migration results...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('warehouse_locations')
      .select('location_code');

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
      return false;
    }

    const targetFormat = /^[A-N][1-4]\/([1-9]|1[0-9]|20)$/;
    const validLocations = verifyData?.filter(loc => targetFormat.test(loc.location_code)) || [];
    const invalidLocations = verifyData?.filter(loc => !targetFormat.test(loc.location_code)) || [];

    console.log(`📊 Migration Results:`);
    console.log(`   ✅ Valid format (A1/1): ${validLocations.length}`);
    console.log(`   ❌ Invalid format: ${invalidLocations.length}`);
    console.log(`   📈 Success rate: ${((validLocations.length / verifyData.length) * 100).toFixed(1)}%`);

    if (invalidLocations.length > 0) {
      console.log('\n🔍 Remaining invalid formats:');
      invalidLocations.slice(0, 5).forEach((location, index) => {
        console.log(`   ${index + 1}. "${location.location_code}"`);
      });
    }

    if (validLocations.length > 0) {
      console.log('\n✅ Sample valid formats:');
      validLocations.slice(0, 5).forEach((location, index) => {
        console.log(`   ${index + 1}. "${location.location_code}"`);
      });
    }

    const success = (validLocations.length / verifyData.length) >= 0.95;

    if (success) {
      console.log('\n🎉 Warehouse locations migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration completed with some issues - manual review needed');
    }

    return success;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

migrateWarehouseLocations().catch(console.error);