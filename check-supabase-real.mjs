import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNTg0MTEzNywiZXhwIjoyMDQxNDE3MTM3fQ.6oH_PrvI1RkpkNYzCQB7uBQe5HkkxR9wPJLHV5tXkd0';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔍 ตรวจสอบ Supabase (Service Role - bypass RLS)...\n');

try {
  // 1. Check inventory_items
  const { data: inventory, error: invError, count: invCount } = await supabase
    .from('inventory_items')
    .select('*', { count: 'exact', head: false })
    .limit(5);

  console.log('📦 inventory_items:');
  console.log(`   Total: ${invCount} รายการ`);
  if (invError) {
    console.log(`   ❌ Error: ${invError.message}`);
  } else if (inventory && inventory.length > 0) {
    console.log(`   ✅ มีข้อมูล! ตัวอย่าง 5 รายการแรก:`);
    inventory.forEach((item, i) => {
      console.log(`   ${i+1}. ${item.product_name} @ ${item.location} (SKU: ${item.sku})`);
    });
  }

  // 2. Check warehouses
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
    console.log(`   ⚠️  ไม่มี warehouse`);
  }

  // 3. Check products
  const { data: products, error: prodError, count: prodCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true });

  console.log('\n📦 products:');
  console.log(`   Total: ${prodCount} รายการ`);
  if (prodError) console.log(`   ❌ Error: ${prodError.message}`);

  // 4. Check stock by warehouse
  if (invCount > 0) {
    const { data: byWarehouse } = await supabase
      .from('inventory_items')
      .select('warehouse_id')
      .limit(1000);

    if (byWarehouse) {
      console.log('\n📊 สต็อกแยกตาม warehouse_id:');
      const counts = {};
      byWarehouse.forEach(item => {
        const wh = item.warehouse_id || 'null';
        counts[wh] = (counts[wh] || 0) + 1;
      });
      Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([wh, count]) => {
          console.log(`   ${wh}: ${count} รายการ`);
        });
    }
  }

  // 5. Check RLS policies
  const { data: policies, error: polError } = await supabase
    .rpc('exec_sql', {
      sql: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
            FROM pg_policies
            WHERE tablename IN ('inventory_items', 'warehouses')
            ORDER BY tablename, policyname;`
    })
    .catch(() => ({ data: null, error: { message: 'Cannot check policies' } }));

  if (policies) {
    console.log('\n🔒 RLS Policies:');
    console.log(policies);
  }

} catch (err) {
  console.error('❌ Error:', err.message);
}

console.log('\n✅ เสร็จสิ้น');
