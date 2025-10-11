import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 กำลัง restore warehouses...\n');

const warehouses = [
  { id: '0d9778be-7b52-47c1-bd96-ab47fd3a8a55', code: 'WHOOT', name: 'คลังสินค้าหลัก', description: 'คลังสินค้าหลัก (MAIN)', is_active: true },
  { id: '3f40f4fb-5826-47fc-89c7-bfe80a35ce83', code: 'B', name: 'Warehouse B', description: 'คลังสินค้า B - รอง', is_active: true },
  { id: '4750662c-a72e-4eb0-a856-7710f8c2a319', code: 'D', name: 'Warehouse D', description: 'คลังสินค้า D - สำรอง', is_active: true },
  { id: '939066ab-5113-4cae-8253-08420d1f9cf6', code: 'C-ecom', name: 'Ecom', description: 'คลัง E-commerce', is_active: true },
  { id: 'bd3a3e11-795b-41f4-a3a7-0a360130b132', code: 'A', name: 'Warehouse A', description: 'คลังสินค้า A - หลัก', is_active: true },
  { id: 'c6f43c5a-3949-46fd-9165-a3cd6e0b7509', code: 'LLK-D', name: 'คลัง LLK - D', description: 'คลังสินค้า LLK แผนก D', is_active: true }
];

const { data, error } = await supabase
  .from('warehouses')
  .upsert(warehouses, { onConflict: 'id' })
  .select();

if (error) {
  console.error('❌ Error:', error.message);
  console.log('\n⚠️  อาจเป็นเพราะ RLS blocking - ให้รันใน Supabase SQL Editor แทน');
} else {
  console.log(`✅ Restored ${data?.length || 0} warehouses สำเร็จ!\n`);
  data?.forEach(w => console.log(`   ✓ ${w.code}: ${w.name}`));
}

// Verify
const { data: allWh } = await supabase.from('warehouses').select('code, name');
console.log(`\n📦 Total warehouses: ${allWh?.length || 0}`);

console.log('\n✅ เสร็จสิ้น!');
