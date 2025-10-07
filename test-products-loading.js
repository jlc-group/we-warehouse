import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Testing Products Loading Performance...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function testProductsCount() {
  console.log('1️⃣  Checking products count...');
  try {
    const startTime = Date.now();
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return;
    }
    
    console.log(`   ✅ Total products: ${count}`);
    console.log(`   ⏱️  Query time: ${duration}ms\n`);
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }
}

async function testSimpleQuery() {
  console.log('2️⃣  Testing simple query (10 products)...');
  try {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('products')
      .select('id, product_name, sku_code')
      .limit(10);
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return;
    }
    
    console.log(`   ✅ Loaded ${data.length} products`);
    console.log(`   ⏱️  Query time: ${duration}ms\n`);
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }
}

async function testFullQuery() {
  console.log('3️⃣  Testing full query (200 products, all columns)...');
  try {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        product_name,
        sku_code,
        product_type,
        is_active,
        brand,
        category,
        subcategory,
        description,
        unit_cost,
        reorder_level,
        max_stock_level,
        unit_of_measure,
        weight,
        dimensions,
        manufacturing_country,
        storage_conditions,
        created_at,
        updated_at
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(200);
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.log(`   ❌ Error: ${error.message}`);
      console.log(`   Details: ${JSON.stringify(error, null, 2)}`);
      return;
    }
    
    console.log(`   ✅ Loaded ${data.length} products`);
    console.log(`   ⏱️  Query time: ${duration}ms`);
    
    if (duration > 5000) {
      console.log(`   ⚠️  WARNING: Query is slow (>5 seconds)`);
      console.log(`   💡 Consider:`);
      console.log(`      - Adding indexes on products table`);
      console.log(`      - Checking RLS policies`);
      console.log(`      - Reducing number of columns selected`);
    } else if (duration > 2000) {
      console.log(`   ⚠️  Query is a bit slow (>2 seconds)`);
    } else {
      console.log(`   ✅ Query performance is good`);
    }
    console.log('');
    
    return data;
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}\n`);
  }
}

async function testWithTimeout() {
  console.log('4️⃣  Testing with 15 second timeout (like in app)...');
  try {
    const startTime = Date.now();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const { data, error } = await supabase
      .from('products')
      .select('id, product_name, sku_code, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(200)
      .abortSignal(controller.signal);
    
    clearTimeout(timeoutId);
    const duration = Date.now() - startTime;
    
    if (error) {
      if (error.message?.includes('aborted')) {
        console.log(`   ❌ TIMEOUT: Query exceeded 15 seconds!`);
        console.log(`   💡 This is the problem - database is too slow`);
        return;
      }
      console.log(`   ❌ Error: ${error.message}`);
      return;
    }
    
    console.log(`   ✅ Loaded ${data.length} products`);
    console.log(`   ⏱️  Query time: ${duration}ms`);
    console.log(`   ✅ No timeout - query completed successfully\n`);
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log(`   ❌ TIMEOUT: Query exceeded 15 seconds!`);
      console.log(`   💡 This is the problem causing the app error\n`);
    } else {
      console.log(`   ❌ Error: ${err.message}\n`);
    }
  }
}

async function checkConnection() {
  console.log('0️⃣  Checking Supabase connection...');
  try {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .limit(1);
    
    const duration = Date.now() - startTime;
    
    if (error) {
      console.log(`   ❌ Connection failed: ${error.message}\n`);
      return false;
    }
    
    console.log(`   ✅ Connected to Supabase`);
    console.log(`   ⏱️  Ping time: ${duration}ms\n`);
    return true;
  } catch (err) {
    console.log(`   ❌ Connection error: ${err.message}\n`);
    return false;
  }
}

async function runAllTests() {
  const connected = await checkConnection();
  if (!connected) {
    console.log('Cannot proceed without database connection');
    process.exit(1);
  }

  await testProductsCount();
  await testSimpleQuery();
  const products = await testFullQuery();
  await testWithTimeout();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Tests completed!\n');
  
  console.log('💡 Recommendations:');
  console.log('   1. Run check_products_performance.sql in Supabase SQL Editor');
  console.log('   2. Check if indexes exist on products table');
  console.log('   3. Review RLS policies that might be slowing down queries');
  console.log('   4. Consider pagination instead of loading all products at once');
  console.log('\n');
}

runAllTests().catch(console.error);
