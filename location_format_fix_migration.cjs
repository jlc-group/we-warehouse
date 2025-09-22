const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Convert from old format (H1/9 = Row+Level/Position)
 * to new format (H9/1 = Row+Position/Level)
 */
function convertLocationFormat(oldLocation) {
  if (!oldLocation || typeof oldLocation !== 'string') return null;

  const cleaned = oldLocation.trim().toUpperCase();

  // Parse current format: Row+Level/Position (e.g., H1/9)
  const match = cleaned.match(/^([A-Z])([1-4])\/([1-9]|1[0-9]|20)$/);
  if (!match) return null;

  const [, row, level, position] = match;

  // Convert to new format: Row+Position/Level (e.g., H9/1)
  return `${row}${position}/${level}`;
}

async function migrateTable(tableName, locationColumn, additionalColumns = []) {
  console.log(`\n🔄 Migrating ${tableName} table...`);

  try {
    // Get all records with locations
    const columnsToSelect = ['id', locationColumn, ...additionalColumns].join(', ');

    let selectQuery = supabase
      .from(tableName)
      .select(columnsToSelect);

    if (locationColumn !== 'location_code') {
      selectQuery = selectQuery.not(locationColumn, 'is', null).neq(locationColumn, '');
    }

    const { data: records, error: fetchError } = await selectQuery;

    if (fetchError) {
      console.error(`❌ Error fetching ${tableName}:`, fetchError);
      return false;
    }

    console.log(`📊 Found ${records?.length || 0} records in ${tableName}`);

    if (!records || records.length === 0) {
      console.log(`✅ No records to migrate in ${tableName}`);
      return true;
    }

    let updateCount = 0;
    let skipCount = 0;

    for (const record of records) {
      const oldLocation = record[locationColumn];
      if (!oldLocation) continue;

      const newLocation = convertLocationFormat(oldLocation);

      if (newLocation && newLocation !== oldLocation) {
        console.log(`   🔄 Converting: "${oldLocation}" → "${newLocation}"`);

        const { error: updateError } = await supabase
          .from(tableName)
          .update({ [locationColumn]: newLocation })
          .eq('id', record.id);

        if (updateError) {
          console.error(`   ❌ Failed to update ${record.id}:`, updateError);
        } else {
          updateCount++;
        }
      } else {
        skipCount++;
      }
    }

    console.log(`   ✅ Updated: ${updateCount}, Skipped: ${skipCount}`);
    return true;

  } catch (error) {
    console.error(`❌ Migration failed for ${tableName}:`, error);
    return false;
  }
}

async function migrateMovementsTable() {
  console.log(`\n🔄 Migrating inventory_movements table (location_before and location_after)...`);

  try {
    const { data: movements, error: fetchError } = await supabase
      .from('inventory_movements')
      .select('id, location_before, location_after')
      .limit(1000);

    if (fetchError) {
      console.error(`❌ Error fetching inventory_movements:`, fetchError);
      return false;
    }

    console.log(`📊 Found ${movements?.length || 0} movement records`);

    if (!movements || movements.length === 0) {
      console.log(`✅ No movement records to migrate`);
      return true;
    }

    let updateCount = 0;

    for (const movement of movements) {
      const updates = {};
      let needsUpdate = false;

      // Convert location_before
      if (movement.location_before) {
        const newLocationBefore = convertLocationFormat(movement.location_before);
        if (newLocationBefore && newLocationBefore !== movement.location_before) {
          updates.location_before = newLocationBefore;
          needsUpdate = true;
        }
      }

      // Convert location_after
      if (movement.location_after) {
        const newLocationAfter = convertLocationFormat(movement.location_after);
        if (newLocationAfter && newLocationAfter !== movement.location_after) {
          updates.location_after = newLocationAfter;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        console.log(`   🔄 Converting movement ${movement.id}: "${movement.location_before}" → "${updates.location_before || movement.location_before}", "${movement.location_after}" → "${updates.location_after || movement.location_after}"`);

        const { error: updateError } = await supabase
          .from('inventory_movements')
          .update(updates)
          .eq('id', movement.id);

        if (updateError) {
          console.error(`   ❌ Failed to update movement ${movement.id}:`, updateError);
        } else {
          updateCount++;
        }
      }
    }

    console.log(`   ✅ Updated ${updateCount} movement records`);
    return true;

  } catch (error) {
    console.error(`❌ Migration failed for inventory_movements:`, error);
    return false;
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration results...');

  const tables = [
    { name: 'inventory_items', column: 'location' },
    { name: 'warehouse_locations', column: 'location_code' },
    { name: 'location_qr_codes', column: 'location' }
  ];

  // New format: Row+Position/Level
  const newFormat = /^[A-Z]([1-9]|1[0-9]|20)\/[1-4]$/;
  let totalRecords = 0;
  let validRecords = 0;

  for (const table of tables) {
    const { data: records, error } = await supabase
      .from(table.name)
      .select(table.column)
      .not(table.column, 'is', null)
      .neq(table.column, '');

    if (error) {
      console.error(`❌ Error verifying ${table.name}:`, error);
      continue;
    }

    const validCount = records?.filter(r => newFormat.test(r[table.column])).length || 0;
    const totalCount = records?.length || 0;

    totalRecords += totalCount;
    validRecords += validCount;

    console.log(`   ${table.name}: ${validCount}/${totalCount} valid (${((validCount/totalCount)*100).toFixed(1)}%)`);
  }

  console.log(`\n📊 Overall: ${validRecords}/${totalRecords} valid (${((validRecords/totalRecords)*100).toFixed(1)}%)`);

  return (validRecords / totalRecords) >= 0.99;
}

async function runLocationFormatMigration() {
  console.log('🚀 Starting Location Format Migration...');
  console.log('📝 Converting from Row+Level/Position to Row+Position/Level format');
  console.log('📝 Example: H1/9 → H9/1 (Row H, Position 9, Level 1)\n');

  try {
    // Migrate all tables
    const inventoryResult = await migrateTable('inventory_items', 'location');
    const warehouseResult = await migrateTable('warehouse_locations', 'location_code');
    const qrResult = await migrateTable('location_qr_codes', 'location');
    const movementsResult = await migrateMovementsTable();

    if (inventoryResult && warehouseResult && qrResult && movementsResult) {
      console.log('\n✅ All table migrations completed successfully!');

      const verificationResult = await verifyMigration();

      if (verificationResult) {
        console.log('\n🎉 Migration completed successfully!');
        console.log('✅ All location formats have been converted to Row+Position/Level');
        console.log('✅ Shelf grid will now display H9/1 instead of H1/9');
      } else {
        console.log('\n⚠️  Migration completed with some issues - manual review recommended');
      }
    } else {
      console.log('\n❌ Some migrations failed - please check errors above');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runLocationFormatMigration().catch(console.error);