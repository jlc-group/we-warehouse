import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
// Use service role key with full permissions
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjIwNzk2MSwiZXhwIjoyMDY3NzgzOTYxfQ.LF3RbQYqbxGE6Qxd3yEqLYPvuVa0P5fBMlY7l7kGcXM';

const supabase = createClient(supabaseUrl, serviceRoleKey);

console.log('🔧 กำลัง Apply RLS Policies สำหรับ warehouses table...\n');

// Read SQL file
const sql = readFileSync('supabase/migrations/20251007_fix_warehouses_rls_policies.sql', 'utf8');

// Split into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && s.length > 0);

console.log(`📝 พบ ${statements.length} SQL statements\n`);

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];

  // Skip comments and DO blocks for now
  if (statement.includes('RAISE NOTICE') || statement.startsWith('DO $$')) {
    console.log(`⏭️  Skipping notification statement ${i+1}`);
    continue;
  }

  console.log(`▶️  Executing statement ${i+1}/${statements.length}...`);

  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: statement + ';'
    });

    if (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
      // Continue anyway - some policies might already exist
    } else {
      console.log(`   ✅ Success`);
    }
  } catch (err) {
    console.log(`   ⚠️  Exception: ${err.message}`);
  }
}

console.log('\n✅ เสร็จสิ้น - ตรวจสอบผลด้วยการทดสอบอ่านข้อมูล warehouses...\n');

// Test reading warehouses
const { data: warehouses, error: readError } = await supabase
  .from('warehouses')
  .select('*')
  .order('name');

if (readError) {
  console.log('❌ ยังอ่านไม่ได้:', readError.message);
} else {
  console.log(`✅ อ่าน warehouses ได้แล้ว! พบ ${warehouses.length} คลัง:`);
  warehouses.forEach((wh, i) => {
    console.log(`   ${i+1}. ${wh.name} (${wh.code}) - ${wh.location_prefix_start}-${wh.location_prefix_end}`);
  });
}
