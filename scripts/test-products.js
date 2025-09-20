/**
 * Test script to verify products table functionality
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testProducts() {
  try {
    console.log('🧪 Testing Products table functionality...\n');

    // Test 1: Count total products
    const { count: totalCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting products:', countError);
      return;
    }
    console.log(`✅ Total products: ${totalCount}`);

    // Test 2: Count by product type
    const { data: fgCount, error: fgError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('product_type', 'FG');

    const { data: pkCount, error: pkError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('product_type', 'PK');

    if (fgError || pkError) {
      console.error('❌ Error counting by type:', fgError || pkError);
      return;
    }
    console.log(`✅ FG products: ${fgCount?.length || 0}`);
    console.log(`✅ PK products: ${pkCount?.length || 0}`);

    // Test 3: Sample FG products
    const { data: fgSample, error: fgSampleError } = await supabase
      .from('products')
      .select('sku_code, product_name, category, subcategory')
      .eq('product_type', 'FG')
      .limit(3);

    if (fgSampleError) {
      console.error('❌ Error fetching FG samples:', fgSampleError);
      return;
    }
    console.log('\n📦 Sample FG products:');
    fgSample?.forEach(p => console.log(`  ${p.sku_code}: ${p.product_name}`));

    // Test 4: Sample PK products
    const { data: pkSample, error: pkSampleError } = await supabase
      .from('products')
      .select('sku_code, product_name, category, subcategory')
      .eq('product_type', 'PK')
      .limit(3);

    if (pkSampleError) {
      console.error('❌ Error fetching PK samples:', pkSampleError);
      return;
    }
    console.log('\n🏭 Sample PK products:');
    pkSample?.forEach(p => console.log(`  ${p.sku_code}: ${p.product_name}`));

    // Test 5: Test products_with_counts view
    const { data: viewData, error: viewError } = await supabase
      .from('products_with_counts')
      .select('sku_code, product_name, inventory_items_count, total_stock_quantity')
      .limit(5);

    if (viewError) {
      console.error('❌ Error testing products_with_counts view:', viewError);
      return;
    }
    console.log('\n📊 Sample products with inventory counts:');
    viewData?.forEach(p => console.log(`  ${p.sku_code}: ${p.product_name} (Items: ${p.inventory_items_count}, Stock: ${p.total_stock_quantity})`));

    console.log('\n🎉 All tests passed! Products table is working correctly.');

  } catch (error) {
    console.error('💥 Error during testing:', error);
  }
}

// Run the test
testProducts();