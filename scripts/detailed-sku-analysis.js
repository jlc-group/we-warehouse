/**
 * Script to perform detailed analysis of a specific SKU (L3-8G)
 * to understand the discrepancy in quantity calculations
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function detailedSkuAnalysis() {
  try {
    const testSKU = 'L3-8G';
    console.log(`🔍 Detailed Analysis for SKU: ${testSKU}\n`);

    // 1. Get product info
    console.log('📋 1. PRODUCT INFORMATION');
    const { data: productData } = await supabase
      .from('products')
      .select('*')
      .eq('sku_code', testSKU);

    if (productData && productData.length > 0) {
      const product = productData[0];
      console.log(`  SKU: ${product.sku_code}`);
      console.log(`  Name: "${product.product_name}"`);
      console.log(`  Type: ${product.product_type}`);
    }

    // 2. Get conversion rates from product_conversion_rates
    console.log('\n📋 2. CONVERSION RATES (from product_conversion_rates table)');
    const { data: correctRates } = await supabase
      .from('product_conversion_rates')
      .select('*')
      .eq('sku', testSKU);

    if (correctRates && correctRates.length > 0) {
      const rate = correctRates[0];
      console.log(`  L1 (${rate.unit_level1_name}): ${rate.unit_level1_rate} pieces`);
      console.log(`  L2 (${rate.unit_level2_name}): ${rate.unit_level2_rate} pieces`);
      console.log(`  L3 (${rate.unit_level3_name}): 1 piece`);
    }

    // 3. Get view data
    console.log('\n📋 3. VIEW DATA (from products_with_counts)');
    const { data: viewData } = await supabase
      .from('products_with_counts')
      .select('*')
      .eq('sku_code', testSKU);

    if (viewData && viewData.length > 0) {
      const view = viewData[0];
      console.log(`  Inventory Items Count: ${view.inventory_items_count}`);
      console.log(`  Total Stock Quantity: ${view.total_stock_quantity}`);
    }

    // 4. Get all inventory items for this SKU
    console.log('\n📋 4. INVENTORY ITEMS BREAKDOWN');
    const { data: inventoryData } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('sku', testSKU)
      .order('location');

    if (inventoryData) {
      console.log(`  Total records: ${inventoryData.length}`);
      console.log('\n  Sample records:');

      let totalL1 = 0, totalL2 = 0, totalL3 = 0;
      let totalLegacyCarton = 0, totalLegacyBox = 0, totalLegacyPieces = 0;

      inventoryData.slice(0, 10).forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.location}:`);
        console.log(`       Current: L1=${item.unit_level1_quantity}, L2=${item.unit_level2_quantity}, L3=${item.unit_level3_quantity}`);
        console.log(`       Legacy:  C=${item.carton_quantity_legacy}, B=${item.box_quantity_legacy}, P=${item.pieces_quantity_legacy}`);
        console.log(`       Rates:   L1=${item.unit_level1_rate}, L2=${item.unit_level2_rate}`);
      });

      if (inventoryData.length > 10) {
        console.log(`    ... and ${inventoryData.length - 10} more records`);
      }

      // Calculate totals
      inventoryData.forEach(item => {
        totalL1 += item.unit_level1_quantity || 0;
        totalL2 += item.unit_level2_quantity || 0;
        totalL3 += item.unit_level3_quantity || 0;
        totalLegacyCarton += item.carton_quantity_legacy || 0;
        totalLegacyBox += item.box_quantity_legacy || 0;
        totalLegacyPieces += item.pieces_quantity_legacy || 0;
      });

      console.log('\n  TOTALS:');
      console.log(`    Current units: L1=${totalL1}, L2=${totalL2}, L3=${totalL3}`);
      console.log(`    Legacy units:  C=${totalLegacyCarton}, B=${totalLegacyBox}, P=${totalLegacyPieces}`);

      // 5. Calculate different scenarios
      console.log('\n📋 5. CALCULATION SCENARIOS');

      if (correctRates && correctRates.length > 0) {
        const rate = correctRates[0];

        // Scenario 1: Correct calculation with product_conversion_rates
        const correctTotal = (totalL1 * rate.unit_level1_rate) + (totalL2 * rate.unit_level2_rate) + totalL3;
        console.log(`  1. With correct rates (${rate.unit_level1_rate}/${rate.unit_level2_rate}):`);
        console.log(`     (${totalL1} × ${rate.unit_level1_rate}) + (${totalL2} × ${rate.unit_level2_rate}) + ${totalL3} = ${correctTotal}`);

        // Scenario 2: Using inventory_items rates (first record)
        if (inventoryData.length > 0) {
          const invRate = inventoryData[0];
          const invTotal = (totalL1 * invRate.unit_level1_rate) + (totalL2 * invRate.unit_level2_rate) + totalL3;
          console.log(`  2. With inventory rates (${invRate.unit_level1_rate}/${invRate.unit_level2_rate}):`);
          console.log(`     (${totalL1} × ${invRate.unit_level1_rate}) + (${totalL2} × ${invRate.unit_level2_rate}) + ${totalL3} = ${invTotal}`);
        }

        // Scenario 3: Legacy quantities
        const legacyTotal = totalLegacyCarton + totalLegacyBox + totalLegacyPieces;
        console.log(`  3. Legacy quantities sum: ${totalLegacyCarton} + ${totalLegacyBox} + ${totalLegacyPieces} = ${legacyTotal}`);

        // Scenario 4: Simple sum
        const simpleSum = totalL1 + totalL2 + totalL3;
        console.log(`  4. Simple sum: ${totalL1} + ${totalL2} + ${totalL3} = ${simpleSum}`);

        // Scenario 5: Check if view matches any
        const viewTotal = viewData?.[0]?.total_stock_quantity || 0;
        console.log('\n📊 6. COMPARISON WITH VIEW');
        console.log(`  View total: ${viewTotal}`);
        console.log(`  Matches scenario 1 (correct): ${viewTotal === correctTotal ? '✅' : '❌'}`);
        console.log(`  Matches scenario 2 (inventory rates): ${inventoryData.length > 0 && viewTotal === ((totalL1 * inventoryData[0].unit_level1_rate) + (totalL2 * inventoryData[0].unit_level2_rate) + totalL3) ? '✅' : '❌'}`);
        console.log(`  Matches scenario 3 (legacy): ${viewTotal === legacyTotal ? '✅' : '❌'}`);
        console.log(`  Matches scenario 4 (simple): ${viewTotal === simpleSum ? '✅' : '❌'}`);

        // Try to figure out what calculation gives us 2062
        console.log('\n🔍 7. REVERSE ENGINEERING THE VIEW CALCULATION');
        const targetValue = 2062;

        // Test different rate combinations that could give us 2062
        console.log(`  Target value: ${targetValue}`);

        // Maybe it's using a different calculation entirely?
        // Let's check if there's a pattern

        // Check if 2062 matches any single field sum
        const singleFieldTests = [
          { name: 'L1 only', value: totalL1 },
          { name: 'L2 only', value: totalL2 },
          { name: 'L3 only', value: totalL3 },
          { name: 'Legacy carton', value: totalLegacyCarton },
          { name: 'Legacy box', value: totalLegacyBox },
          { name: 'Legacy pieces', value: totalLegacyPieces }
        ];

        singleFieldTests.forEach(test => {
          console.log(`    ${test.name}: ${test.value} ${test.value === targetValue ? '✅' : '❌'}`);
        });

        // Check if it's L1 + L2 with rate 1
        const l1PlusL2 = totalL1 + totalL2;
        console.log(`    L1 + L2 (rate 1): ${l1PlusL2} ${l1PlusL2 === targetValue ? '✅' : '❌'}`);

        // Check if it's some weird calculation
        const possibleCalc1 = totalL1 + (totalL2 * 12); // L2 with correct rate
        console.log(`    L1 + (L2 × 12): ${possibleCalc1} ${possibleCalc1 === targetValue ? '✅' : '❌'}`);

        // Maybe it's counting something else?
        console.log('\n  Investigating if view is using a different aggregation...');
      }
    }

    console.log('\n🎯 CONCLUSION');
    console.log('='.repeat(50));
    console.log('The view appears to be using an unknown calculation method.');
    console.log('Recommendation: Replace view usage with direct calculation in ProductSummaryTable.');

  } catch (error) {
    console.error('💥 Error during detailed analysis:', error);
  }
}

// Run the analysis
detailedSkuAnalysis();