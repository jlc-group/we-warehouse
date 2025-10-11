import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 ตรวจสอบฐานข้อมูลด้วย anon key...\n');

try {
  // Check inventory_items
  const { data: inventory, error: invError, count: invCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: false })
    .limit(3);

  console.log('📦 inventory_items:');
  if (invError) {
    console.log(`   ❌ Error: ${invError.message}`);
  } else {
    console.log(`   ✅ Total: ${invCount} รายการ`);
    if (inventory && inventory.length > 0) {
      inventory.forEach((item, i) => {
        console.log(`   ${i+1}. ${item.product_name} @ ${item.location} (SKU: ${item.sku})`);
      });
    }
  }

  // Check warehouses
  const { data: warehouses, error: whError } = await supabase
    .from('warehouses')
    .select('*');

  console.log('\n🏢 warehouses:');
  if (whError) {
    console.log(`   ❌ Error: ${whError.message}`);
  } else if (warehouses && warehouses.length > 0) {
    console.log(`   ✅ ${warehouses.length} คลัง:`);
    warehouses.forEach(w => {
      console.log(`   - ${w.code}: ${w.name} (ID: ${w.id})`);
    });
  } else {
    console.log(`   ⚠️  Table มี 0 warehouses`);
  }

  // Check warehouse_locations
  const { data: locations, error: locError, count: locCount } = await supabase
    .from('warehouse_locations')
    .select('id', { count: 'exact', head: true });

  console.log('\n📍 warehouse_locations:');
  if (locError) {
    console.log(`   ❌ Error: ${locError.message}`);
  } else {
    console.log(`   ✅ Total: ${locCount} locations`);
  }

  // Check stock_overview view
  const { data: stockOverview, error: stockError, count: stockCount } = await supabase
    .from('stock_overview')
    .select('*', { count: 'exact', head: false })
    .limit(3);

  console.log('\n📊 stock_overview view:');
  if (stockError) {
    console.log(`   ❌ Error: ${stockError.message}`);
  } else {
    console.log(`   ✅ Total: ${stockCount} รายการ`);
    if (stockOverview && stockOverview.length > 0) {
      stockOverview.forEach((item, i) => {
        console.log(`   ${i+1}. ${item.product_name} @ ${item.location}`);
      });
    }
  }

} catch (err) {
  console.error('❌ Error:', err.message);
}

console.log('\n✅ เสร็จสิ้น');
