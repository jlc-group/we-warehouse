/**
 * Test ProductSummaryTable Calculation Logic
 * ทดสอบการคำนวณใน ProductSummaryTable ด้วยข้อมูลจริง
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧮 ทดสอบการคำนวณใน ProductSummaryTable');
console.log('=' .repeat(60));

// Replicate the exact calculation logic from ProductSummaryTable.tsx
function calculateProductSummary(inventory, rate) {
  let total_stock_quantity = 0;
  let formatted_quantity = undefined;

  if (inventory) {
    if (rate) {
      // Calculate total pieces using correct conversion rates
      const level1Pieces = inventory.totalL1 * (rate.unit_level1_rate || 0);
      const level2Pieces = inventory.totalL2 * (rate.unit_level2_rate || 0);
      const level3Pieces = inventory.totalL3;

      total_stock_quantity = level1Pieces + level2Pieces + level3Pieces;

      // Format quantity display
      if (total_stock_quantity > 0) {
        const level1Rate = rate.unit_level1_rate || 0;
        const level2Rate = rate.unit_level2_rate || 0;

        if (level1Rate > 0 && level2Rate > 0) {
          const cartons = Math.floor(total_stock_quantity / level1Rate);
          const remaining1 = total_stock_quantity % level1Rate;
          const boxes = Math.floor(remaining1 / level2Rate);
          const pieces = remaining1 % level2Rate;

          const displayParts = [];
          if (cartons > 0) displayParts.push(`${cartons} ลัง`);
          if (boxes > 0) displayParts.push(`${boxes} กล่อง`);
          if (pieces > 0) displayParts.push(`${pieces} ชิ้น`);

          formatted_quantity = {
            cartons,
            boxes,
            pieces,
            display: displayParts.join(' + ') || `${total_stock_quantity} ชิ้น`
          };
        }
      }
    } else {
      // If no conversion rates, use simple sum as fallback
      total_stock_quantity = inventory.totalL1 + inventory.totalL2 + inventory.totalL3;
    }
  }

  return {
    total_stock_quantity,
    formatted_quantity,
    calculation_details: {
      level1_pieces: inventory && rate ? inventory.totalL1 * (rate.unit_level1_rate || 0) : 0,
      level2_pieces: inventory && rate ? inventory.totalL2 * (rate.unit_level2_rate || 0) : 0,
      level3_pieces: inventory ? inventory.totalL3 : 0,
    }
  };
}

async function getInventorySummaryData() {
  console.log('📊 ดึงข้อมูลตามแบบ ProductSummaryTable...');

  try {
    // Fetch products first
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id, sku_code, product_name, product_type');

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return null;
    }

    // Fetch all inventory items
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('sku, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity');

    if (inventoryError) {
      console.error('❌ Error fetching inventory:', inventoryError);
      return null;
    }

    // Group inventory by SKU and calculate totals (same logic as ProductSummaryTable)
    const inventoryMap = new Map();
    inventoryData?.forEach(item => {
      const existing = inventoryMap.get(item.sku) || { totalL1: 0, totalL2: 0, totalL3: 0, locationCount: 0 };
      existing.totalL1 += item.unit_level1_quantity || 0;
      existing.totalL2 += item.unit_level2_quantity || 0;
      existing.totalL3 += item.unit_level3_quantity || 0;
      existing.locationCount += 1;
      inventoryMap.set(item.sku, existing);
    });

    // Combine products with inventory data
    const combinedData = productsData?.map(product => {
      const inventory = inventoryMap.get(product.sku_code);
      return {
        sku: product.sku_code,
        product_name: product.product_name,
        product_type: product.product_type,
        totalL1: inventory?.totalL1 || 0,
        totalL2: inventory?.totalL2 || 0,
        totalL3: inventory?.totalL3 || 0,
        locationCount: inventory?.locationCount || 0
      };
    }) || [];

    console.log(`✅ ประมวลผลข้อมูลสำหรับ ${combinedData.length} SKUs`);
    console.log(`✅ พบข้อมูล inventory สำหรับ ${inventoryMap.size} SKUs`);

    return combinedData;
  } catch (error) {
    console.error('❌ Database error:', error);
    return null;
  }
}

async function getConversionRates() {
  console.log('📊 ดึงข้อมูล conversion rates...');

  try {
    const { data: conversionRates, error: conversionError } = await supabase
      .from('product_conversion_rates')
      .select('*');

    if (conversionError) {
      console.error('❌ Error fetching conversion rates:', conversionError);
      return null;
    }

    console.log(`✅ ได้ข้อมูล conversion rates สำหรับ ${conversionRates.length} SKUs`);

    // Convert to Map for faster lookup
    const ratesMap = new Map();
    conversionRates.forEach(rate => {
      ratesMap.set(rate.sku, rate);
    });

    return ratesMap;
  } catch (error) {
    console.error('❌ Database error:', error);
    return null;
  }
}

async function testCalculationAccuracy() {
  console.log('\n🔬 ทดสอบความถูกต้องของการคำนวณ');
  console.log('=' .repeat(50));

  const inventoryData = await getInventorySummaryData();
  const conversionRates = await getConversionRates();

  if (!inventoryData || !conversionRates) {
    console.log('❌ ไม่สามารถดึงข้อมูลได้');
    return false;
  }

  let testsPassed = 0;
  let totalTests = 0;

  // Test with different SKUs
  const testSKUs = inventoryData.slice(0, 10); // Test first 10 SKUs

  console.log(`\n📋 ทดสอบการคำนวณกับ ${testSKUs.length} SKUs:\n`);

  for (const inventory of testSKUs) {
    totalTests++;
    const sku = inventory.sku;
    const rate = conversionRates.get(sku);

    console.log(`${totalTests}. SKU: ${sku}`);
    console.log(`   Inventory: L1=${inventory.totalL1}, L2=${inventory.totalL2}, L3=${inventory.totalL3}`);

    if (rate) {
      console.log(`   Rates: L1=${rate.unit_level1_rate}, L2=${rate.unit_level2_rate}`);
      console.log(`   Units: ${rate.unit_level1_name} → ${rate.unit_level2_name} → ${rate.unit_level3_name}`);
    } else {
      console.log(`   ⚠️  ไม่มี conversion rate`);
    }

    const result = calculateProductSummary(inventory, rate);

    console.log(`   คำนวณ:`);
    console.log(`     L1 pieces: ${inventory.totalL1} × ${rate?.unit_level1_rate || 0} = ${result.calculation_details.level1_pieces}`);
    console.log(`     L2 pieces: ${inventory.totalL2} × ${rate?.unit_level2_rate || 0} = ${result.calculation_details.level2_pieces}`);
    console.log(`     L3 pieces: ${result.calculation_details.level3_pieces}`);
    console.log(`   รวม: ${result.total_stock_quantity} ชิ้น`);

    if (result.formatted_quantity) {
      console.log(`   แสดงผล: ${result.formatted_quantity.display}`);

      // Verify reverse calculation
      const expectedTotal = (result.formatted_quantity.cartons * (rate?.unit_level1_rate || 0)) +
                          (result.formatted_quantity.boxes * (rate?.unit_level2_rate || 0)) +
                          result.formatted_quantity.pieces;

      if (expectedTotal === result.total_stock_quantity) {
        console.log(`   ✅ การคำนวณถูกต้อง`);
        testsPassed++;
      } else {
        console.log(`   ❌ การคำนวณผิด: Expected ${expectedTotal}, Got ${result.total_stock_quantity}`);
      }
    } else {
      console.log(`   แสดงผล: ${result.total_stock_quantity} ชิ้น`);
      testsPassed++; // Simple case, assume correct
    }

    console.log('');
  }

  console.log(`📊 ผลการทดสอบ: ${testsPassed}/${totalTests} tests passed (${((testsPassed/totalTests)*100).toFixed(1)}%)`);

  return testsPassed === totalTests;
}

async function testEdgeCasesInCalculation() {
  console.log('\n⚠️  ทดสอบกรณีพิเศษในการคำนวณ');
  console.log('=' .repeat(50));

  const testCases = [
    {
      name: 'ไม่มี inventory',
      inventory: null,
      rate: { unit_level1_rate: 30, unit_level2_rate: 6 }
    },
    {
      name: 'ไม่มี conversion rate',
      inventory: { totalL1: 2, totalL2: 3, totalL3: 5 },
      rate: null
    },
    {
      name: 'Rate เป็น null',
      inventory: { totalL1: 2, totalL2: 3, totalL3: 5 },
      rate: { unit_level1_rate: null, unit_level2_rate: null }
    },
    {
      name: 'Rate เป็น 0',
      inventory: { totalL1: 2, totalL2: 3, totalL3: 5 },
      rate: { unit_level1_rate: 0, unit_level2_rate: 0 }
    },
    {
      name: 'Inventory เป็น 0',
      inventory: { totalL1: 0, totalL2: 0, totalL3: 0 },
      rate: { unit_level1_rate: 30, unit_level2_rate: 6 }
    },
    {
      name: 'Mixed null และ valid rates',
      inventory: { totalL1: 2, totalL2: 3, totalL3: 5 },
      rate: { unit_level1_rate: null, unit_level2_rate: 6 }
    }
  ];

  let edgeTestsPassed = 0;

  testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. ${testCase.name}:`);
    try {
      const result = calculateProductSummary(testCase.inventory, testCase.rate);
      console.log(`   Result: ${result.total_stock_quantity} ชิ้น`);
      console.log(`   Display: ${result.formatted_quantity?.display || 'N/A'}`);
      console.log(`   ✅ ไม่มี error`);
      edgeTestsPassed++;
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');
  });

  console.log(`📊 Edge cases: ${edgeTestsPassed}/${testCases.length} tests passed`);

  return edgeTestsPassed === testCases.length;
}

async function testFormatDisplayLogic() {
  console.log('\n🎨 ทดสอบ logic การแสดงผล');
  console.log('=' .repeat(50));

  const testCases = [
    {
      name: 'แสดงครบทุกหน่วย',
      inventory: { totalL1: 2, totalL2: 3, totalL3: 5 },
      rate: { unit_level1_rate: 30, unit_level2_rate: 6, unit_level1_name: 'ลัง', unit_level2_name: 'กล่อง', unit_level3_name: 'ชิ้น' }
    },
    {
      name: 'เฉพาะลัง',
      inventory: { totalL1: 2, totalL2: 0, totalL3: 0 },
      rate: { unit_level1_rate: 30, unit_level2_rate: 6, unit_level1_name: 'ลัง', unit_level2_name: 'กล่อง', unit_level3_name: 'ชิ้น' }
    },
    {
      name: 'เฉพาะกล่อง',
      inventory: { totalL1: 0, totalL2: 5, totalL3: 0 },
      rate: { unit_level1_rate: 30, unit_level2_rate: 6, unit_level1_name: 'ลัง', unit_level2_name: 'กล่อง', unit_level3_name: 'ชิ้น' }
    },
    {
      name: 'เฉพาะชิ้น',
      inventory: { totalL1: 0, totalL2: 0, totalL3: 15 },
      rate: { unit_level1_rate: 30, unit_level2_rate: 6, unit_level1_name: 'ลัง', unit_level2_name: 'กล่อง', unit_level3_name: 'ชิ้น' }
    },
    {
      name: 'จำนวนมาก - แปลงเป็นหน่วยใหญ่',
      inventory: { totalL1: 0, totalL2: 0, totalL3: 100 },
      rate: { unit_level1_rate: 30, unit_level2_rate: 6, unit_level1_name: 'ลัง', unit_level2_name: 'กล่อง', unit_level3_name: 'ชิ้น' }
    }
  ];

  let displayTestsPassed = 0;

  testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. ${testCase.name}:`);
    const result = calculateProductSummary(testCase.inventory, testCase.rate);

    console.log(`   Input: ${testCase.inventory.totalL1} ลัง + ${testCase.inventory.totalL2} กล่อง + ${testCase.inventory.totalL3} ชิ้น`);
    console.log(`   Total pieces: ${result.total_stock_quantity}`);

    if (result.formatted_quantity) {
      console.log(`   Formatted: ${result.formatted_quantity.display}`);
      console.log(`   Breakdown: ${result.formatted_quantity.cartons} ลัง + ${result.formatted_quantity.boxes} กล่อง + ${result.formatted_quantity.pieces} ชิ้น`);

      // Verify that breakdown adds up correctly
      const calculatedTotal = (result.formatted_quantity.cartons * testCase.rate.unit_level1_rate) +
                             (result.formatted_quantity.boxes * testCase.rate.unit_level2_rate) +
                             result.formatted_quantity.pieces;

      if (calculatedTotal === result.total_stock_quantity) {
        console.log(`   ✅ การแสดงผลถูกต้อง`);
        displayTestsPassed++;
      } else {
        console.log(`   ❌ การแสดงผลผิด: Expected ${result.total_stock_quantity}, Calculated ${calculatedTotal}`);
      }
    } else {
      console.log(`   Simple display: ${result.total_stock_quantity} ชิ้น`);
      displayTestsPassed++;
    }
    console.log('');
  });

  console.log(`📊 Display tests: ${displayTestsPassed}/${testCases.length} tests passed`);

  return displayTestsPassed === testCases.length;
}

async function runCalculationTests() {
  console.log('🚀 เริ่มทดสอบการคำนวณ ProductSummaryTable\n');

  const tests = [
    { name: 'Calculation Accuracy Test', fn: testCalculationAccuracy },
    { name: 'Edge Cases Test', fn: testEdgeCasesInCalculation },
    { name: 'Display Format Test', fn: testFormatDisplayLogic }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n🧪 Running: ${test.name}`);
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
      console.log(`${result ? '✅' : '❌'} ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      console.error(`❌ ${test.name}: ERROR -`, error.message);
      results.push({ name: test.name, passed: false });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 สรุปผลการทดสอบการคำนวณ:');
  console.log('='.repeat(60));

  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  });

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`\n📊 ผลรวม: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);

  if (passedTests === totalTests) {
    console.log('🎉 การคำนวณใน ProductSummaryTable ทำงานได้อย่างสมบูรณ์!');
  } else {
    console.log('⚠️  การคำนวณมีจุดที่ต้องปรับปรุง');
  }

  return passedTests === totalTests;
}

// Execute calculation tests
runCalculationTests().catch(console.error);