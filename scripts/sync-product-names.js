/**
 * Script to sync product names using products table as source of truth
 * Updates product_conversion_rates table to match products table names
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncProductNames() {
  try {
    console.log('🔄 Starting product name synchronization...\n');
    console.log('📌 Using products table as source of truth\n');

    // Step 1: Get inconsistencies data
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('sku_code, product_name, product_type')
      .order('sku_code');

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return;
    }

    const { data: rates, error: ratesError } = await supabase
      .from('product_conversion_rates')
      .select('sku, product_name')
      .order('sku');

    if (ratesError) {
      console.error('❌ Error fetching conversion rates:', ratesError);
      return;
    }

    // Create maps for easy lookup
    const productsMap = new Map();
    products.forEach(p => productsMap.set(p.sku_code, p));

    const ratesMap = new Map();
    rates.forEach(r => ratesMap.set(r.sku, r));

    // Find items that need updates
    const itemsToUpdate = [];
    const itemsToDelete = [];

    products.forEach(product => {
      const rate = ratesMap.get(product.sku_code);
      if (rate && product.product_name !== rate.product_name) {
        itemsToUpdate.push({
          sku: product.sku_code,
          newName: product.product_name,
          oldName: rate.product_name,
          productType: product.product_type
        });
      }
    });

    // Find rates without corresponding products (these should be deleted or reviewed)
    rates.forEach(rate => {
      const product = productsMap.get(rate.sku);
      if (!product) {
        itemsToDelete.push({
          sku: rate.sku,
          rateName: rate.product_name
        });
      }
    });

    console.log(`📊 SYNCHRONIZATION PLAN:`);
    console.log(`🔄 Names to update: ${itemsToUpdate.length}`);
    console.log(`🗑️  Items to review (no product): ${itemsToDelete.length}\n`);

    if (itemsToUpdate.length === 0 && itemsToDelete.length === 0) {
      console.log('✅ All product names are already synchronized!');
      return;
    }

    // Step 2: Update inconsistent names
    if (itemsToUpdate.length > 0) {
      console.log('🔄 Updating inconsistent product names...\n');

      let successCount = 0;
      let errorCount = 0;

      for (const item of itemsToUpdate) {
        console.log(`Updating ${item.sku}:`);
        console.log(`  From: "${item.oldName}"`);
        console.log(`  To:   "${item.newName}"`);

        const { error } = await supabase
          .from('product_conversion_rates')
          .update({ product_name: item.newName })
          .eq('sku', item.sku);

        if (error) {
          console.log(`  ❌ Error: ${error.message}`);
          errorCount++;
        } else {
          console.log(`  ✅ Updated successfully`);
          successCount++;
        }
        console.log('');
      }

      console.log(`📈 Update Results:`);
      console.log(`✅ Successful updates: ${successCount}`);
      console.log(`❌ Failed updates: ${errorCount}\n`);
    }

    // Step 3: Handle items without products
    if (itemsToDelete.length > 0) {
      console.log('⚠️  ITEMS WITHOUT CORRESPONDING PRODUCTS:\n');
      console.log('These conversion rates exist but have no matching product:');

      itemsToDelete.forEach((item, index) => {
        console.log(`${index + 1}. ${item.sku}: "${item.rateName}"`);
      });

      console.log('\n🤔 ACTION REQUIRED:');
      console.log('These items need manual review. Options:');
      console.log('1. Add missing products to products table');
      console.log('2. Delete these conversion rates if products no longer exist');
      console.log('3. Check if SKU codes have changed\n');
    }

    // Step 4: Verification
    console.log('🔍 Verifying synchronization...\n');

    const { data: updatedRates, error: verifyError } = await supabase
      .from('product_conversion_rates')
      .select('sku, product_name')
      .in('sku', itemsToUpdate.map(item => item.sku));

    if (verifyError) {
      console.error('❌ Error during verification:', verifyError);
      return;
    }

    // Check if updates were successful
    let verificationSuccess = true;
    for (const item of itemsToUpdate) {
      const updatedRate = updatedRates.find(r => r.sku === item.sku);
      if (!updatedRate || updatedRate.product_name !== item.newName) {
        console.log(`⚠️  Verification failed for ${item.sku}`);
        verificationSuccess = false;
      }
    }

    if (verificationSuccess && itemsToUpdate.length > 0) {
      console.log('✅ All updates verified successfully!');
    }

    // Final summary
    console.log('\n🎉 SYNCHRONIZATION COMPLETE!\n');
    console.log('📊 Summary:');
    console.log(`✅ Product names synchronized: ${itemsToUpdate.length}`);
    console.log(`⚠️  Items needing review: ${itemsToDelete.length}`);

    if (itemsToDelete.length > 0) {
      console.log('\n📝 Next steps:');
      console.log('1. Review items without products');
      console.log('2. Add missing products or clean up orphaned conversion rates');
      console.log('3. Run this script again to ensure full synchronization');
    } else {
      console.log('\n🎊 Perfect! All product names are now synchronized across tables.');
    }

  } catch (error) {
    console.error('💥 Error during synchronization:', error);
    process.exit(1);
  }
}

// Run the sync
syncProductNames();