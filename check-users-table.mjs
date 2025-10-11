#!/usr/bin/env node

/**
 * Script to check users table structure in Supabase
 * Usage: node check-users-table.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

console.log('🔍 Checking Supabase Users Table Structure...\n');

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please create a .env file with:');
  console.error('  VITE_SUPABASE_URL=your_supabase_url');
  console.error('  VITE_SUPABASE_ANON_KEY=your_anon_key');
  console.error('\nOr set environment variables directly.');
  process.exit(1);
}

console.log('✅ Supabase credentials found');
console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`   Key: ${supabaseKey.substring(0, 20)}...\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTable() {
  try {
    console.log('📋 Step 1: Checking if users table exists...');

    // Try to select from users table
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: false })
      .limit(5);

    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('❌ Users table does NOT exist yet!\n');
        console.log('📝 You need to create it. See recommendations below.\n');
        return { exists: false };
      }
      throw error;
    }

    console.log('✅ Users table EXISTS!\n');
    console.log(`📊 Total users in database: ${count || 0}`);

    if (data && data.length > 0) {
      console.log('\n📄 Sample user data (first record):');
      console.log('   Columns:', Object.keys(data[0]).join(', '));
      console.log('\n   Data:');
      console.log(JSON.stringify(data[0], null, 2));

      // Check for department field
      console.log('\n🔍 Checking for department field...');
      if (data[0].hasOwnProperty('department')) {
        console.log('✅ Department field EXISTS');

        // Get unique departments
        const { data: allUsers } = await supabase
          .from('users')
          .select('department');

        if (allUsers) {
          const departments = [...new Set(allUsers.map(u => u.department))];
          console.log(`\n📋 Existing departments (${departments.length}):`);
          departments.forEach(dept => console.log(`   - ${dept || '(null)'}`));
        }
      } else {
        console.log('⚠️  Department field is MISSING');
      }

      // Check for role_level field
      console.log('\n🔍 Checking for role_level field...');
      if (data[0].hasOwnProperty('role_level')) {
        console.log('✅ Role_level field EXISTS');

        const { data: allUsers } = await supabase
          .from('users')
          .select('role, role_level');

        if (allUsers) {
          const roleLevels = [...new Set(allUsers.map(u => `${u.role} (Level ${u.role_level})`))];
          console.log(`\n📋 Existing roles (${roleLevels.length}):`);
          roleLevels.forEach(role => console.log(`   - ${role}`));
        }
      } else {
        console.log('⚠️  Role_level field is MISSING');
      }
    } else {
      console.log('\n⚠️  Table exists but is EMPTY (no users yet)');
    }

    return { exists: true, count: count || 0, data };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return { exists: false, error: error.message };
  }
}

async function main() {
  const result = await checkUsersTable();

  console.log('\n' + '='.repeat(60));
  console.log('📋 RECOMMENDATIONS:');
  console.log('='.repeat(60));

  if (!result.exists) {
    console.log(`
🏗️  CREATE USERS TABLE:

   You need to create the users table in Supabase.

   Option 1: Use Supabase Dashboard
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Table Editor
   - Create new table with the structure below

   Option 2: Run SQL in Supabase SQL Editor
   - Copy the SQL from CREATE_USERS_TABLE.sql
   - Run it in Supabase SQL Editor
    `);
  } else if (result.count === 0) {
    console.log(`
👥 CREATE SAMPLE USERS:

   Table exists but is empty.
   You can create sample users using:

   1. Run INSERT_SAMPLE_USERS.sql in Supabase
   2. Or use the Admin UI (if created)
    `);
  } else {
    console.log(`
✅ USERS TABLE IS READY!

   Current status:
   - Table: EXISTS ✓
   - Users: ${result.count} user(s) ✓
   - Department field: ${result.data?.[0]?.hasOwnProperty('department') ? 'EXISTS ✓' : 'MISSING ✗'}
   - Role_level field: ${result.data?.[0]?.hasOwnProperty('role_level') ? 'EXISTS ✓' : 'MISSING ✗'}

   Next steps:
   1. Add more users if needed
   2. Assign users to departments
   3. Set appropriate role levels (1-5)
    `);
  }

  console.log('\n' + '='.repeat(60));
}

main();
