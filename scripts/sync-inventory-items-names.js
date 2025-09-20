/**
 * Script to sync product names in inventory_items table with products table
 * Updates inventory_items.product_name to match products.product_name using products as source of truth
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncInventoryItemsNames() {
  try {
    console.log('🔄 Starting inventory_items product name synchronization...\n');
    console.log('📌 Using products table as source of truth\n');

    // 1. Get all products for reference
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('sku_code, product_name')
      .order('sku_code');

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return;
    }

    // Create products map
    const productsMap = new Map();
    products.forEach(p => productsMap.set(p.sku_code, p.product_name));

    console.log(`📦 Found ${products.length} products as reference`);

    // 2. Get all inventory items with their current product names
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('id, sku, product_name')
      .order('sku');

    if (inventoryError) {
      console.error('❌ Error fetching inventory items:', inventoryError);
      return;
    }

    console.log(`📦 Found ${inventoryItems.length} inventory items to check\n`);

    // 3. Find items that need updates
    const itemsToUpdate = [];
    const skusNotInProducts = new Set();
    const skuUpdateStats = new Map();

    inventoryItems.forEach(item => {
      const correctName = productsMap.get(item.sku);

      if (!correctName) {
        skusNotInProducts.add(item.sku);
        return;
      }

      if (item.product_name !== correctName) {
        itemsToUpdate.push({
          id: item.id,
          sku: item.sku,
          currentName: item.product_name,
          correctName: correctName
        });

        // Track stats per SKU
        if (!skuUpdateStats.has(item.sku)) {
          skuUpdateStats.set(item.sku, {
            sku: item.sku,
            count: 0,
            currentName: item.product_name,
            correctName: correctName
          });
        }
        skuUpdateStats.get(item.sku).count++;
      }
    });

    console.log(`📊 SYNCHRONIZATION PLAN:`);
    console.log(`🔄 Inventory items to update: ${itemsToUpdate.length}`);
    console.log(`⚠️  SKUs not in products table: ${skusNotInProducts.size}`);
    console.log(`📈 Unique SKUs needing updates: ${skuUpdateStats.size}\n`);

    if (itemsToUpdate.length === 0) {
      console.log('✅ All inventory items already have correct product names!');
      if (skusNotInProducts.size > 0) {
        console.log('\n⚠️  However, some inventory items reference SKUs not in products table:');
        Array.from(skusNotInProducts).slice(0, 10).forEach(sku => {
          console.log(`  - ${sku}`);
        });
        if (skusNotInProducts.size > 10) {
          console.log(`  ... and ${skusNotInProducts.size - 10} more`);
        }
      }
      return;
    }

    // 4. Show what will be updated
    console.log(`🔍 SKUs that will be updated:\n`);
    Array.from(skuUpdateStats.values()).forEach((stats, index) => {
      console.log(`${index + 1}. SKU: ${stats.sku} (${stats.count} items)`);
      console.log(`   From: "${stats.currentName}"`);
      console.log(`   To:   "${stats.correctName}"`);
      console.log('');
    });

    // 5. Perform updates in batches
    console.log(`🔄 Starting batch updates...\n`);

    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < itemsToUpdate.length; i += batchSize) {
      const batch = itemsToUpdate.slice(i, i + batchSize);

      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(itemsToUpdate.length/batchSize)} (${batch.length} items)...`);

      // Process each item in the batch
      for (const item of batch) {
        const { error } = await supabase
          .from('inventory_items')
          .update({ product_name: item.correctName })
          .eq('id', item.id);

        if (error) {
          console.log(`  ❌ Error updating ${item.sku} (${item.id}): ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }
      }

      console.log(`  ✅ Batch completed`);
    }

    console.log(`\n📈 UPDATE RESULTS:`);
    console.log(`✅ Successful updates: ${successCount}`);
    console.log(`❌ Failed updates: ${errorCount}`);

    // 6. Verification
    if (successCount > 0) {
      console.log(`\n🔍 Verifying updates...`);

      // Check a few items to make sure they were updated
      const samplesToCheck = Array.from(skuUpdateStats.keys()).slice(0, 3);

      for (const sku of samplesToCheck) {
        const { data: updatedItems, error: checkError } = await supabase
          .from('inventory_items')
          .select('sku, product_name')
          .eq('sku', sku)
          .limit(1);

        if (checkError) {
          console.log(`⚠️  Could not verify ${sku}: ${checkError.message}`);
        } else if (updatedItems && updatedItems.length > 0) {
          const expectedName = productsMap.get(sku);
          const actualName = updatedItems[0].product_name;

          if (actualName === expectedName) {
            console.log(`✅ ${sku}: Verified correct`);
          } else {
            console.log(`❌ ${sku}: Verification failed`);
            console.log(`   Expected: "${expectedName}"`);
            console.log(`   Actual: "${actualName}"`);
          }
        }
      }
    }

    // 7. Handle orphaned SKUs
    if (skusNotInProducts.size > 0) {
      console.log(`\n⚠️  INVENTORY ITEMS WITH UNKNOWN SKUs:\n`);
      console.log(`These inventory items reference SKUs not found in products table:`);
      Array.from(skusNotInProducts).slice(0, 10).forEach((sku, index) => {
        console.log(`${index + 1}. ${sku}`);
      });

      if (skusNotInProducts.size > 10) {
        console.log(`... and ${skusNotInProducts.size - 10} more`);
      }

      console.log(`\n🤔 ACTION REQUIRED FOR ORPHANED SKUs:`);
      console.log(`1. Add missing products to products table, or`);
      console.log(`2. Update SKU codes in inventory_items, or`);
      console.log(`3. Remove orphaned inventory items if no longer valid`);
    }

    // Final summary
    console.log(`\n🎉 SYNCHRONIZATION COMPLETE!\n`);
    console.log(`📊 Summary:`);
    console.log(`✅ Inventory items updated: ${successCount}`);
    console.log(`❌ Update failures: ${errorCount}`);
    console.log(`⚠️  Orphaned inventory items: ${skusNotInProducts.size}`);

    if (errorCount === 0 && skusNotInProducts.size === 0) {
      console.log(`\n🎊 Perfect! All inventory items now have consistent product names!`);
    } else {
      console.log(`\n📝 Next steps:`);
      if (errorCount > 0) {
        console.log(`- Investigate and retry failed updates`);
      }
      if (skusNotInProducts.size > 0) {
        console.log(`- Handle orphaned inventory items`);
      }
      console.log(`- Run analysis script again to verify full consistency`);
    }

  } catch (error) {
    console.error('💥 Error during synchronization:', error);
    process.exit(1);
  }
}

// Run the sync
syncInventoryItemsNames();