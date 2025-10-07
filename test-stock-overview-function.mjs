import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 ทดสอบ get_stock_overview function...\n');

try {
  // Test function call
  const { data, error } = await supabase.rpc('get_stock_overview', {
    p_warehouse_id: null
  });

  if (error) {
    console.log('❌ Error:', error.message);
    console.log('Error details:', error);
  } else if (data) {
    console.log('✅ Function executed successfully!');
    console.log('\n📊 Summary:');
    if (data.summary) {
      console.log(`   Total Items: ${data.summary.totalItems}`);
      console.log(`   Total Products: ${data.summary.totalProducts}`);
      console.log(`   Total Locations: ${data.summary.totalLocations}`);
      console.log(`   Total Pieces: ${data.summary.totalPieces}`);
      console.log(`   Total Cartons: ${data.summary.totalCartons}`);
    }

    console.log('\n📦 Items (first 5):');
    if (data.items && data.items.length > 0) {
      data.items.slice(0, 5).forEach((item, i) => {
        console.log(`   ${i+1}. ${item.productName} (${item.skuCode})`);
        console.log(`      Type: ${item.productType} | Pieces: ${item.totalPieces} | Locations: ${item.locationCount}`);
      });
      console.log(`\n   Total items in response: ${data.items.length}`);
    } else {
      console.log('   No items found');
    }
  } else {
    console.log('⚠️  No data returned');
  }

} catch (err) {
  console.error('❌ Exception:', err.message);
}

console.log('\n✅ เสร็จสิ้น');
