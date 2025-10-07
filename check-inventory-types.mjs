import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 ตรวจสอบการจัดกลุ่ม product_type...\n');

// Get all inventory items with product info
const { data: items, error } = await supabase
  .from('inventory_items')
  .select('id, product_name, sku')
  .limit(1000);

if (error) {
  console.log('❌ Error:', error.message);
  process.exit(1);
}

console.log(`📦 พบ ${items.length} inventory items\n`);

// Get all products to check product_type
const { data: products, error: prodError } = await supabase
  .from('products')
  .select('sku_code, product_name, product_type');

if (prodError) {
  console.log('❌ Error fetching products:', prodError.message);
  process.exit(1);
}

console.log(`📋 พบ ${products.length} products\n`);

// Create map of SKU -> product_type
const skuTypeMap = {};
products.forEach(p => {
  skuTypeMap[p.sku_code] = p.product_type || 'ไม่ระบุ';
});

// Count by type
const typeCounts = {};
const typeExamples = {};

items.forEach(item => {
  const type = skuTypeMap[item.sku] || 'ไม่ระบุ';

  if (!typeCounts[type]) {
    typeCounts[type] = 0;
    typeExamples[type] = [];
  }

  typeCounts[type]++;

  if (typeExamples[type].length < 3) {
    typeExamples[type].push(item.product_name);
  }
});

console.log('📊 สรุปตาม Product Type:\n');

const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

sorted.forEach(([type, count]) => {
  console.log(`🏷️  ${type}: ${count} รายการ (${(count/items.length*100).toFixed(1)}%)`);
  console.log(`   ตัวอย่าง:`);
  typeExamples[type].forEach(name => {
    console.log(`   - ${name}`);
  });
  console.log();
});

// Check what "PK" should be
console.log('\n🔍 ตรวจสอบสินค้า "บรรจุภัณฑ์" ควรเป็น type อะไร...\n');

const pkKeywords = ['จุก', 'ซอง', 'หลอด', 'กล่อง', 'ฝา', 'packaging'];
const pkItems = items.filter(item =>
  pkKeywords.some(kw => item.product_name.toLowerCase().includes(kw))
);

console.log(`พบสินค้าที่เกี่ยวกับบรรจุภัณฑ์: ${pkItems.length} รายการ`);

if (pkItems.length > 0) {
  console.log('\nตัวอย่าง 10 รายการแรก:');
  pkItems.slice(0, 10).forEach((item, i) => {
    const type = skuTypeMap[item.sku] || 'ไม่ระบุ';
    console.log(`${i+1}. ${item.product_name}`);
    console.log(`   SKU: ${item.sku} | Type: ${type}`);
  });
}

console.log('\n✅ เสร็จสิ้น');
