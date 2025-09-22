const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function completeCleanup() {
  console.log('🧹 Running Complete Location Format Cleanup...\n');

  try {
    // Step 1: Handle remaining A/X/Y format conversions
    console.log('1️⃣ Converting remaining A/X/Y formats to AX/Y:');
    const { data: remainingOld, error: checkError } = await supabase
      .from('inventory_items')
      .select('id, location')
      .not('location', 'is', null)
      .like('location', '%/%/%');

    if (checkError) {
      console.error('❌ Error checking items:', checkError);
      return;
    }

    console.log(`📊 Found ${remainingOld?.length || 0} items with A/X/Y format`);

    let updateCount = 0;
    for (const item of remainingOld || []) {
      const oldLocation = item.location;
      let newLocation = oldLocation;

      // Convert A/X/Y format -> AX/Y (for any X and Y values)
      if (/^[A-N]\/\d+\/\d+$/.test(oldLocation)) {
        const match = oldLocation.match(/^([A-N])\/(\d+)\/(\d+)$/);
        if (match) {
          const [, row, level, position] = match;
          newLocation = `${row}${level}/${position}`;
        }
      }

      if (newLocation !== oldLocation) {
        console.log(`  🔄 Converting: "${oldLocation}" → "${newLocation}"`);

        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({ location: newLocation })
          .eq('id', item.id);

        if (updateError) {
          console.error(`    ❌ Failed to update item ${item.id}:`, updateError);
        } else {
          updateCount++;
        }
      }
    }

    console.log(`✅ Converted ${updateCount} additional items`);

    // Step 2: Update QR codes table
    console.log('\n2️⃣ Updating QR codes to new format:');
    const { data: qrCodes, error: qrError } = await supabase
      .from('location_qr_codes')
      .select('id, location')
      .eq('is_active', true);

    if (qrError) {
      console.log('⚠️  Could not access QR codes table:', qrError.message);
    } else if (qrCodes && qrCodes.length > 0) {
      let qrUpdateCount = 0;

      for (const qr of qrCodes) {
        const oldLocation = qr.location;
        let newLocation = oldLocation;

        // Convert various formats to AX/Y
        if (/^[A-N]\/\d+\/\d+$/.test(oldLocation)) {
          const match = oldLocation.match(/^([A-N])\/(\d+)\/(\d+)$/);
          if (match) {
            const [, row, level, position] = match;
            newLocation = `${row}${level}/${position}`;
          }
        }

        if (newLocation !== oldLocation) {
          console.log(`  🔄 QR Update: "${oldLocation}" → "${newLocation}"`);

          const { error: updateError } = await supabase
            .from('location_qr_codes')
            .update({ location: newLocation })
            .eq('id', qr.id);

          if (updateError) {
            console.error(`    ❌ Failed to update QR ${qr.id}:`, updateError);
          } else {
            qrUpdateCount++;
          }
        }
      }

      console.log(`✅ Updated ${qrUpdateCount} QR codes`);
    } else {
      console.log('📭 No QR codes found to update');
    }

    // Step 3: Final verification
    console.log('\n3️⃣ Final verification:');
    const { data: finalCheck, error: finalError } = await supabase
      .from('inventory_items')
      .select('location')
      .not('location', 'is', null)
      .neq('location', '');

    if (finalError) {
      console.error('❌ Final check error:', finalError);
      return;
    }

    const targetFormatRegex = /^[A-N]\d+\/\d+$/;
    const validFinal = finalCheck.filter(item => targetFormatRegex.test(item.location));
    const invalidFinal = finalCheck.filter(item => !targetFormatRegex.test(item.location));

    console.log(`📊 Final Results:`);
    console.log(`   Total items: ${finalCheck.length}`);
    console.log(`   ✅ Valid format (AX/Y): ${validFinal.length}`);
    console.log(`   ❌ Still invalid: ${invalidFinal.length}`);
    console.log(`   📈 Success rate: ${((validFinal.length / finalCheck.length) * 100).toFixed(1)}%`);

    if (invalidFinal.length > 0) {
      console.log('\n🔍 Remaining invalid formats (may be intentional):');
      const uniqueInvalid = [...new Set(invalidFinal.map(item => item.location))];
      uniqueInvalid.slice(0, 10).forEach((location, index) => {
        console.log(`   ${index + 1}. "${location}"`);
      });
    }

    // Step 4: Check warehouse compliance
    console.log('\n4️⃣ Warehouse constraint compliance:');
    const warehouseCompliant = /^[A-N][1-4]\/([1-9]|1[0-9]|20)$/;
    const compliantItems = finalCheck.filter(item => warehouseCompliant.test(item.location));
    const nonCompliantItems = finalCheck.filter(item => !warehouseCompliant.test(item.location));

    console.log(`📊 Warehouse Compliance:`);
    console.log(`   ✅ Compliant (A-N, levels 1-4, positions 1-20): ${compliantItems.length}`);
    console.log(`   ⚠️  Non-compliant (may be special locations): ${nonCompliantItems.length}`);

    if (nonCompliantItems.length > 0) {
      console.log('\n🔍 Non-compliant locations:');
      const uniqueNonCompliant = [...new Set(nonCompliantItems.map(item => item.location))];
      uniqueNonCompliant.slice(0, 10).forEach((location, index) => {
        console.log(`   ${index + 1}. "${location}"`);
      });
    }

    console.log('\n🎉 Complete cleanup finished!');

    const finalSuccessRate = (validFinal.length / finalCheck.length) * 100;
    return finalSuccessRate >= 90;

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return false;
  }
}

completeCleanup().catch(console.error);