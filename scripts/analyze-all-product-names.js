/**
 * Script to analyze product name inconsistencies across all 3 tables:
 * products, product_conversion_rates, and inventory_items
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeAllProductNames() {
  try {
    console.log('🔍 Analyzing product names across products, conversion rates, and inventory_items...\n');

    // 1. Get all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('sku_code, product_name')
      .order('sku_code');

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return;
    }

    // 2. Get all conversion rates
    const { data: rates, error: ratesError } = await supabase
      .from('product_conversion_rates')
      .select('sku, product_name')
      .order('sku');

    if (ratesError) {
      console.error('❌ Error fetching conversion rates:', ratesError);
      return;
    }

    // 3. Get unique product names from inventory_items
    const { data: inventoryNames, error: invError } = await supabase
      .from('inventory_items')
      .select('sku, product_name')
      .order('sku');

    if (invError) {
      console.error('❌ Error fetching inventory names:', invError);
      return;
    }

    console.log(`📊 Data Summary:`);
    console.log(`  Products: ${products.length}`);
    console.log(`  Conversion rates: ${rates.length}`);
    console.log(`  Inventory items: ${inventoryNames.length}\n`);

    // Create maps for lookup
    const productsMap = new Map();
    products.forEach(p => productsMap.set(p.sku_code, p.product_name));

    const ratesMap = new Map();
    rates.forEach(r => ratesMap.set(r.sku, r.product_name));

    // Group inventory items by SKU with unique names
    const inventoryMap = new Map();
    inventoryNames.forEach(item => {
      if (!inventoryMap.has(item.sku)) {
        inventoryMap.set(item.sku, new Set());
      }
      inventoryMap.get(item.sku).add(item.product_name);
    });

    // Find inconsistencies
    const inconsistencies = [];
    const allSKUs = new Set([
      ...products.map(p => p.sku_code),
      ...rates.map(r => r.sku),
      ...Array.from(inventoryMap.keys())
    ]);

    console.log(`🔍 Analyzing ${allSKUs.size} unique SKUs...\n`);

    for (const sku of allSKUs) {
      const productName = productsMap.get(sku);
      const rateName = ratesMap.get(sku);
      const inventoryNames = inventoryMap.get(sku);

      const names = [];
      const sources = [];

      if (productName) {
        names.push(productName);
        sources.push('products');
      }
      if (rateName) {
        names.push(rateName);
        sources.push('conversion_rates');
      }
      if (inventoryNames) {
        inventoryNames.forEach(name => {
          names.push(name);
          sources.push('inventory_items');
        });
      }

      // Check for inconsistencies
      const uniqueNames = [...new Set(names)];
      if (uniqueNames.length > 1) {
        inconsistencies.push({
          sku,
          productName,
          rateName,
          inventoryNames: inventoryNames ? Array.from(inventoryNames) : [],
          uniqueNames,
          sources: sources.slice(0, uniqueNames.length)
        });
      }
    }

    // Report results
    console.log(`📊 ANALYSIS RESULTS:`);
    console.log(`❌ SKUs with inconsistent names: ${inconsistencies.length}\n`);

    if (inconsistencies.length > 0) {
      console.log(`🔴 INCONSISTENCIES FOUND:\n`);

      inconsistencies.forEach((item, index) => {
        console.log(`${index + 1}. SKU: ${item.sku}`);
        console.log(`   Products table: "${item.productName || 'NOT FOUND'}"`);
        console.log(`   Conversion rates: "${item.rateName || 'NOT FOUND'}"`);

        if (item.inventoryNames.length > 0) {
          console.log(`   Inventory items:`);
          item.inventoryNames.forEach((name, idx) => {
            console.log(`     ${idx + 1}. "${name}"`);
          });
        } else {
          console.log(`   Inventory items: NOT FOUND`);
        }

        console.log(`   → Total unique names: ${item.uniqueNames.length}`);
        console.log('');
      });

      // Show inventory_items that need updating
      const inventoryUpdatesNeeded = inconsistencies.filter(item =>
        item.productName && item.inventoryNames.length > 0 &&
        !item.inventoryNames.includes(item.productName)
      );

      console.log(`🔧 INVENTORY_ITEMS UPDATES NEEDED: ${inventoryUpdatesNeeded.length}\n`);

      if (inventoryUpdatesNeeded.length > 0) {
        console.log(`These SKUs need their inventory_items product_name updated:`);
        inventoryUpdatesNeeded.forEach((item, index) => {
          console.log(`${index + 1}. ${item.sku}:`);
          console.log(`   Should be: "${item.productName}"`);
          console.log(`   Currently: ${item.inventoryNames.map(n => `"${n}"`).join(', ')}`);
          console.log('');
        });
      }

      // Summary by type of issue
      const missingInProducts = inconsistencies.filter(i => !i.productName);
      const missingInRates = inconsistencies.filter(i => !i.rateName);
      const missingInInventory = inconsistencies.filter(i => i.inventoryNames.length === 0);

      console.log(`📈 SUMMARY BY ISSUE TYPE:`);
      console.log(`Missing in products: ${missingInProducts.length}`);
      console.log(`Missing in conversion_rates: ${missingInRates.length}`);
      console.log(`Missing in inventory_items: ${missingInInventory.length}`);
      console.log(`Need inventory_items update: ${inventoryUpdatesNeeded.length}`);

    } else {
      console.log(`✅ Perfect! All product names are consistent across all tables.`);
    }

    console.log(`\n🎯 NEXT STEPS:`);
    if (inconsistencies.length > 0) {
      console.log(`1. Update inventory_items product_name to match products table`);
      console.log(`2. Handle missing products/rates if needed`);
      console.log(`3. Re-run analysis to verify fixes`);
    } else {
      console.log(`All product names are synchronized. No action needed!`);
    }

    return {
      inconsistencies,
      inventoryUpdatesNeeded,
      totalSKUs: allSKUs.size
    };

  } catch (error) {
    console.error('💥 Error during analysis:', error);
    return null;
  }
}

// Run the analysis
const result = await analyzeAllProductNames();
if (result && result.inventoryUpdatesNeeded.length > 0) {
  console.log('\n🚀 Ready to create sync script for inventory_items updates.');
}