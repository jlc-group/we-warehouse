#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load .env
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    value = value.replace(/^["'](.*)["']$/, '$1');
    envVars[key] = value;
  }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

console.log('🔍 Checking inventory_items table schema...\n');

async function checkSchema() {
  // Get a sample row to see all columns
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('✅ Columns in inventory_items:');
    columns.forEach(col => {
      console.log(`  - ${col}: ${typeof data[0][col]} = ${JSON.stringify(data[0][col])}`);
    });
  } else {
    console.log('⚠️  No data in inventory_items table');
  }
}

checkSchema();
