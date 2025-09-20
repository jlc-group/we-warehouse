/**
 * Script to inspect the products_with_counts view definition and calculation logic
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectProductsWithCountsView() {
  try {
    console.log('🔍 Inspecting products_with_counts view...\n');

    // 1. Try to get view definition (this might not work with standard client)
    console.log('📋 1. ATTEMPTING TO GET VIEW DEFINITION\n');

    // Since we can't directly get view definition via Supabase client,
    // let's analyze the data to understand the calculation

    // 2. Analyze specific cases to understand the calculation
    console.log('📊 2. ANALYZING SPECIFIC CASES\n');

    const testSKU = 'L3-8G';

    // Get view data
    const { data: viewData, error: viewError } = await supabase
      .from('products_with_counts')
      .select('*')
      .eq('sku_code', testSKU);

    if (viewError) {
      console.error('❌ Error fetching view data:', viewError);
      return;
    }

    console.log(`View data for ${testSKU}:`);
    if (viewData && viewData.length > 0) {
      const item = viewData[0];
      console.log(`  SKU: ${item.sku_code}`);
      console.log(`  Product Name: "${item.product_name}"`);
      console.log(`  Inventory Items Count: ${item.inventory_items_count}`);
      console.log(`  Total Stock Quantity: ${item.total_stock_quantity}`);
    }

    // Get raw inventory data for comparison
    const { data: inventoryData, error: invError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('sku', testSKU);

    if (invError) {
      console.error('❌ Error fetching inventory data:', invError);
      return;
    }

    console.log(`\nRaw inventory data for ${testSKU} (${inventoryData.length} records):`);

    let totalL1 = 0, totalL2 = 0, totalL3 = 0;
    inventoryData.slice(0, 5).forEach((item, index) => {
      console.log(`  ${index + 1}. Location: ${item.location}`);
      console.log(`     L1: ${item.unit_level1_quantity}, L2: ${item.unit_level2_quantity}, L3: ${item.unit_level3_quantity}`);
      totalL1 += item.unit_level1_quantity || 0;
      totalL2 += item.unit_level2_quantity || 0;
      totalL3 += item.unit_level3_quantity || 0;
    });

    if (inventoryData.length > 5) {
      // Calculate totals for all records
      totalL1 = inventoryData.reduce((sum, item) => sum + (item.unit_level1_quantity || 0), 0);
      totalL2 = inventoryData.reduce((sum, item) => sum + (item.unit_level2_quantity || 0), 0);
      totalL3 = inventoryData.reduce((sum, item) => sum + (item.unit_level3_quantity || 0), 0);
      console.log(`  ... and ${inventoryData.length - 5} more records`);
    }

    console.log(`\nTotals across all locations:`);
    console.log(`  Total L1 (level1): ${totalL1}`);
    console.log(`  Total L2 (level2): ${totalL2}`);
    console.log(`  Total L3 (level3): ${totalL3}`);

    // Get conversion rates
    const { data: rateData, error: rateError } = await supabase
      .from('product_conversion_rates')
      .select('*')
      .eq('sku', testSKU);

    if (rateError) {
      console.error('❌ Error fetching conversion rates:', rateError);
      return;
    }

    if (rateData && rateData.length > 0) {
      const rate = rateData[0];
      console.log(`\nConversion rates for ${testSKU}:`);
      console.log(`  L1 rate (${rate.unit_level1_name}): ${rate.unit_level1_rate}`);
      console.log(`  L2 rate (${rate.unit_level2_name}): ${rate.unit_level2_rate}`);
      console.log(`  L3 rate (${rate.unit_level3_name}): 1`);

      // Calculate what the total should be
      const expectedTotal = (totalL1 * rate.unit_level1_rate) + (totalL2 * rate.unit_level2_rate) + totalL3;
      console.log(`\nExpected calculation:`);
      console.log(`  (${totalL1} × ${rate.unit_level1_rate}) + (${totalL2} × ${rate.unit_level2_rate}) + ${totalL3}`);
      console.log(`  = ${totalL1 * rate.unit_level1_rate} + ${totalL2 * rate.unit_level2_rate} + ${totalL3}`);
      console.log(`  = ${expectedTotal}`);

      console.log(`\nComparison:`);
      console.log(`  View shows: ${viewData[0]?.total_stock_quantity}`);
      console.log(`  Expected:   ${expectedTotal}`);
      console.log(`  Match:      ${viewData[0]?.total_stock_quantity === expectedTotal ? '✅' : '❌'}`);

      // Let's see if the view is using a simple sum instead of conversion
      const simpleSum = totalL1 + totalL2 + totalL3;
      console.log(`  Simple sum: ${simpleSum}`);
      console.log(`  Match simple sum: ${viewData[0]?.total_stock_quantity === simpleSum ? '✅' : '❌'}`);
    }

    // 3. Test another SKU to confirm pattern
    console.log('\n📊 3. TESTING ANOTHER SKU (L4-8G)\n');

    const testSKU2 = 'L4-8G';

    const { data: viewData2 } = await supabase
      .from('products_with_counts')
      .select('inventory_items_count, total_stock_quantity')
      .eq('sku_code', testSKU2);

    const { data: inventoryData2 } = await supabase
      .from('inventory_items')
      .select('unit_level1_quantity, unit_level2_quantity, unit_level3_quantity')
      .eq('sku', testSKU2);

    const { data: rateData2 } = await supabase
      .from('product_conversion_rates')
      .select('unit_level1_rate, unit_level2_rate')
      .eq('sku', testSKU2);

    if (viewData2?.[0] && inventoryData2 && rateData2?.[0]) {
      const totalL1_2 = inventoryData2.reduce((sum, item) => sum + (item.unit_level1_quantity || 0), 0);
      const totalL2_2 = inventoryData2.reduce((sum, item) => sum + (item.unit_level2_quantity || 0), 0);
      const totalL3_2 = inventoryData2.reduce((sum, item) => sum + (item.unit_level3_quantity || 0), 0);

      const rate2 = rateData2[0];
      const expectedTotal2 = (totalL1_2 * rate2.unit_level1_rate) + (totalL2_2 * rate2.unit_level2_rate) + totalL3_2;
      const simpleSum2 = totalL1_2 + totalL2_2 + totalL3_2;

      console.log(`${testSKU2} comparison:`);
      console.log(`  View shows: ${viewData2[0].total_stock_quantity}`);
      console.log(`  Expected:   ${expectedTotal2}`);
      console.log(`  Simple sum: ${simpleSum2}`);
      console.log(`  Match expected: ${viewData2[0].total_stock_quantity === expectedTotal2 ? '✅' : '❌'}`);
      console.log(`  Match simple sum: ${viewData2[0].total_stock_quantity === simpleSum2 ? '✅' : '❌'}`);
    }

    // 4. Check if there's any pattern in the calculation
    console.log('\n📊 4. HYPOTHESIS TESTING\n');

    if (viewData?.[0] && inventoryData && rateData?.[0]) {
      const viewTotal = viewData[0].total_stock_quantity;

      // Test different hypotheses
      console.log('Testing different calculation hypotheses:');

      // Hypothesis 1: Using legacy quantities
      const legacySum = inventoryData.reduce((sum, item) =>
        sum + (item.carton_quantity_legacy || 0) + (item.box_quantity_legacy || 0) + (item.pieces_quantity_legacy || 0), 0);
      console.log(`  1. Legacy quantities sum: ${legacySum} ${legacySum === viewTotal ? '✅' : '❌'}`);

      // Hypothesis 2: Only counting level 3 (pieces)
      const level3Only = inventoryData.reduce((sum, item) => sum + (item.unit_level3_quantity || 0), 0);
      console.log(`  2. Level 3 only: ${level3Only} ${level3Only === viewTotal ? '✅' : '❌'}`);

      // Hypothesis 3: Using wrong conversion rates
      if (rateData[0].unit_level1_rate === 504) {
        // This seems like wrong rate - let's check what happens with correct rates
        const correctL1Rate = 144; // from populate-conversion-rates.js
        const correctL2Rate = 12;
        const correctedTotal = (totalL1 * correctL1Rate) + (totalL2 * correctL2Rate) + totalL3;
        console.log(`  3. With correct rates (144/12): ${correctedTotal} ${correctedTotal === viewTotal ? '✅' : '❌'}`);
      }

      // Hypothesis 4: View is not using conversion rates at all
      console.log(`  4. View ignoring conversion rates: ${simpleSum === viewTotal ? '✅' : '❌'}`);
    }

    console.log('\n🎯 CONCLUSION');
    console.log('='.repeat(50));
    console.log('The view appears to be calculating totals incorrectly.');
    console.log('It\'s likely either:');
    console.log('1. Not using conversion rates at all (simple sum)');
    console.log('2. Using wrong conversion rates');
    console.log('3. Using legacy quantity fields instead of unit_level fields');

  } catch (error) {
    console.error('💥 Error during inspection:', error);
  }
}

// Run the inspection
inspectProductsWithCountsView();