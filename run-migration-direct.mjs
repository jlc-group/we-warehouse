#!/usr/bin/env node
/**
 * Apply Reserved Stock Migration via Supabase Client
 * Uses individual queries instead of raw SQL
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load .env manually
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    // Remove quotes
    value = value.replace(/^["'](.*)["']$/, '$1');
    envVars[key] = value;
  }
});

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY);

console.log('🔍 Checking if migration is already applied...\n');

async function checkMigration() {
  // Try to query stock_reservations table
  const { data, error } = await supabase
    .from('stock_reservations')
    .select('id')
    .limit(1);

  if (error) {
    if (error.message.includes('does not exist')) {
      console.log('❌ Migration NOT applied yet\n');
      return false;
    }
    console.error('Error checking migration:', error.message);
    return false;
  }

  console.log('✅ Migration already applied!\n');
  return true;
}

async function verifyTables() {
  console.log('🔍 Verifying tables and views...\n');

  try {
    // Check stock_reservations
    const { count: resCount, error: resError } = await supabase
      .from('stock_reservations')
      .select('*', { count: 'exact', head: true });

    if (resError) {
      console.log('  ❌ stock_reservations table:', resError.message);
    } else {
      console.log(`  ✅ stock_reservations: ${resCount || 0} rows`);
    }

    // Check inventory_available view
    const { count: availCount, error: availError } = await supabase
      .from('inventory_available')
      .select('*', { count: 'exact', head: true });

    if (availError) {
      console.log('  ❌ inventory_available view:', availError.message);
    } else {
      console.log(`  ✅ inventory_available: ${availCount || 0} rows`);
    }

    // Check inventory_items.reserved_quantity
    const { data: sampleData, error: sampleError } = await supabase
      .from('inventory_items')
      .select('reserved_quantity')
      .limit(1);

    if (sampleError) {
      console.log('  ❌ reserved_quantity column:', sampleError.message);
    } else {
      console.log('  ✅ reserved_quantity column exists');
    }

    console.log('\n✅ Verification complete!\n');

  } catch (error) {
    console.error('Error during verification:', error.message);
  }
}

async function showManualInstructions() {
  console.log('📋 To apply the migration manually:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/ogrcpzzmmudztwjfwjvu/editor');
  console.log('2. Click "SQL Editor" in the left menu');
  console.log('3. Click "New Query"');
  console.log('4. Copy and paste the entire file:');
  console.log('   📄 supabase/migrations/20251012_add_reserved_stock_system.sql');
  console.log('5. Click "Run" or press Ctrl+Enter');
  console.log('6. Wait 5-10 seconds for completion');
  console.log('7. Run this script again to verify\n');
}

// Main
(async () => {
  const isApplied = await checkMigration();

  if (isApplied) {
    await verifyTables();
    console.log('🎉 Migration is working! You can now use the Reserved Stock System.\n');
    console.log('Next steps:');
    console.log('  • Test picking: คลังสินค้า → Picking System');
    console.log('  • View dashboard: เครื่องมือ → 🔒 Reserved Stock');
    console.log('  • Check inventory: ตารางข้อมูล → รายการสต็อก\n');
  } else {
    await showManualInstructions();
    console.log('⚠️  Note: The migration requires DDL permissions (ALTER TABLE, CREATE VIEW)');
    console.log('   which are only available via Supabase Dashboard SQL Editor.\n');
  }
})();
