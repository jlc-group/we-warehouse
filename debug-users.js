// Debug script to check users table
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

console.log('🔍 Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey ? 'Set' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUsersTable() {
  try {
    console.log('\n📋 Testing users table...');

    // Test table existence and permissions
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Query successful!');
    console.log('📊 Count:', count);
    console.log('📋 Data:', data);

  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('\n🔐 Auth user:', user);
}

// Run tests
checkAuth();
testUsersTable();