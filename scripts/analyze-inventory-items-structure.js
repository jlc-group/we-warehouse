/**
 * Script to analyze inventory_items table structure and product name inconsistencies
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeInventoryStructure() {
  try {
    console.log('🔍 Analyzing inventory_items table structure and product names...\n');

    // 1. Check table schema for inventory_items
    console.log('📋 Checking inventory_items table columns...');
    const { data: inventoryColumns, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'inventory_items' })
      .select();

    if (schemaError) {
      // Alternative method to check columns - get sample data
      console.log('Using alternative method to check structure...');
      const { data: sampleData, error: sampleError } = await supabase
        .from('inventory_items')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error('❌ Error getting sample data:', sampleError);
      } else if (sampleData && sampleData.length > 0) {
        console.log('📊 Sample inventory_items columns:');
        Object.keys(sampleData[0]).forEach(column => {
          console.log(`  - ${column}: ${typeof sampleData[0][column]} (${sampleData[0][column]})`);
        });
      }
    }

    // 2. Check if inventory_items has product_name field
    console.log('\n🔍 Checking for product names in inventory_items...');
    const { data: inventoryWithNames, error: invError } = await supabase
      .from('inventory_items')
      .select('sku, id')
      .limit(5);

    if (invError) {
      console.error('❌ Error fetching inventory_items:', invError);
      return;
    }

    console.log(`📦 Found ${inventoryWithNames?.length || 0} inventory items (sample)`);
    inventoryWithNames?.forEach(item => {
      console.log(`  SKU: ${item.sku}, ID: ${item.id}`);
    });

    // 3. Check products_with_counts view definition
    console.log('\n🏗️ Analyzing products_with_counts view...');

    // Let's see what this view actually returns
    const { data: viewSample, error: viewError } = await supabase
      .from('products_with_counts')
      .select('*')
      .eq('sku_code', 'L3-8G');

    if (viewError) {
      console.error('❌ Error fetching from products_with_counts view:', viewError);
    } else {
      console.log('📊 products_with_counts view sample for L3-8G:');
      if (viewSample && viewSample.length > 0) {
        Object.keys(viewSample[0]).forEach(column => {
          console.log(`  ${column}: ${viewSample[0][column]}`);
        });
      }
    }

    // 4. Compare product names across all three sources
    console.log('\n🔍 Comparing product names for test SKUs...');
    const testSKUs = ['L3-8G', 'L4-8G', 'L8A-6G'];

    for (const sku of testSKUs) {
      console.log(`\n--- SKU: ${sku} ---`);

      // From products table
      const { data: productData } = await supabase
        .from('products')
        .select('sku_code, product_name')
        .eq('sku_code', sku);

      // From conversion rates table
      const { data: rateData } = await supabase
        .from('product_conversion_rates')
        .select('sku, product_name')
        .eq('sku', sku);

      // From products_with_counts view
      const { data: viewData } = await supabase
        .from('products_with_counts')
        .select('sku_code, product_name')
        .eq('sku_code', sku);

      console.log(`  Products table: "${productData?.[0]?.product_name || 'NOT FOUND'}"`);
      console.log(`  Conversion rates: "${rateData?.[0]?.product_name || 'NOT FOUND'}"`);
      console.log(`  View data: "${viewData?.[0]?.product_name || 'NOT FOUND'}"`);

      // Check if they're all the same
      const names = [
        productData?.[0]?.product_name,
        rateData?.[0]?.product_name,
        viewData?.[0]?.product_name
      ].filter(Boolean);

      const uniqueNames = [...new Set(names)];
      if (uniqueNames.length === 1) {
        console.log(`  ✅ All sources consistent`);
      } else {
        console.log(`  ⚠️  INCONSISTENT - ${uniqueNames.length} different names found`);
      }
    }

    // 5. Check inventory_items that might have product names
    console.log('\n🔍 Checking if inventory_items has any product name fields...');

    // Try to see if there are any text fields that might contain product names
    const { data: allInventoryData, error: allInvError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('sku', 'L3-8G')
      .limit(1);

    if (allInvError) {
      console.error('❌ Error fetching full inventory data:', allInvError);
    } else if (allInventoryData && allInventoryData.length > 0) {
      console.log('📊 Full inventory_items record for L3-8G:');
      const record = allInventoryData[0];
      Object.entries(record).forEach(([key, value]) => {
        console.log(`  ${key}: ${value} (${typeof value})`);
      });
    }

    // 6. Check if there's a join issue in the view
    console.log('\n🔗 Testing direct join between products and inventory_items...');
    const { data: joinTest, error: joinError } = await supabase
      .from('inventory_items')
      .select(`
        sku,
        products!inventory_items_sku_fkey (
          sku_code,
          product_name
        )
      `)
      .eq('sku', 'L3-8G')
      .limit(1);

    if (joinError) {
      console.log('ℹ️  Direct foreign key join not available, checking manual join...');

      // Manual join
      const { data: manualJoin, error: manualError } = await supabase
        .from('inventory_items')
        .select('sku')
        .eq('sku', 'L3-8G')
        .limit(1);

      if (!manualError && manualJoin?.length > 0) {
        const { data: productForSku } = await supabase
          .from('products')
          .select('product_name')
          .eq('sku_code', manualJoin[0].sku);

        console.log(`Manual join result: "${productForSku?.[0]?.product_name || 'NOT FOUND'}"`);
      }
    } else {
      console.log('✅ Foreign key join successful:');
      joinTest?.forEach(item => {
        console.log(`  SKU: ${item.sku}, Product Name: "${item.products?.product_name}"`);
      });
    }

    console.log('\n📊 ANALYSIS COMPLETE!');
    console.log('\nNext step: Based on findings, create sync script for any inconsistencies found.');

  } catch (error) {
    console.error('💥 Error during analysis:', error);
  }
}

// Run the analysis
analyzeInventoryStructure();