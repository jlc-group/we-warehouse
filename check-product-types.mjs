import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 ตรวจสอบ product_type ใน inventory_items...\n');

// Get unique product types
const { data: items, error } = await supabase
  .from('inventory_items')
  .select('product_type, product_name')
  .not('product_type', 'is', null);

if (error) {
  console.log('❌ Error:', error.message);
  process.exit(1);
}

// Group by product_type
const typeGroups = {};
items.forEach(item => {
  const type = item.product_type || 'NULL';
  if (!typeGroups[type]) {
    typeGroups[type] = {
      count: 0,
      samples: []
    };
  }
  typeGroups[type].count++;
  if (typeGroups[type].samples.length < 3) {
    typeGroups[type].samples.push(item.product_name);
  }
});

console.log('📊 Product Types พบในระบบ:\n');

const sortedTypes = Object.entries(typeGroups)
  .sort((a, b) => b[1].count - a[1].count);

sortedTypes.forEach(([type, info]) => {
  console.log(`🏷️  ${type}: ${info.count} รายการ`);
  console.log(`   ตัวอย่าง:`);
  info.samples.forEach(name => {
    console.log(`   - ${name}`);
  });
  console.log();
});

// Check products table
console.log('\n📦 ตรวจสอบ product_type ใน products table...\n');

const { data: products, error: prodError } = await supabase
  .from('products')
  .select('product_type, product_name')
  .not('product_type', 'is', null);

if (!prodError) {
  const productTypeGroups = {};
  products.forEach(prod => {
    const type = prod.product_type || 'NULL';
    if (!productTypeGroups[type]) {
      productTypeGroups[type] = { count: 0, samples: [] };
    }
    productTypeGroups[type].count++;
    if (productTypeGroups[type].samples.length < 2) {
      productTypeGroups[type].samples.push(prod.product_name);
    }
  });

  console.log('📊 Product Types ใน Products Table:\n');
  Object.entries(productTypeGroups)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([type, info]) => {
      console.log(`   ${type}: ${info.count} SKU`);
      console.log(`   ตัวอย่าง: ${info.samples.join(', ')}`);
      console.log();
    });
}

console.log('✅ เสร็จสิ้น');
