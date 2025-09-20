/**
 * Script to analyze product name inconsistencies across tables
 * This identifies all SKUs with mismatched product names between tables
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeInconsistencies() {
  try {
    console.log('🔍 Analyzing product name inconsistencies across tables...\n');

    // Fetch all products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('sku_code, product_name, product_type')
      .order('sku_code');

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return;
    }

    console.log(`📦 Found ${products.length} products in products table`);

    // Fetch all conversion rates
    const { data: rates, error: ratesError } = await supabase
      .from('product_conversion_rates')
      .select('sku, product_name')
      .order('sku');

    if (ratesError) {
      console.error('❌ Error fetching conversion rates:', ratesError);
      return;
    }

    console.log(`🔄 Found ${rates.length} conversion rates in product_conversion_rates table\n`);

    // Create maps for easy lookup
    const productsMap = new Map();
    products.forEach(p => productsMap.set(p.sku_code, p));

    const ratesMap = new Map();
    rates.forEach(r => ratesMap.set(r.sku, r));

    // Find inconsistencies
    const inconsistencies = [];
    const missingInRates = [];
    const missingInProducts = [];

    // Check products that exist in both tables but have different names
    products.forEach(product => {
      const rate = ratesMap.get(product.sku_code);
      if (rate) {
        if (product.product_name !== rate.product_name) {
          inconsistencies.push({
            sku: product.sku_code,
            productName: product.product_name,
            rateName: rate.product_name,
            productType: product.product_type
          });
        }
      } else {
        missingInRates.push({
          sku: product.sku_code,
          productName: product.product_name,
          productType: product.product_type
        });
      }
    });

    // Check rates that don't have corresponding products
    rates.forEach(rate => {
      const product = productsMap.get(rate.sku);
      if (!product) {
        missingInProducts.push({
          sku: rate.sku,
          rateName: rate.product_name
        });
      }
    });

    // Report results
    console.log('📊 ANALYSIS RESULTS:\n');

    console.log(`⚠️  Inconsistent names: ${inconsistencies.length}`);
    console.log(`❌ Missing in conversion rates: ${missingInRates.length}`);
    console.log(`❌ Missing in products: ${missingInProducts.length}`);

    if (inconsistencies.length > 0) {
      console.log('\n🔴 NAME INCONSISTENCIES:');
      inconsistencies.forEach((item, index) => {
        console.log(`${index + 1}. SKU: ${item.sku} (${item.productType})`);
        console.log(`   Products table: "${item.productName}"`);
        console.log(`   Rates table:    "${item.rateName}"`);
        console.log('');
      });
    }

    if (missingInRates.length > 0) {
      console.log(`\n🟡 PRODUCTS MISSING IN CONVERSION RATES (${missingInRates.length}):`);
      missingInRates.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.sku}: "${item.productName}" (${item.productType})`);
      });
      if (missingInRates.length > 10) {
        console.log(`... and ${missingInRates.length - 10} more`);
      }
    }

    if (missingInProducts.length > 0) {
      console.log(`\n🟠 CONVERSION RATES MISSING IN PRODUCTS (${missingInProducts.length}):`);
      missingInProducts.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.sku}: "${item.rateName}"`);
      });
      if (missingInProducts.length > 10) {
        console.log(`... and ${missingInProducts.length - 10} more`);
      }
    }

    // Summary by product type
    if (inconsistencies.length > 0) {
      const fgInconsistencies = inconsistencies.filter(i => i.productType === 'FG');
      const pkInconsistencies = inconsistencies.filter(i => i.productType === 'PK');

      console.log('\n📈 INCONSISTENCIES BY TYPE:');
      console.log(`FG products: ${fgInconsistencies.length}`);
      console.log(`PK products: ${pkInconsistencies.length}`);
    }

    // Export data for sync script
    const syncData = {
      inconsistencies,
      missingInRates,
      missingInProducts,
      totalInconsistencies: inconsistencies.length,
      totalMissingInRates: missingInRates.length,
      totalMissingInProducts: missingInProducts.length
    };

    console.log('\n📁 Analysis complete. Data ready for sync script.');
    return syncData;

  } catch (error) {
    console.error('💥 Error during analysis:', error);
    return null;
  }
}

// Run the analysis
const data = await analyzeInconsistencies();
if (data && data.totalInconsistencies > 0) {
  console.log('\n🔧 Next step: Run the sync script to fix inconsistencies');
} else if (data) {
  console.log('\n✅ No inconsistencies found!');
}