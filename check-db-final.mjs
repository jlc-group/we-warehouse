import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 ตรวจสอบ Supabase Database...\n');

// 1. Check inventory_items
const { count: invCount, error: invError } = await supabase
  .from('inventory_items')
  .select('*', { count: 'exact', head: true });

console.log('📦 inventory_items:', invError ? `❌ ${invError.message}` : `✅ ${invCount || 0} รายการ`);

// 2. Get sample data
if (!invError && invCount > 0) {
  const { data: samples } = await supabase
    .from('inventory_items')
    .select('product_name, location, sku, warehouse_id')
    .limit(5);

  console.log('\n   ตัวอย่าง 5 รายการ:');
  samples?.forEach((item, i) => {
    console.log(`   ${i+1}. ${item.product_name} @ ${item.location} (SKU: ${item.sku})`);
  });
}

// 3. Check warehouses
const { data: warehouses, error: whError } = await supabase
  .from('warehouses')
  .select('*');

console.log('\n🏢 warehouses:', whError ? `❌ ${whError.message}` : `✅ ${warehouses?.length || 0} คลัง`);
if (warehouses && warehouses.length > 0) {
  warehouses.forEach(w => console.log(`   - ${w.code}: ${w.name}`));
}

// 4. Check products
const { count: prodCount, error: prodError } = await supabase
  .from('products')
  .select('*', { count: 'exact', head: true });

console.log('\n📦 products:', prodError ? `❌ ${prodError.message}` : `✅ ${prodCount || 0} รายการ`);

console.log('\n✅ เสร็จสิ้น');
