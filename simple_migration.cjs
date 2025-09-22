const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCurrentFormat() {
  console.log('🔍 Checking current location formats in database...');

  const { data, error } = await supabase
    .from('inventory_items')
    .select('location')
    .not('location', 'is', null)
    .limit(15);

  if (error) {
    console.error('❌ Error querying inventory_items:', error);
    return false;
  }

  console.log('📊 Current location formats in database:');
  if (data && data.length > 0) {
    data.forEach((item, index) => {
      console.log(`  ${index + 1}. "${item.location}"`);
    });

    // Analyze formats
    const formats = data.map(item => item.location);
    const hasOldFormat = formats.some(loc => /^[A-N]\/[1-4]\/0?\d+/.test(loc));
    const hasNewFormat = formats.some(loc => /^[A-N][1-4]\/\d+$/.test(loc));

    console.log('\n📈 Format Analysis:');
    console.log(`  - Old format (A/1/01): ${hasOldFormat ? '✅ Found' : '❌ Not found'}`);
    console.log(`  - New format (A1/1): ${hasNewFormat ? '✅ Found' : '❌ Not found'}`);

    return hasOldFormat;
  } else {
    console.log('📭 No inventory items found');
    return false;
  }
}

async function runSimpleMigration() {
  console.log('\n🔄 Starting location format migration...');

  try {
    // Step 1: Check what needs to be updated
    const { data: itemsToUpdate, error: checkError } = await supabase
      .from('inventory_items')
      .select('id, location')
      .not('location', 'is', null)
      .like('location', '%/%/%');

    if (checkError) {
      console.error('❌ Error checking items:', checkError);
      return;
    }

    console.log(`📊 Found ${itemsToUpdate?.length || 0} items to potentially update`);

    let updateCount = 0;

    // Step 2: Update items one by one
    for (const item of itemsToUpdate || []) {
      const oldLocation = item.location;

      // Convert A/1/01 to A1/1 format
      let newLocation = oldLocation;

      // Handle A/1/01 format -> A1/1
      if (/^[A-N]\/[1-4]\/0?(\d+)$/.test(oldLocation)) {
        newLocation = oldLocation.replace(/^([A-N])\/([1-4])\/0?(\d+)$/, '$1$2/$3');
      }

      if (newLocation !== oldLocation) {
        console.log(`  🔄 Updating: "${oldLocation}" → "${newLocation}"`);

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

    console.log(`\n✅ Migration completed! Updated ${updateCount} items.`);
    return updateCount > 0;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

async function main() {
  const needsMigration = await testCurrentFormat();

  if (needsMigration) {
    console.log('\n' + '='.repeat(50));
    console.log('🚨 Old format detected - running migration...');
    console.log('='.repeat(50));

    const success = await runSimpleMigration();

    if (success) {
      console.log('\n🔍 Verifying migration results...');
      await testCurrentFormat();
    }
  } else {
    console.log('\n✅ Database already uses the correct format (A1/1)');
  }
}

main().catch(console.error);