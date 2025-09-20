/**
 * Test script to verify conversion rates functionality
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConversionRates() {
  try {
    console.log('🧪 Testing Conversion Rates functionality...\n');

    // Test 1: Count total conversion rates
    const { count: totalCount, error: countError } = await supabase
      .from('product_conversion_rates')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting conversion rates:', countError);
      return;
    }
    console.log(`✅ Total conversion rates: ${totalCount}`);

    // Test 2: Sample FG product conversion rates
    const { data: fgRates, error: fgError } = await supabase
      .from('product_conversion_rates')
      .select('*')
      .like('sku', 'C%')
      .limit(3);

    if (fgError) {
      console.error('❌ Error fetching FG rates:', fgError);
      return;
    }
    console.log('\n📦 Sample FG conversion rates:');
    fgRates?.forEach(rate => {
      console.log(`  ${rate.sku}: ${rate.product_name}`);
      console.log(`    1 ${rate.unit_level1_name} = ${rate.unit_level1_rate} ${rate.unit_level3_name}`);
      console.log(`    1 ${rate.unit_level2_name} = ${rate.unit_level2_rate} ${rate.unit_level3_name}`);
    });

    // Test 3: Sample PK product conversion rates
    const { data: pkRates, error: pkError } = await supabase
      .from('product_conversion_rates')
      .select('*')
      .like('sku', 'PK%')
      .limit(3);

    if (pkError) {
      console.error('❌ Error fetching PK rates:', pkError);
      return;
    }
    console.log('\n🏭 Sample PK conversion rates:');
    pkRates?.forEach(rate => {
      console.log(`  ${rate.sku}: ${rate.product_name}`);
      console.log(`    1 ${rate.unit_level1_name} = ${rate.unit_level1_rate} ${rate.unit_level3_name}`);
      console.log(`    1 ${rate.unit_level2_name} = ${rate.unit_level2_rate} ${rate.unit_level3_name}`);
    });

    // Test 4: Test join with products table
    const { data: joinData, error: joinError } = await supabase
      .from('products')
      .select(`
        sku_code,
        product_name,
        product_type,
        product_conversion_rates (
          unit_level1_name,
          unit_level2_name,
          unit_level3_name,
          unit_level1_rate,
          unit_level2_rate
        )
      `)
      .eq('sku_code', 'C1-15G');

    if (joinError) {
      console.error('❌ Error testing product join:', joinError);
    } else {
      console.log('\n🔗 Product-ConversionRate join test:');
      console.log('  Product:', joinData[0]?.product_name);
      console.log('  Conversion rates:', joinData[0]?.product_conversion_rates);
    }

    // Test 5: Calculate sample conversions
    console.log('\n🧮 Sample unit conversions:');
    const sampleProduct = fgRates?.[0];
    if (sampleProduct) {
      const cartons = 2;
      const boxes = 5;
      const pieces = 10;

      const totalPieces =
        (cartons * sampleProduct.unit_level1_rate) +
        (boxes * sampleProduct.unit_level2_rate) +
        pieces;

      console.log(`  ${sampleProduct.sku}:`);
      console.log(`    ${cartons} ลัง + ${boxes} กล่อง + ${pieces} ชิ้น`);
      console.log(`    = ${cartons} × ${sampleProduct.unit_level1_rate} + ${boxes} × ${sampleProduct.unit_level2_rate} + ${pieces}`);
      console.log(`    = ${totalPieces} ชิ้น รวม`);
    }

    // Test 6: Verify all products have conversion rates
    const { data: missingRates, error: missingError } = await supabase
      .from('products')
      .select(`
        sku_code,
        product_name,
        product_conversion_rates!left (sku)
      `)
      .is('product_conversion_rates.sku', null)
      .limit(5);

    if (missingError) {
      console.error('❌ Error checking missing rates:', missingError);
    } else {
      console.log(`\n📊 Products without conversion rates: ${missingRates?.length || 0}`);
      if (missingRates?.length > 0) {
        console.log('Missing rates for:');
        missingRates.forEach(p => console.log(`  - ${p.sku_code}: ${p.product_name}`));
      } else {
        console.log('✅ All products have conversion rates!');
      }
    }

    console.log('\n🎉 All conversion rate tests completed!');

  } catch (error) {
    console.error('💥 Error during testing:', error);
  }
}

// Run the test
testConversionRates();