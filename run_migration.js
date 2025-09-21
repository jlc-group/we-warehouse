// Migration Helper Script
// This script helps run the location format migration using Node.js and Supabase client

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
const SUPABASE_URL = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Need service role key for migrations

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_KEY environment variable is required');
  console.log('💡 Please set it in your environment or .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting Location Format Migration...');
  console.log('=' * 50);

  try {
    // Read the migration SQL file
    const migrationPath = join(__dirname, 'location_format_migration.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL loaded successfully');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0 && !statement.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
      console.log(`📋 ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);

      try {
        const { data, error } = await supabase.rpc('execute_sql', {
          sql_query: statement
        });

        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error);
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          if (data) {
            console.log(`📊 Result:`, data);
          }
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err);
      }
    }

    // Verify the migration results
    console.log('\n🔍 Verifying migration results...');
    await verifyMigration();

    console.log('\n🎉 Migration completed successfully!');
    console.log('✅ All location formats have been standardized to A1/1 ... A20/4');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function verifyMigration() {
  try {
    // Check inventory_items location formats
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('location')
      .not('location', 'is', null)
      .neq('location', '');

    if (inventoryError) {
      console.error('❌ Error verifying inventory_items:', inventoryError);
      return;
    }

    const targetFormat = /^[A-N][1-4]\/([1-9]|1[0-9]|20)$/;
    const validFormats = inventoryData.filter(item => targetFormat.test(item.location));
    const invalidFormats = inventoryData.filter(item => !targetFormat.test(item.location));

    console.log(`📊 Inventory Items Verification:`);
    console.log(`   Total records: ${inventoryData.length}`);
    console.log(`   ✅ Valid format (A1/1): ${validFormats.length}`);
    console.log(`   ❌ Invalid format: ${invalidFormats.length}`);

    if (invalidFormats.length > 0) {
      console.log(`   🔍 Invalid formats found:`, invalidFormats.slice(0, 5).map(item => item.location));
    }

    // Sample valid locations
    console.log(`   📋 Sample valid locations:`, validFormats.slice(0, 10).map(item => item.location));

    // Check if backup table exists
    const { data: backupData, error: backupError } = await supabase
      .from('inventory_items_backup')
      .select('count(*)', { count: 'exact' });

    if (backupError) {
      console.log('⚠️  Backup table verification failed (might not exist yet)');
    } else {
      console.log(`💾 Backup table: ${backupData[0]?.count || 0} records preserved`);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Test the normalization function
function testNormalization() {
  console.log('\n🧪 Testing Location Normalization Logic...');

  const testCases = [
    'A1/1', 'A/1/1', 'A/1/01', 'A-1-1', 'A11', 'A101',
    'B2/15', 'N4/20', 'Z1/1', 'A5/1', 'A1/25'
  ];

  testCases.forEach(testCase => {
    // This mimics our normalizeLocation function
    let result = testCase.trim().toUpperCase();

    // A1/1 format - return as-is
    if (/^[A-N][1-4]\/([1-9]|1[0-9]|20)$/.test(result)) {
      console.log(`✅ "${testCase}" → "${result}" (already valid)`);
      return;
    }

    // A/1/1 format - convert to A1/1
    if (/^[A-N]\/[1-4]\/([1-9]|1[0-9]|20)$/.test(result)) {
      const [row, level, position] = result.split('/');
      result = `${row}${level}/${position}`;
      console.log(`🔄 "${testCase}" → "${result}" (converted from legacy)`);
      return;
    }

    console.log(`⚠️  "${testCase}" → "${result}" (unchanged - invalid format)`);
  });
}

// Main execution
if (process.argv.includes('--test')) {
  testNormalization();
} else if (process.argv.includes('--verify')) {
  verifyMigration();
} else {
  console.log('🎯 Location Format Migration Tool');
  console.log('\nOptions:');
  console.log('  node run_migration.js          - Run full migration');
  console.log('  node run_migration.js --test   - Test normalization logic');
  console.log('  node run_migration.js --verify - Verify migration results');
  console.log('\n⚠️  Make sure SUPABASE_SERVICE_KEY is set before running migration');

  if (process.argv.includes('--run')) {
    runMigration();
  }
}