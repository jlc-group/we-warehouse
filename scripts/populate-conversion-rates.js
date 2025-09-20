/**
 * Script to populate default conversion rates for all products
 * This script creates default unit conversion rates for products that don't have them yet
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Default conversion rates by product type
const DEFAULT_RATES = {
  FG: {
    unit_level1_name: 'ลัง',     // Carton
    unit_level2_name: 'กล่อง',   // Box
    unit_level3_name: 'ชิ้น',    // Pieces
    unit_level1_rate: 144,       // 1 carton = 144 pieces (12 boxes * 12 pieces)
    unit_level2_rate: 12         // 1 box = 12 pieces
  },
  PK: {
    unit_level1_name: 'ลัง',     // Carton
    unit_level2_name: 'กล่อง',   // Box
    unit_level3_name: 'ชิ้น',    // Pieces
    unit_level1_rate: 1000,      // 1 carton = 1000 pieces (packaging usually in larger quantities)
    unit_level2_rate: 100        // 1 box = 100 pieces
  }
};

async function populateConversionRates() {
  try {
    console.log('🔄 Starting conversion rates population...\n');

    // 1. Get all products that don't have conversion rates yet
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('sku_code, product_name, product_type')
      .order('product_type, sku_code');

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return;
    }

    console.log(`📦 Found ${products.length} products to process`);

    // 2. Get existing conversion rates to avoid duplicates
    const { data: existingRates, error: ratesError } = await supabase
      .from('product_conversion_rates')
      .select('sku');

    if (ratesError) {
      console.error('❌ Error fetching existing rates:', ratesError);
      return;
    }

    const existingSKUs = new Set(existingRates?.map(r => r.sku) || []);
    console.log(`📊 Found ${existingSKUs.size} existing conversion rates`);

    // 3. Prepare conversion rates data for products without rates
    const newConversionRates = products
      .filter(product => !existingSKUs.has(product.sku_code))
      .map(product => {
        const defaults = DEFAULT_RATES[product.product_type] || DEFAULT_RATES.FG;

        return {
          sku: product.sku_code,
          product_name: product.product_name,
          unit_level1_name: defaults.unit_level1_name,
          unit_level2_name: defaults.unit_level2_name,
          unit_level3_name: defaults.unit_level3_name,
          unit_level1_rate: defaults.unit_level1_rate,
          unit_level2_rate: defaults.unit_level2_rate
        };
      });

    console.log(`✨ Creating ${newConversionRates.length} new conversion rates...\n`);

    if (newConversionRates.length === 0) {
      console.log('✅ All products already have conversion rates!');
      return;
    }

    // 4. Group by product type for better logging
    const fgRates = newConversionRates.filter(r => r.sku.startsWith('C') || r.sku.startsWith('D'));
    const pkRates = newConversionRates.filter(r => !fgRates.includes(r));

    console.log(`📦 FG products: ${fgRates.length}`);
    console.log(`🏭 PK products: ${pkRates.length}`);

    // 5. Insert in batches
    const batchSize = 50;
    let totalInserted = 0;

    for (let i = 0; i < newConversionRates.length; i += batchSize) {
      const batch = newConversionRates.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from('product_conversion_rates')
        .insert(batch);

      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error);
        continue;
      }

      totalInserted += batch.length;
      console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(newConversionRates.length/batchSize)} (${batch.length} rates)`);
    }

    // 6. Verify results
    const { count: finalCount, error: countError } = await supabase
      .from('product_conversion_rates')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting final results:', countError);
    } else {
      console.log(`\n📊 Total conversion rates in database: ${finalCount}`);
    }

    console.log(`\n🎉 Successfully created ${totalInserted} conversion rates!`);

    // 7. Show sample rates
    const { data: sampleRates } = await supabase
      .from('product_conversion_rates')
      .select('sku, product_name, unit_level1_rate, unit_level2_rate')
      .limit(5);

    console.log('\n📋 Sample conversion rates:');
    sampleRates?.forEach(rate => {
      console.log(`  ${rate.sku}: 1 ลัง = ${rate.unit_level1_rate} ชิ้น, 1 กล่อง = ${rate.unit_level2_rate} ชิ้น`);
    });

  } catch (error) {
    console.error('💥 Error during population:', error);
    process.exit(1);
  }
}

// Run the script
populateConversionRates();