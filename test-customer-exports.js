import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// โหลด .env
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.log('Looking for:');
  console.log('  - VITE_SUPABASE_URL');
  console.log('  - VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Testing Customer Exports System...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function testConnection() {
  console.log('1️⃣  Testing Supabase Connection...');
  try {
    const { data, error } = await supabase.from('customers').select('count').limit(1);
    if (error) {
      console.log('   ❌ Connection failed:', error.message);
      return false;
    }
    console.log('   ✅ Connected to Supabase\n');
    return true;
  } catch (err) {
    console.log('   ❌ Connection error:', err.message);
    return false;
  }
}

async function checkCustomerExportsTable() {
  console.log('2️⃣  Checking customer_exports table...');
  try {
    const { data, error, count } = await supabase
      .from('customer_exports')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log('   ❌ Error:', error.message);
      console.log('   💡 Table may not exist or has permission issues');
      return false;
    }
    
    console.log(`   ✅ Table exists with ${count || 0} records\n`);
    return count > 0;
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    return false;
  }
}

async function showRecentExports() {
  console.log('3️⃣  Fetching recent export records...');
  try {
    const { data, error } = await supabase
      .from('customer_exports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.log('   ❌ Query failed:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('   ⚠️  No export records found!');
      console.log('   💡 This explains why the dashboard is empty\n');
      return;
    }
    
    console.log(`   ✅ Found ${data.length} recent exports:\n`);
    
    data.forEach((exp, idx) => {
      console.log(`   ${idx + 1}. ${exp.customer_name || 'Unknown'}`);
      console.log(`      Product: ${exp.product_name || 'N/A'}`);
      console.log(`      Quantity: ${exp.quantity_exported || 0} units`);
      console.log(`      Value: ${exp.total_value || 0} THB`);
      console.log(`      Date: ${exp.created_at ? new Date(exp.created_at).toLocaleString('th-TH') : 'N/A'}`);
      console.log('');
    });
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }
}

async function checkCustomersTable() {
  console.log('4️⃣  Checking customers table...');
  try {
    const { data, error, count } = await supabase
      .from('customers')
      .select('id, customer_name, customer_code', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.log('   ❌ Error:', error.message);
      return;
    }
    
    console.log(`   ✅ Found ${count || 0} customers`);
    if (data && data.length > 0) {
      data.forEach(c => {
        console.log(`      - ${c.customer_name} (${c.customer_code})`);
      });
    }
    console.log('');
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }
}

async function testExportService() {
  console.log('5️⃣  Testing CustomerExportService query...');
  try {
    // เลียนแบบ query ที่ service ใช้
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, customer_name, customer_code')
      .order('customer_name');

    if (customersError) {
      console.log('   ❌ Customers query failed:', customersError.message);
      return;
    }

    console.log(`   ✅ Loaded ${customers?.length || 0} customers`);

    const { data: exports, error: exportsError } = await supabase
      .from('customer_exports')
      .select('*')
      .order('created_at', { ascending: false });

    if (exportsError) {
      console.log('   ❌ Exports query failed:', exportsError.message);
      return;
    }

    console.log(`   ✅ Loaded ${exports?.length || 0} export records`);

    if (!exports || exports.length === 0) {
      console.log('   ⚠️  No exports found - Dashboard will be empty!\n');
      return;
    }

    // Group by customer
    const customerMap = new Map();
    exports.forEach(exp => {
      const customerId = exp.customer_id || 'unknown';
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customer_id: customerId,
          customer_name: exp.customer_name || 'Unknown',
          exports: []
        });
      }
      customerMap.get(customerId).exports.push(exp);
    });

    console.log(`   ✅ Grouped into ${customerMap.size} customers with exports:\n`);
    
    Array.from(customerMap.values()).slice(0, 5).forEach((cust, idx) => {
      console.log(`   ${idx + 1}. ${cust.customer_name}`);
      console.log(`      - ${cust.exports.length} export(s)`);
      const totalValue = cust.exports.reduce((sum, e) => sum + (e.total_value || 0), 0);
      console.log(`      - Total value: ${totalValue.toLocaleString()} THB`);
    });
    console.log('');
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }
}

async function showInventoryMovements() {
  console.log('6️⃣  Checking inventory_movements (for comparison)...');
  try {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('movement_type', 'out')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('   ❌ Query failed:', error.message);
      return;
    }
    
    console.log(`   ✅ Found ${data?.length || 0} recent inventory movements (type: out)\n`);
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }
}

// Run all tests
async function runAllTests() {
  const connected = await testConnection();
  if (!connected) {
    console.log('\n❌ Cannot proceed without database connection');
    process.exit(1);
  }

  await checkCustomerExportsTable();
  await showRecentExports();
  await checkCustomersTable();
  await testExportService();
  await showInventoryMovements();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Test completed!\n');
  
  console.log('💡 Next steps:');
  console.log('   1. If customer_exports is empty, you need to make some exports');
  console.log('   2. If there are RLS errors, check Supabase policies');
  console.log('   3. If table doesn\'t exist, run the migration');
  console.log('\n');
}

runAllTests().catch(console.error);
