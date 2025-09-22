const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyAllTablesFormat() {
  console.log('🔍 Verifying location format consistency across all 4 tables...\n');

  const targetFormat = /^[A-Z][1-4]\/([1-9]|1[0-9]|20)$/;
  let overallResults = {
    inventory_items: { total: 0, valid: 0, invalid: 0 },
    warehouse_locations: { total: 0, valid: 0, invalid: 0 },
    location_qr_codes: { total: 0, valid: 0, invalid: 0 },
    inventory_movements: { total: 0, valid: 0, invalid: 0 }
  };

  try {
    // 1. Check inventory_items table
    console.log('1️⃣ Checking inventory_items table:');
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('location')
      .not('location', 'is', null)
      .neq('location', '');

    if (inventoryError) {
      console.error('❌ Error:', inventoryError);
    } else {
      const validInventory = inventoryItems.filter(item => targetFormat.test(item.location));
      const invalidInventory = inventoryItems.filter(item => !targetFormat.test(item.location));

      overallResults.inventory_items = {
        total: inventoryItems.length,
        valid: validInventory.length,
        invalid: invalidInventory.length
      };

      console.log(`   📊 Total: ${inventoryItems.length}`);
      console.log(`   ✅ Valid (A1/1): ${validInventory.length}`);
      console.log(`   ❌ Invalid: ${invalidInventory.length}`);
      console.log(`   📈 Success rate: ${((validInventory.length / inventoryItems.length) * 100).toFixed(1)}%`);

      if (invalidInventory.length > 0) {
        console.log('   🔍 Invalid examples:');
        invalidInventory.slice(0, 3).forEach((item, index) => {
          console.log(`      ${index + 1}. "${item.location}"`);
        });
      }
    }

    // 2. Check warehouse_locations table
    console.log('\n2️⃣ Checking warehouse_locations table:');
    const { data: warehouseLocations, error: warehouseError } = await supabase
      .from('warehouse_locations')
      .select('location_code')
      .limit(1000);

    if (warehouseError) {
      console.error('❌ Error:', warehouseError);
    } else {
      const validWarehouse = warehouseLocations.filter(loc => targetFormat.test(loc.location_code));
      const invalidWarehouse = warehouseLocations.filter(loc => !targetFormat.test(loc.location_code));

      overallResults.warehouse_locations = {
        total: warehouseLocations.length,
        valid: validWarehouse.length,
        invalid: invalidWarehouse.length
      };

      console.log(`   📊 Total: ${warehouseLocations.length}`);
      console.log(`   ✅ Valid (A1/1): ${validWarehouse.length}`);
      console.log(`   ❌ Invalid: ${invalidWarehouse.length}`);
      console.log(`   📈 Success rate: ${((validWarehouse.length / warehouseLocations.length) * 100).toFixed(1)}%`);

      if (invalidWarehouse.length > 0) {
        console.log('   🔍 Invalid examples:');
        invalidWarehouse.slice(0, 3).forEach((loc, index) => {
          console.log(`      ${index + 1}. "${loc.location_code}"`);
        });
      }
    }

    // 3. Check location_qr_codes table
    console.log('\n3️⃣ Checking location_qr_codes table:');
    const { data: qrCodes, error: qrError } = await supabase
      .from('location_qr_codes')
      .select('location')
      .eq('is_active', true);

    if (qrError) {
      console.error('❌ Error:', qrError);
    } else {
      const validQR = qrCodes.filter(qr => targetFormat.test(qr.location));
      const invalidQR = qrCodes.filter(qr => !targetFormat.test(qr.location));

      overallResults.location_qr_codes = {
        total: qrCodes.length,
        valid: validQR.length,
        invalid: invalidQR.length
      };

      console.log(`   📊 Total: ${qrCodes.length}`);
      console.log(`   ✅ Valid (A1/1): ${validQR.length}`);
      console.log(`   ❌ Invalid: ${invalidQR.length}`);
      console.log(`   📈 Success rate: ${((validQR.length / qrCodes.length) * 100).toFixed(1)}%`);

      if (invalidQR.length > 0) {
        console.log('   🔍 Invalid examples:');
        invalidQR.slice(0, 3).forEach((qr, index) => {
          console.log(`      ${index + 1}. "${qr.location}"`);
        });
      }
    }

    // 4. Check inventory_movements table (sample check)
    console.log('\n4️⃣ Checking inventory_movements table (sample):');
    const { data: movements, error: movementsError } = await supabase
      .from('inventory_movements')
      .select('location_before, location_after')
      .not('location_before', 'is', null)
      .limit(100);

    if (movementsError) {
      console.error('❌ Error:', movementsError);
    } else {
      let allMovementLocations = [];
      movements.forEach(mov => {
        if (mov.location_before) allMovementLocations.push(mov.location_before);
        if (mov.location_after) allMovementLocations.push(mov.location_after);
      });

      allMovementLocations = allMovementLocations.filter(loc => loc && loc.trim() !== '');
      const validMovements = allMovementLocations.filter(loc => targetFormat.test(loc));
      const invalidMovements = allMovementLocations.filter(loc => !targetFormat.test(loc));

      overallResults.inventory_movements = {
        total: allMovementLocations.length,
        valid: validMovements.length,
        invalid: invalidMovements.length
      };

      console.log(`   📊 Total location fields: ${allMovementLocations.length}`);
      console.log(`   ✅ Valid (A1/1): ${validMovements.length}`);
      console.log(`   ❌ Invalid: ${invalidMovements.length}`);
      if (allMovementLocations.length > 0) {
        console.log(`   📈 Success rate: ${((validMovements.length / allMovementLocations.length) * 100).toFixed(1)}%`);
      }

      if (invalidMovements.length > 0) {
        console.log('   🔍 Invalid examples:');
        [...new Set(invalidMovements)].slice(0, 3).forEach((loc, index) => {
          console.log(`      ${index + 1}. "${loc}"`);
        });
      }
    }

    // 5. Overall Summary
    console.log('\n📊 OVERALL SUMMARY:');
    console.log('====================');

    let grandTotal = 0;
    let grandValid = 0;

    Object.entries(overallResults).forEach(([table, results]) => {
      console.log(`${table.replace(/_/g, ' ').toUpperCase()}:`);
      console.log(`   Total: ${results.total}, Valid: ${results.valid}, Invalid: ${results.invalid}`);
      if (results.total > 0) {
        console.log(`   Success: ${((results.valid / results.total) * 100).toFixed(1)}%`);
      }
      grandTotal += results.total;
      grandValid += results.valid;
    });

    console.log('\nGRAND TOTAL:');
    console.log(`   📊 Total location fields: ${grandTotal}`);
    console.log(`   ✅ Valid A1/1 format: ${grandValid}`);
    console.log(`   ❌ Invalid format: ${grandTotal - grandValid}`);
    console.log(`   🎯 Overall success rate: ${((grandValid / grandTotal) * 100).toFixed(1)}%`);

    const overallSuccess = (grandValid / grandTotal) >= 0.95;

    if (overallSuccess) {
      console.log('\n🎉 EXCELLENT! All tables are using A1/1 format consistently!');
      console.log('✅ Location format standardization is complete across the entire system');
    } else {
      console.log('\n⚠️  Some inconsistencies found - may need additional cleanup');
    }

    console.log('\n🏁 Verification completed!');
    return overallSuccess;

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return false;
  }
}

verifyAllTablesFormat().catch(console.error);