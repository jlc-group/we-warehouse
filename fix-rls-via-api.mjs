const PROJECT_REF = 'ogrcpzzmmudztwjfwjvu';
const ACCESS_TOKEN = 'sbp_5ec0c2ff77d777cbf9b3718599ebecec3a111054';

console.log('🔧 แก้ไข RLS Policies ผ่าน Supabase Management API...\n');

const SQL_STATEMENTS = [
  `DROP POLICY IF EXISTS "Allow public read access to warehouses" ON warehouses;`,
  `DROP POLICY IF EXISTS "Enable read access for all users" ON warehouses;`,
  `DROP POLICY IF EXISTS "warehouses_select_public" ON warehouses;`,
  `DROP POLICY IF EXISTS "warehouses_select_anon" ON warehouses;`,
  `ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;`,
  `CREATE POLICY "warehouses_select_public" ON warehouses FOR SELECT USING (true);`,
  `CREATE POLICY "warehouses_insert_authenticated" ON warehouses FOR INSERT TO authenticated WITH CHECK (true);`,
  `CREATE POLICY "warehouses_update_authenticated" ON warehouses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);`,
  `CREATE POLICY "warehouses_delete_authenticated" ON warehouses FOR DELETE TO authenticated USING (true);`,
  `UPDATE inventory_items SET warehouse_id = 'c6f43c5a-3949-46fd-9165-a3cd6e0b7509' WHERE warehouse_id IS NULL;`
];

// Combine all statements
const fullSql = SQL_STATEMENTS.join('\n');

console.log('📝 SQL to execute:');
console.log(fullSql);
console.log('\n🚀 Executing...\n');

try {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: fullSql
      })
    }
  );

  const result = await response.json();

  if (!response.ok) {
    console.error('❌ API Error:', result);
    console.error('Status:', response.status);
    process.exit(1);
  }

  console.log('✅ Success!');
  console.log('Result:', JSON.stringify(result, null, 2));

  console.log('\n🎉 RLS Policies ถูกอัปเดตแล้ว!');
  console.log('📍 ตอนนี้ทุกคนสามารถอ่าน warehouses ได้');
  console.log('🔒 แต่แก้ไขได้เฉพาะ authenticated users');

} catch (error) {
  console.error('❌ Exception:', error.message);
  process.exit(1);
}
