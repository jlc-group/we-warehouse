/**
 * Script to verify product summary data accuracy
 * Compares data between different sources to ensure correctness
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyProductSummaryData() {
  try {
    console.log('🔍 Verifying Product Summary Data Accuracy...\n');

    // 1. Compare total product counts
    console.log('📊 1. COMPARING TOTAL PRODUCT COUNTS');

    // Count from products table
    const { count: productsCount, error: productsCountError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (productsCountError) {
      console.error('❌ Error counting products:', productsCountError);
      return;
    }

    // Count from products_with_counts view
    const { count: viewCount, error: viewCountError } = await supabase
      .from('products_with_counts')
      .select('*', { count: 'exact', head: true });

    if (viewCountError) {
      console.error('❌ Error counting products_with_counts:', viewCountError);
      return;
    }

    console.log(`  Products table: ${productsCount}`);
    console.log(`  Products_with_counts view: ${viewCount}`);
    console.log(`  Match: ${productsCount === viewCount ? '✅' : '❌'}\n`);

    // 2. Check sample products in detail
    console.log('📊 2. DETAILED VERIFICATION OF SAMPLE PRODUCTS\n');

    const testSKUs = ['L3-8G', 'L4-8G', 'C1-15G', 'BOX-C4-M01_WHT'];

    for (const sku of testSKUs) {
      console.log(`--- SKU: ${sku} ---`);

      // Get product from products table
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('sku_code, product_name, product_type')
        .eq('sku_code', sku);

      if (productError) {
        console.error(`❌ Error fetching product ${sku}:`, productError);
        continue;
      }

      if (!productData || productData.length === 0) {
        console.log(`  ⚠️ Product ${sku} not found in products table`);
        continue;
      }

      // Get data from products_with_counts view
      const { data: viewData, error: viewError } = await supabase
        .from('products_with_counts')
        .select('sku_code, product_name, inventory_items_count, total_stock_quantity')
        .eq('sku_code', sku);

      if (viewError) {
        console.error(`❌ Error fetching view data for ${sku}:`, viewError);
        continue;
      }

      // Get raw inventory data
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('sku, product_name, location, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity')
        .eq('sku', sku);

      if (inventoryError) {
        console.error(`❌ Error fetching inventory data for ${sku}:`, inventoryError);
        continue;
      }

      // Get conversion rates
      const { data: rateData, error: rateError } = await supabase
        .from('product_conversion_rates')
        .select('sku, unit_level1_rate, unit_level2_rate')
        .eq('sku', sku);

      // Calculate manual total
      let manualTotal = 0;
      if (inventoryData && rateData && rateData.length > 0) {
        const rate = rateData[0];
        inventoryData.forEach(item => {
          const l1Pieces = (item.unit_level1_quantity || 0) * (rate.unit_level1_rate || 0);
          const l2Pieces = (item.unit_level2_quantity || 0) * (rate.unit_level2_rate || 0);
          const l3Pieces = item.unit_level3_quantity || 0;
          manualTotal += l1Pieces + l2Pieces + l3Pieces;
        });
      }

      console.log(`  Product Name: "${productData[0].product_name}"`);
      console.log(`  Product Type: ${productData[0].product_type}`);
      console.log(`  Inventory Records: ${inventoryData ? inventoryData.length : 0}`);
      console.log(`  View Count: ${viewData && viewData.length > 0 ? viewData[0].inventory_items_count : 'N/A'}`);
      console.log(`  View Total Quantity: ${viewData && viewData.length > 0 ? viewData[0].total_stock_quantity : 'N/A'}`);
      console.log(`  Manual Calculation: ${manualTotal}`);

      if (viewData && viewData.length > 0) {
        const viewTotal = viewData[0].total_stock_quantity;
        const countMatch = inventoryData.length === viewData[0].inventory_items_count;
        const quantityMatch = manualTotal === viewTotal;

        console.log(`  Count Match: ${countMatch ? '✅' : '❌'}`);
        console.log(`  Quantity Match: ${quantityMatch ? '✅' : '❌'}`);

        if (!quantityMatch) {
          console.log(`  ⚠️ MISMATCH - View: ${viewTotal}, Manual: ${manualTotal}`);
        }
      }
      console.log('');
    }

    // 3. Check aggregate statistics
    console.log('📊 3. AGGREGATE STATISTICS VERIFICATION\n');

    // Get all data from view
    const { data: allViewData, error: allViewError } = await supabase
      .from('products_with_counts')
      .select('sku_code, product_type, inventory_items_count, total_stock_quantity');

    if (allViewError) {
      console.error('❌ Error fetching all view data:', allViewError);
      return;
    }

    const stats = {
      totalProducts: allViewData.length,
      totalStock: allViewData.reduce((sum, item) => sum + (item.total_stock_quantity || 0), 0),
      productsWithStock: allViewData.filter(item => (item.total_stock_quantity || 0) > 0).length,
      fgProducts: allViewData.filter(item => item.product_type === 'FG').length,
      pkProducts: allViewData.filter(item => item.product_type === 'PK').length,
      totalLocations: allViewData.reduce((sum, item) => sum + (item.inventory_items_count || 0), 0)
    };

    console.log(`Total Products: ${stats.totalProducts}`);
    console.log(`Total Stock (pieces): ${stats.totalStock.toLocaleString()}`);
    console.log(`Products with Stock: ${stats.productsWithStock}`);
    console.log(`FG Products: ${stats.fgProducts}`);
    console.log(`PK Products: ${stats.pkProducts}`);
    console.log(`Total Inventory Locations: ${stats.totalLocations}`);

    // 4. Verify against raw counts
    console.log('\n📊 4. RAW DATA VERIFICATION\n');

    const { count: rawInventoryCount, error: rawInvError } = await supabase
      .from('inventory_items')
      .select('*', { count: 'exact', head: true });

    if (rawInvError) {
      console.error('❌ Error counting inventory items:', rawInvError);
    } else {
      console.log(`Raw inventory_items count: ${rawInventoryCount}`);
      console.log(`Aggregated locations count: ${stats.totalLocations}`);
      console.log(`Match: ${rawInventoryCount === stats.totalLocations ? '✅' : '❌'}`);
    }

    // 5. Check for products without inventory
    const productsWithoutInventory = allViewData.filter(item =>
      (item.inventory_items_count || 0) === 0
    );

    console.log(`\nProducts without inventory: ${productsWithoutInventory.length}`);
    if (productsWithoutInventory.length > 0) {
      console.log('Sample products without inventory:');
      productsWithoutInventory.slice(0, 5).forEach(item => {
        console.log(`  - ${item.sku_code}`);
      });
    }

    // 6. Final summary
    console.log('\n🎯 VERIFICATION SUMMARY');
    console.log('='.repeat(50));

    const issues = [];

    if (productsCount !== viewCount) {
      issues.push('Product count mismatch between tables');
    }

    if (rawInventoryCount !== stats.totalLocations) {
      issues.push('Inventory count aggregation mismatch');
    }

    if (issues.length === 0) {
      console.log('✅ All verifications passed! Data appears consistent.');
    } else {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }

    console.log(`\n📈 Key Metrics for ProductSummaryTable:`);
    console.log(`  - Total Products: ${stats.totalProducts}`);
    console.log(`  - Products with Stock: ${stats.productsWithStock}`);
    console.log(`  - Total Stock: ${stats.totalStock.toLocaleString()} pieces`);
    console.log(`  - FG vs PK: ${stats.fgProducts} vs ${stats.pkProducts}`);

  } catch (error) {
    console.error('💥 Error during verification:', error);
  }
}

// Run the verification
verifyProductSummaryData();