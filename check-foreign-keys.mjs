import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 ตรวจสอบ Foreign Keys ระหว่าง inventory_items และ products...\n');

// Test different join approaches
console.log('1️⃣ ทดสอบ JOIN โดยไม่ระบุ foreign key name:\n');

const { data: test1, error: error1 } = await supabase
  .from('inventory_items')
  .select(`
    id,
    sku,
    product_name,
    products (
      product_type,
      sku_code
    )
  `)
  .limit(3);

if (error1) {
  console.log('❌ Error:', error1.message);
  console.log('Details:', error1.details);
} else {
  console.log('✅ สำเร็จ! ตัวอย่างข้อมูล:');
  test1.forEach((item, i) => {
    console.log(`   ${i+1}. ${item.product_name}`);
    console.log(`      SKU: ${item.sku}`);
    console.log(`      product_type: ${item.products?.product_type || 'NULL'}`);
  });
}

console.log('\n2️⃣ ทดสอบ JOIN ด้วย sku -> sku_code:\n');

const { data: test2, error: error2 } = await supabase
  .from('inventory_items')
  .select(`
    id,
    sku,
    product_name,
    products!sku (
      product_type,
      sku_code
    )
  `)
  .limit(3);

if (error2) {
  console.log('❌ Error:', error2.message);
} else {
  console.log('✅ สำเร็จ!');
  console.log('Items:', test2.length);
}

console.log('\n3️⃣ ทดสอบ Manual JOIN:\n');

// Get inventory items first
const { data: items } = await supabase
  .from('inventory_items')
  .select('id, sku, product_name')
  .limit(5);

if (items && items.length > 0) {
  // Get unique SKUs
  const skus = [...new Set(items.map(i => i.sku))];

  // Fetch products
  const { data: products } = await supabase
    .from('products')
    .select('sku_code, product_type')
    .in('sku_code', skus);

  console.log(`✅ พบ ${items.length} items และ ${products?.length || 0} products`);

  if (products) {
    // Create SKU -> type map
    const typeMap = {};
    products.forEach(p => {
      typeMap[p.sku_code] = p.product_type;
    });

    console.log('\nตัวอย่างข้อมูล:');
    items.forEach((item, i) => {
      const type = typeMap[item.sku] || 'NULL';
      console.log(`   ${i+1}. ${item.product_name}`);
      console.log(`      SKU: ${item.sku} | Type: ${type}`);
    });
  }
}

console.log('\n✅ เสร็จสิ้น');
