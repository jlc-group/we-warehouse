import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 ทดสอบการอ่าน warehouses ด้วย anon key (เหมือน browser)...\n');

const { data, error } = await supabase
  .from('warehouses')
  .select('id, name, code, is_active')
  .eq('is_active', true)
  .order('name');

if (error) {
  console.log('❌ Error:', error.message);
  console.log('Details:', error);
} else {
  console.log(`✅ อ่านได้! พบ ${data.length} คลัง:\n`);
  data.forEach((wh, i) => {
    console.log(`${i+1}. ${wh.name} (${wh.code})`);
    console.log(`   ID: ${wh.id}\n`);
  });

  console.log('🎉 WarehouseSelector ใน browser จะแสดงคลังทั้งหมดนี้!');
  console.log('📍 ตอนนี้ refresh หน้าเว็บแล้วไปดูที่แท็บ "จัดการคลัง"');
}
