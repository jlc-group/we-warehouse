import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 ตรวจสอบข้อมูล Warehouses ในระบบ...\n');

try {
  // Check warehouses table
  const { data: warehouses, error: whError } = await supabase
    .from('warehouses')
    .select('*')
    .order('name');

  console.log('🏢 Warehouses Table:');
  if (whError) {
    console.log(`   ❌ Error: ${whError.message}`);
  } else if (warehouses && warehouses.length > 0) {
    console.log(`   ✅ พบ ${warehouses.length} คลัง:\n`);
    warehouses.forEach((wh, i) => {
      console.log(`   ${i+1}. ${wh.name} (${wh.code})`);
      console.log(`      ID: ${wh.id}`);
      console.log(`      Location Prefix: ${wh.location_prefix_start}-${wh.location_prefix_end}`);
      console.log(`      Active: ${wh.is_active ? 'Yes' : 'No'}`);
      console.log(`      Created: ${new Date(wh.created_at).toLocaleString('th-TH')}`);
      console.log();
    });
  } else {
    console.log(`   ⚠️  ไม่มีข้อมูลคลัง (0 records)\n`);
  }

  // Check inventory_items with warehouse_id
  const { data: itemsWithWarehouse, count: withWhCount } = await supabase
    .from('inventory_items')
    .select('id', { count: 'exact', head: true })
    .not('warehouse_id', 'is', null);

  const { data: itemsNoWarehouse, count: noWhCount } = await supabase
    .from('inventory_items')
    .select('id', { count: 'exact', head: true })
    .is('warehouse_id', null);

  console.log('📦 Inventory Items:');
  console.log(`   มี warehouse_id: ${withWhCount || 0} รายการ`);
  console.log(`   ไม่มี warehouse_id: ${noWhCount || 0} รายการ\n`);

  // Check warehouse_locations with warehouse_id
  const { data: locsWithWarehouse, count: locWithWhCount } = await supabase
    .from('warehouse_locations')
    .select('id', { count: 'exact', head: true })
    .not('warehouse_id', 'is', null);

  const { data: locsNoWarehouse, count: locNoWhCount } = await supabase
    .from('warehouse_locations')
    .select('id', { count: 'exact', head: true })
    .is('warehouse_id', null);

  console.log('📍 Warehouse Locations:');
  console.log(`   มี warehouse_id: ${locWithWhCount || 0} locations`);
  console.log(`   ไม่มี warehouse_id: ${locNoWhCount || 0} locations\n`);

  // Sample inventory items to see their warehouse_id
  const { data: sampleItems } = await supabase
    .from('inventory_items')
    .select('id, product_name, location, warehouse_id')
    .limit(5);

  if (sampleItems && sampleItems.length > 0) {
    console.log('📋 ตัวอย่าง Inventory Items (5 รายการแรก):');
    sampleItems.forEach((item, i) => {
      console.log(`   ${i+1}. ${item.product_name} @ ${item.location}`);
      console.log(`      warehouse_id: ${item.warehouse_id || 'NULL'}`);
    });
    console.log();
  }

  // Check if there are any old warehouse records in inventory
  const { data: uniqueWarehouseIds } = await supabase
    .from('inventory_items')
    .select('warehouse_id')
    .not('warehouse_id', 'is', null);

  if (uniqueWarehouseIds && uniqueWarehouseIds.length > 0) {
    const uniqueIds = [...new Set(uniqueWarehouseIds.map(i => i.warehouse_id))];
    console.log(`🔗 พบ Warehouse IDs ที่ใช้ใน inventory_items: ${uniqueIds.length} IDs`);
    uniqueIds.forEach(id => console.log(`   - ${id}`));
  }

} catch (err) {
  console.error('❌ Error:', err.message);
}

console.log('\n✅ เสร็จสิ้น');
