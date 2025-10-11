import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🏭 สร้างคลังเริ่มต้นในระบบ...\n');

// สร้างคลังหลักที่ครอบคลุม location prefixes ทั้งหมด (A-Z)
const warehouses = [
  {
    name: 'คลังสินค้าหลัก',
    code: 'WH-MAIN',
    description: 'คลังสินค้าหลัก รองรับทุกประเภทสินค้า (A-Z)',
    address: 'พื้นที่จัดเก็บหลัก',
    location_prefix_start: 'A',
    location_prefix_end: 'Z',
    max_levels: 20,
    max_positions: 4,
    is_active: true
  }
];

try {
  // Check if warehouses already exist
  const { data: existing } = await supabase
    .from('warehouses')
    .select('code');

  if (existing && existing.length > 0) {
    console.log('⚠️  พบคลังที่มีอยู่แล้ว:');
    existing.forEach(w => console.log(`   - ${w.code}`));
    console.log('\nยกเลิกการสร้าง (ไม่ซ้ำ)');
    process.exit(0);
  }

  // Create warehouses
  const { data: created, error } = await supabase
    .from('warehouses')
    .insert(warehouses)
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }

  console.log('✅ สร้างคลังสำเร็จ:\n');
  created.forEach(wh => {
    console.log(`📦 ${wh.name} (${wh.code})`);
    console.log(`   ID: ${wh.id}`);
    console.log(`   ช่วงตำแหน่ง: ${wh.location_prefix_start}-${wh.location_prefix_end}`);
    console.log(`   ขนาด: ${wh.max_levels} ชั้น x ${wh.max_positions} ตำแหน่ง`);
    console.log();
  });

  // Update existing inventory_items to link with the main warehouse
  console.log('🔄 กำลังเชื่อมโยงรายการสินค้าเข้ากับคลังหลัก...');

  const mainWarehouse = created[0];
  const { data: updated, error: updateError } = await supabase
    .from('inventory_items')
    .update({ warehouse_id: mainWarehouse.id })
    .is('warehouse_id', null)
    .select('id');

  if (updateError) {
    console.warn('⚠️  Warning updating inventory items:', updateError.message);
  } else if (updated) {
    console.log(`✅ เชื่อมโยง ${updated.length} รายการสินค้าเข้ากับคลังหลัก`);
  }

  console.log('\n✅ เสร็จสมบูรณ์!');

} catch (err) {
  console.error('❌ Exception:', err.message);
  process.exit(1);
}
