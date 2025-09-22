const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeLocation(location) {
  if (!location || typeof location !== 'string') return null;

  const cleaned = location.trim().toUpperCase();

  // If already in target format A1/1, return as-is
  if (/^[A-Z][1-4]\/([1-9]|1[0-9]|20)$/.test(cleaned)) {
    return cleaned;
  }

  // Convert A/1/1 to A1/1
  if (/^[A-Z]\/[1-4]\/([1-9]|1[0-9]|20)$/.test(cleaned)) {
    const [row, level, position] = cleaned.split('/');
    const positionNum = parseInt(position);
    return `${row}${level}/${positionNum}`;
  }

  // Convert A/1/01 to A1/1 (with leading zeros)
  if (/^[A-Z]\/[1-4]\/([0-9]|[01][0-9]|20)$/.test(cleaned)) {
    const [row, level, position] = cleaned.split('/');
    const positionNum = parseInt(position);
    return `${row}${level}/${positionNum}`;
  }

  // Handle invalid formats like A10/2, A11/1 etc.
  // These should be corrected manually based on context
  if (/^[A-Z](\d+)\/(\d+)$/.test(cleaned)) {
    const match = cleaned.match(/^([A-Z])(\d+)\/(\d+)$/);
    if (match) {
      const [, row, level, position] = match;
      const levelNum = parseInt(level);
      const positionNum = parseInt(position);

      // If level is > 4, it might be a position that got concatenated
      if (levelNum > 4) {
        // Try to parse as row + position (e.g., A10 might be A + position 10)
        if (positionNum <= 20) {
          return `${row}1/${levelNum}`; // Assume level 1
        }
      } else if (levelNum <= 4 && positionNum <= 20) {
        return `${row}${levelNum}/${positionNum}`;
      }
    }
  }

  return null; // Invalid format that needs manual review
}

async function cleanupInventoryItems() {
  console.log('🧹 Cleaning up inventory_items location format...\n');

  try {
    // Get all invalid inventory items
    console.log('1️⃣ Finding invalid location formats...');
    const { data: items, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, location')
      .not('location', 'is', null)
      .neq('location', '');

    if (fetchError) {
      console.error('❌ Error fetching inventory items:', fetchError);
      return false;
    }

    console.log(`📊 Found ${items?.length || 0} inventory items with locations`);

    const targetFormat = /^[A-Z][1-4]\/([1-9]|1[0-9]|20)$/;
    const invalidItems = items.filter(item => !targetFormat.test(item.location));

    console.log(`❌ Invalid formats found: ${invalidItems.length}`);

    if (invalidItems.length === 0) {
      console.log('✅ All inventory items already have valid location formats!');
      return true;
    }

    // Show examples of invalid formats
    console.log('\n🔍 Examples of invalid formats:');
    invalidItems.slice(0, 10).forEach((item, index) => {
      const normalized = normalizeLocation(item.location);
      console.log(`   ${index + 1}. "${item.location}" → "${normalized || 'NEEDS MANUAL REVIEW'}"`);
    });

    console.log('\n2️⃣ Converting locations to A1/1 format...');
    let updateCount = 0;
    let manualReviewCount = 0;

    for (const item of invalidItems) {
      const normalizedLocation = normalizeLocation(item.location);

      if (normalizedLocation && normalizedLocation !== item.location) {
        console.log(`🔄 Converting: "${item.location}" → "${normalizedLocation}"`);

        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({ location: normalizedLocation })
          .eq('id', item.id);

        if (updateError) {
          console.error(`    ❌ Failed to update ${item.id}:`, updateError);
        } else {
          updateCount++;
        }
      } else if (!normalizedLocation) {
        console.log(`⚠️  Manual review needed: "${item.location}" (ID: ${item.id.slice(0, 8)}...)`);
        manualReviewCount++;
      }
    }

    console.log(`\n✅ Updated ${updateCount} inventory items`);
    if (manualReviewCount > 0) {
      console.log(`⚠️  ${manualReviewCount} items need manual review`);
    }

    // Verify results
    console.log('\n3️⃣ Verifying cleanup results...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('inventory_items')
      .select('location')
      .not('location', 'is', null)
      .neq('location', '');

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
      return false;
    }

    const validItems = verifyData?.filter(item => targetFormat.test(item.location)) || [];
    const stillInvalidItems = verifyData?.filter(item => !targetFormat.test(item.location)) || [];

    console.log(`📊 Cleanup Results:`);
    console.log(`   ✅ Valid format (A1/1): ${validItems.length}`);
    console.log(`   ❌ Still invalid: ${stillInvalidItems.length}`);
    console.log(`   📈 Success rate: ${((validItems.length / verifyData.length) * 100).toFixed(1)}%`);

    if (stillInvalidItems.length > 0) {
      console.log('\n🔍 Remaining invalid formats (need manual review):');
      stillInvalidItems.slice(0, 5).forEach((item, index) => {
        console.log(`   ${index + 1}. "${item.location}"`);
      });
    }

    const success = (validItems.length / verifyData.length) >= 0.95;

    if (success) {
      console.log('\n🎉 Inventory items cleanup completed successfully!');
    } else {
      console.log('\n⚠️  Cleanup completed with some items needing manual review');
    }

    return success;

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return false;
  }
}

cleanupInventoryItems().catch(console.error);