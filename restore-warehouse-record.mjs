import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

const existingWarehouseId = 'c6f43c5a-3949-46fd-9165-a3cd6e0b7509';

console.log('🔄 กู้คืน Warehouse Record...\n');
console.log(`Warehouse ID: ${existingWarehouseId}\n`);

try {
  // Check if RLS allows INSERT
  console.log('📝 พยายามสร้าง warehouse record...');

  const { data: restored, error } = await supabase
    .from('warehouses')
    .upsert({
      id: existingWarehouseId,
      name: 'คลังสินค้าหลัก',
      code: 'WH-MAIN',
      description: 'คลังสินค้าหลัก รองรับทุกประเภทสินค้า (A-Z)',
      address: 'พื้นที่จัดเก็บหลัก',
      location_prefix_start: 'A',
      location_prefix_end: 'Z',
      max_levels: 20,
      max_positions: 4,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    })
    .select();

  if (error) {
    console.log(`❌ Error: ${error.message}`);
    console.log('Details:', error);

    if (error.code === '42501') {
      console.log('\n⚠️  RLS Policy บล็อกการสร้าง warehouse');
      console.log('💡 วิธีแก้: ให้ Admin เข้า Supabase Dashboard และรัน SQL นี้:');
      console.log('\n```sql');
      console.log(`INSERT INTO warehouses (id, name, code, description, address, location_prefix_start, location_prefix_end, max_levels, max_positions, is_active)
VALUES (
  '${existingWarehouseId}',
  'คลังสินค้าหลัก',
  'WH-MAIN',
  'คลังสินค้าหลัก รองรับทุกประเภทสินค้า (A-Z)',
  'พื้นที่จัดเก็บหลัก',
  'A',
  'Z',
  20,
  4,
  true
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    code = EXCLUDED.code,
    description = EXCLUDED.description,
    updated_at = NOW();
```);
      console.log('\nหรือปิด RLS ชั่วคราวด้วย:');
      console.log('ALTER TABLE warehouses DISABLE ROW LEVEL SECURITY;');
    }
  } else {
    console.log('✅ สร้าง warehouse record สำเร็จ!\n');
    console.log('📦 Warehouse Details:');
    console.log(`   Name: ${restored[0].name}`);
    console.log(`   Code: ${restored[0].code}`);
    console.log(`   ID: ${restored[0].id}`);
    console.log(`   Location Range: ${restored[0].location_prefix_start}-${restored[0].location_prefix_end}`);
  }

} catch (err) {
  console.error('❌ Exception:', err.message);
}

console.log('\n✅ เสร็จสิ้น');
