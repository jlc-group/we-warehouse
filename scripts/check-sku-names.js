/**
 * Script to check for duplicate product names for SKU L3-8G
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSkuNames() {
  try {
    console.log('🔍 Checking for SKU L3-8G in different tables...\n');

    // Check inventory_items table
    console.log('📦 Checking inventory_items table:');
    const { data: inventoryItems, error: invError } = await supabase
      .from('inventory_items')
      .select('sku, location, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity')
      .eq('sku', 'L3-8G')
      .limit(5);

    if (invError) {
      console.error('❌ Error fetching inventory_items:', invError);
    } else {
      console.log(`Found ${inventoryItems?.length || 0} inventory records for L3-8G:`);
      inventoryItems?.forEach(item => {
        console.log(`  Location: ${item.location}, L1: ${item.unit_level1_quantity}, L2: ${item.unit_level2_quantity}, L3: ${item.unit_level3_quantity}`);
      });
    }

    // Check products table
    console.log('\n🏷️ Checking products table:');
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('sku_code, product_name, product_type')
      .eq('sku_code', 'L3-8G');

    if (prodError) {
      console.error('❌ Error fetching products:', prodError);
    } else {
      console.log(`Found ${products?.length || 0} product records for L3-8G:`);
      products?.forEach(product => {
        console.log(`  SKU: ${product.sku_code}, Name: "${product.product_name}", Type: ${product.product_type}`);
      });
    }

    // Check conversion rates table
    console.log('\n🔄 Checking product_conversion_rates table:');
    const { data: rates, error: ratesError } = await supabase
      .from('product_conversion_rates')
      .select('sku, product_name')
      .eq('sku', 'L3-8G');

    if (ratesError) {
      console.error('❌ Error fetching conversion rates:', ratesError);
    } else {
      console.log(`Found ${rates?.length || 0} conversion rate records for L3-8G:`);
      rates?.forEach(rate => {
        console.log(`  SKU: ${rate.sku}, Name: "${rate.product_name}"`);
      });
    }

    // Check for any product name inconsistencies
    console.log('\n🔍 Checking for name inconsistencies across tables:');
    const productName = products?.[0]?.product_name;
    const rateName = rates?.[0]?.product_name;

    if (productName && rateName && productName !== rateName) {
      console.log('⚠️ INCONSISTENCY FOUND:');
      console.log(`  Products table: "${productName}"`);
      console.log(`  Conversion rates table: "${rateName}"`);
    } else if (productName && rateName && productName === rateName) {
      console.log(`✅ Names are consistent: "${productName}"`);
    } else {
      console.log('ℹ️ No name comparison possible (missing data)');
    }

    // Check similar SKUs for pattern
    console.log('\n🔍 Checking similar L3-* SKUs for pattern:');
    const { data: similarSkus, error: similarError } = await supabase
      .from('products')
      .select('sku_code, product_name')
      .like('sku_code', 'L3-%')
      .limit(10);

    if (similarError) {
      console.error('❌ Error fetching similar SKUs:', similarError);
    } else {
      console.log(`Found ${similarSkus?.length || 0} similar L3-* products:`);
      similarSkus?.forEach(product => {
        console.log(`  ${product.sku_code}: "${product.product_name}"`);
      });
    }

  } catch (error) {
    console.error('💥 Error during check:', error);
  }
}

// Run the check
checkSkuNames();