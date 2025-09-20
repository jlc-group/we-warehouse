/**
 * Script to populate products table from sampleInventory.ts data
 * This script reads the product data and inserts it into Supabase products table
 */

import { createClient } from '@supabase/supabase-js';
import { fg_products, pk_products } from '../src/data/sampleInventory.ts';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateProducts() {
  try {
    console.log('🚀 Starting products data population...');

    // Prepare FG products data
    const fgProductsData = fg_products.map(product => ({
      sku_code: product.code,
      product_name: product.name,
      product_type: 'FG',
      category: 'cosmetics',
      subcategory: getSubcategoryFromName(product.name),
      brand: 'Chulaherb',
      description: `${product.name} - คุณภาพสูง`,
      unit_of_measure: 'pieces',
      storage_conditions: 'อุณหภูมิห้อง',
      manufacturing_country: 'Thailand',
      reorder_level: 10,
      max_stock_level: 100,
      is_active: true
    }));

    // Prepare PK products data
    const pkProductsData = pk_products.map(product => ({
      sku_code: product.code,
      product_name: product.name,
      product_type: 'PK',
      category: 'packaging',
      subcategory: getPackagingSubcategory(product.name, product.code),
      brand: 'Generic',
      description: `${product.name} - วัสดุบรรจุภัณฑ์คุณภาพดี`,
      unit_of_measure: 'pieces',
      storage_conditions: 'อุณหภูมิห้อง',
      manufacturing_country: 'Thailand',
      reorder_level: 50,
      max_stock_level: 500,
      is_active: true
    }));

    console.log(`📦 Inserting ${fgProductsData.length} FG products...`);

    // Insert FG products in batches
    const { data: fgData, error: fgError } = await supabase
      .from('products')
      .upsert(fgProductsData, {
        onConflict: 'sku_code',
        ignoreDuplicates: true
      });

    if (fgError) {
      console.error('❌ Error inserting FG products:', fgError);
    } else {
      console.log(`✅ Successfully inserted ${fgProductsData.length} FG products`);
    }

    console.log(`🏭 Inserting ${pkProductsData.length} PK products...`);

    // Insert PK products in batches
    const { data: pkData, error: pkError } = await supabase
      .from('products')
      .upsert(pkProductsData, {
        onConflict: 'sku_code',
        ignoreDuplicates: true
      });

    if (pkError) {
      console.error('❌ Error inserting PK products:', pkError);
    } else {
      console.log(`✅ Successfully inserted ${pkProductsData.length} PK products`);
    }

    // Verify the data
    const { count: totalCount, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting products:', countError);
    } else {
      console.log(`📊 Total products in database: ${totalCount}`);
    }

    console.log('🎉 Products population completed successfully!');

  } catch (error) {
    console.error('💥 Error during population:', error);
    process.exit(1);
  }
}

// Helper function to determine subcategory from product name
function getSubcategoryFromName(name) {
  const nameLower = name.toLowerCase();

  if (nameLower.includes('เซรั่ม') || nameLower.includes('serum')) return 'serum';
  if (nameLower.includes('ครีม') || nameLower.includes('cream')) return 'cream';
  if (nameLower.includes('โลชั่น') || nameLower.includes('lotion')) return 'lotion';
  if (nameLower.includes('เจล') || nameLower.includes('gel')) return 'gel';
  if (nameLower.includes('ซันสกรีน') || nameLower.includes('sunscreen')) return 'sunscreen';
  if (nameLower.includes('ยูวี') || nameLower.includes('uv')) return 'sunscreen';
  if (nameLower.includes('ทูธเพสท์') || nameLower.includes('toothpaste')) return 'oral_care';
  if (nameLower.includes('มาสก์') || nameLower.includes('mask')) return 'mask';
  if (nameLower.includes('ลิป') || nameLower.includes('lip')) return 'lip_care';
  if (nameLower.includes('คูชั่น') || nameLower.includes('cushion')) return 'makeup';

  return 'skincare';
}

// Helper function to determine packaging subcategory
function getPackagingSubcategory(name, code) {
  const nameLower = name.toLowerCase();
  const codeLower = code.toLowerCase();

  if (codeLower.includes('cap') || nameLower.includes('ฝา')) return 'caps';
  if (codeLower.includes('box') || nameLower.includes('กล่อง')) return 'boxes';
  if (codeLower.includes('bt') || codeLower.includes('bottle') || nameLower.includes('ขวด')) return 'bottles';
  if (codeLower.includes('tb') || codeLower.includes('tube') || nameLower.includes('หลอด')) return 'tubes';
  if (codeLower.includes('sch') || nameLower.includes('ซอง')) return 'sachets';
  if (codeLower.includes('sp') || codeLower.includes('spout') || nameLower.includes('จุก')) return 'spouts';
  if (codeLower.includes('stk') || codeLower.includes('stick') || nameLower.includes('แท่ง')) return 'sticks';
  if (codeLower.includes('stopper') || nameLower.includes('จุกกัน')) return 'stoppers';

  return 'general';
}

// Run the script
populateProducts();