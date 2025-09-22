const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

// Simulate location utility functions
function displayLocation(location) {
  if (!location) return '';
  // This mimics our displayLocation function
  const cleaned = location.trim().toUpperCase();

  // If already in A1/1 format, return as-is
  if (/^[A-N][1-4]\/([1-9]|1[0-9]|20)$/.test(cleaned)) {
    return cleaned;
  }

  // Convert A/1/1 to A1/1
  if (/^[A-N]\/[1-4]\/([1-9]|1[0-9]|20)$/.test(cleaned)) {
    const [row, level, position] = cleaned.split('/');
    return `${row}${level}/${position}`;
  }

  return cleaned;
}

async function verifyMigration() {
  console.log('🔍 Verifying Location Format Migration Results...\n');

  try {
    // 1. Check overall database consistency
    console.log('1️⃣ Database Format Consistency Check:');
    const { data: allItems, error: allError } = await supabase
      .from('inventory_items')
      .select('location')
      .not('location', 'is', null)
      .neq('location', '');

    if (allError) {
      console.error('❌ Error querying inventory:', allError);
      return false;
    }

    const targetFormatRegex = /^[A-N][1-4]\/([1-9]|1[0-9]|20)$/;
    const validLocations = allItems.filter(item => targetFormatRegex.test(item.location));
    const invalidLocations = allItems.filter(item => !targetFormatRegex.test(item.location));

    console.log(`   📊 Total inventory items: ${allItems.length}`);
    console.log(`   ✅ Valid format (A1/1): ${validLocations.length}`);
    console.log(`   ❌ Invalid format: ${invalidLocations.length}`);
    console.log(`   📈 Consistency rate: ${((validLocations.length / allItems.length) * 100).toFixed(1)}%`);

    if (invalidLocations.length > 0) {
      console.log('   🔍 Invalid format examples:');
      invalidLocations.slice(0, 10).forEach((item, index) => {
        console.log(`      ${index + 1}. "${item.location}"`);
      });
    }

    // 2. Test location display functionality
    console.log('\n2️⃣ Location Display Function Test:');
    const sampleLocations = validLocations.slice(0, 10);
    sampleLocations.forEach((item, index) => {
      const dbLocation = item.location;
      const displayFormat = displayLocation(dbLocation);
      const isConsistent = dbLocation === displayFormat;
      console.log(`   ${index + 1}. DB: "${dbLocation}" → Display: "${displayFormat}" ${isConsistent ? '✅' : '❌'}`);
    });

    // 3. Check specific warehouse range compliance
    console.log('\n3️⃣ Warehouse Range Compliance Check:');
    const warehousePattern = /^[A-N][1-4]\/([1-9]|1[0-9]|20)$/;
    const warehouseCompliant = allItems.filter(item => warehousePattern.test(item.location));
    const outOfRange = allItems.filter(item => !warehousePattern.test(item.location));

    console.log(`   📊 Warehouse compliant (A-N, 1-4, 1-20): ${warehouseCompliant.length}`);
    console.log(`   ⚠️  Out of range: ${outOfRange.length}`);

    if (outOfRange.length > 0) {
      console.log('   🔍 Out of range examples:');
      outOfRange.slice(0, 5).forEach((item, index) => {
        console.log(`      ${index + 1}. "${item.location}"`);
      });
    }

    // 4. Check for user reported issue format
    console.log('\n4️⃣ Checking for Original Issue (A/1/01 format):');
    const oldFormatPattern = /^[A-N]\/[1-4]\/0[1-9]$/;
    const oldFormatItems = allItems.filter(item => oldFormatPattern.test(item.location));

    if (oldFormatItems.length === 0) {
      console.log('   ✅ No old format (A/1/01) found - migration successful!');
    } else {
      console.log(`   ❌ Found ${oldFormatItems.length} items still in old format:`);
      oldFormatItems.slice(0, 5).forEach((item, index) => {
        console.log(`      ${index + 1}. "${item.location}"`);
      });
    }

    // 5. Verify QR code table (if exists)
    console.log('\n5️⃣ QR Code Table Verification:');
    try {
      const { data: qrCodes, error: qrError } = await supabase
        .from('location_qr_codes')
        .select('location')
        .eq('is_active', true)
        .limit(10);

      if (qrError) {
        console.log('   ⚠️  QR codes table not accessible or empty');
      } else if (qrCodes && qrCodes.length > 0) {
        const validQRs = qrCodes.filter(qr => targetFormatRegex.test(qr.location));
        console.log(`   📊 QR codes found: ${qrCodes.length}`);
        console.log(`   ✅ Valid format QRs: ${validQRs.length}`);
        console.log(`   ❌ Invalid format QRs: ${qrCodes.length - validQRs.length}`);

        console.log('   🔍 Sample QR locations:');
        qrCodes.slice(0, 5).forEach((qr, index) => {
          const isValid = targetFormatRegex.test(qr.location);
          console.log(`      ${index + 1}. "${qr.location}" ${isValid ? '✅' : '❌'}`);
        });
      } else {
        console.log('   📭 No active QR codes found');
      }
    } catch (qrError) {
      console.log('   ⚠️  Unable to check QR codes table');
    }

    // 6. Summary and recommendations
    console.log('\n6️⃣ Migration Summary:');
    const successRate = (validLocations.length / allItems.length) * 100;

    if (successRate >= 95) {
      console.log('   🎉 EXCELLENT: Migration highly successful!');
      console.log('   ✅ Location format standardization complete');
      console.log('   ✅ UI should display locations consistently as A1/1 format');
    } else if (successRate >= 90) {
      console.log('   ✅ GOOD: Migration mostly successful');
      console.log('   ⚠️  Some cleanup may be needed for edge cases');
    } else {
      console.log('   ❌ NEEDS ATTENTION: Migration incomplete');
      console.log('   🔧 Additional cleanup required');
    }

    console.log(`\n📈 Overall Success Rate: ${successRate.toFixed(1)}%`);
    console.log('🏁 Migration verification completed!');

    return successRate >= 95;

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

verifyMigration().catch(console.error);