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

  // Handle invalid formats like H7/4 (probably should be H1/7 or H4/7)
  if (/^[A-Z](\d+)\/(\d+)$/.test(cleaned)) {
    const match = cleaned.match(/^([A-Z])(\d+)\/(\d+)$/);
    if (match) {
      const [, row, level, position] = match;
      const levelNum = parseInt(level);
      const positionNum = parseInt(position);

      // If level is > 4, it might be a position that got mixed up
      if (levelNum > 4) {
        // Try to parse as row + level and position mixed up (e.g., H7/4 might be H4/7)
        if (levelNum <= 20 && positionNum <= 4) {
          return `${row}${positionNum}/${levelNum}`; // Swap level and position
        }
        // Or it might be row + multi-digit position (e.g., H7 might be H + position 7)
        if (positionNum <= 4) {
          return `${row}${positionNum}/${levelNum}`; // Assume position is the level
        }
      } else if (levelNum <= 4 && positionNum <= 20) {
        return `${row}${levelNum}/${positionNum}`;
      }
    }
  }

  return null; // Invalid format that needs manual review
}

async function cleanupQRCodes() {
  console.log('🧹 Cleaning up location_qr_codes location format...\n');

  try {
    // Get all invalid QR codes
    console.log('1️⃣ Finding invalid location formats in QR codes...');
    const { data: qrCodes, error: fetchError } = await supabase
      .from('location_qr_codes')
      .select('id, location, created_at')
      .eq('is_active', true);

    if (fetchError) {
      console.error('❌ Error fetching QR codes:', fetchError);
      return false;
    }

    console.log(`📊 Found ${qrCodes?.length || 0} active QR codes`);

    const targetFormat = /^[A-Z][1-4]\/([1-9]|1[0-9]|20)$/;
    const invalidQRs = qrCodes.filter(qr => !targetFormat.test(qr.location));

    console.log(`❌ Invalid formats found: ${invalidQRs.length}`);

    if (invalidQRs.length === 0) {
      console.log('✅ All QR codes already have valid location formats!');
      return true;
    }

    // Show examples of invalid formats
    console.log('\n🔍 Invalid QR codes found:');
    invalidQRs.forEach((qr, index) => {
      const normalized = normalizeLocation(qr.location);
      console.log(`   ${index + 1}. ID: ${qr.id.slice(0, 8)}... Location: "${qr.location}" → "${normalized || 'NEEDS MANUAL REVIEW'}"`);
    });

    console.log('\n2️⃣ Converting QR code locations to A1/1 format...');
    let updateCount = 0;
    let manualReviewCount = 0;

    for (const qr of invalidQRs) {
      const normalizedLocation = normalizeLocation(qr.location);

      if (normalizedLocation && normalizedLocation !== qr.location) {
        console.log(`🔄 Converting QR: "${qr.location}" → "${normalizedLocation}"`);

        const { error: updateError } = await supabase
          .from('location_qr_codes')
          .update({ location: normalizedLocation })
          .eq('id', qr.id);

        if (updateError) {
          console.error(`    ❌ Failed to update QR ${qr.id}:`, updateError);
        } else {
          updateCount++;
        }
      } else if (!normalizedLocation) {
        console.log(`⚠️  QR needs manual review: "${qr.location}" (ID: ${qr.id.slice(0, 8)}...)`);
        console.log(`    Option 1: Delete invalid QR code`);
        console.log(`    Option 2: Manually correct location`);
        manualReviewCount++;
      }
    }

    console.log(`\n✅ Updated ${updateCount} QR codes`);
    if (manualReviewCount > 0) {
      console.log(`⚠️  ${manualReviewCount} QR codes need manual review`);
    }

    // Verify results
    console.log('\n3️⃣ Verifying QR codes cleanup results...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('location_qr_codes')
      .select('location')
      .eq('is_active', true);

    if (verifyError) {
      console.error('❌ Verification error:', verifyError);
      return false;
    }

    const validQRs = verifyData?.filter(qr => targetFormat.test(qr.location)) || [];
    const stillInvalidQRs = verifyData?.filter(qr => !targetFormat.test(qr.location)) || [];

    console.log(`📊 QR Codes Cleanup Results:`);
    console.log(`   ✅ Valid format (A1/1): ${validQRs.length}`);
    console.log(`   ❌ Still invalid: ${stillInvalidQRs.length}`);
    console.log(`   📈 Success rate: ${((validQRs.length / verifyData.length) * 100).toFixed(1)}%`);

    if (stillInvalidQRs.length > 0) {
      console.log('\n🔍 Remaining invalid QR codes (need manual review):');
      stillInvalidQRs.forEach((qr, index) => {
        console.log(`   ${index + 1}. "${qr.location}"`);
      });
    }

    const success = (validQRs.length / verifyData.length) >= 0.99;

    if (success) {
      console.log('\n🎉 QR codes cleanup completed successfully!');
    } else {
      console.log('\n⚠️  QR cleanup completed with some codes needing manual review');
    }

    return success;

  } catch (error) {
    console.error('❌ QR cleanup failed:', error);
    return false;
  }
}

cleanupQRCodes().catch(console.error);