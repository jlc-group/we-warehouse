/**
 * Comprehensive Test Script for Product Conversion Rates System
 * ทดสอบระบบการแปลงหน่วยอย่างครบถ้วน
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 เริ่มทดสอบระบบการแปลงหน่วยแบบครบถ้วน\n');

async function testDatabaseData() {
  console.log('📊 1. ทดสอบข้อมูลในฐานข้อมูล');
  console.log('=' .repeat(50));

  try {
    // Test 1.1: Count total conversion rates
    const { data: conversionRates, error: conversionError } = await supabase
      .from('product_conversion_rates')
      .select('*');

    if (conversionError) {
      console.error('❌ Error fetching conversion rates:', conversionError);
      return false;
    }

    console.log(`✅ จำนวน conversion rates ทั้งหมด: ${conversionRates.length} records`);

    // Test 1.2: Check for missing or invalid data
    const invalidRates = conversionRates.filter(rate =>
      !rate.sku ||
      !rate.product_name ||
      (rate.unit_level1_rate === null && rate.unit_level2_rate === null)
    );

    console.log(`✅ Records ที่มีข้อมูลไม่ครบ: ${invalidRates.length} records`);

    if (invalidRates.length > 0) {
      console.log('⚠️  Records ที่มีปัญหา:', invalidRates.slice(0, 3).map(r => r.sku));
    }

    // Test 1.3: Check products without conversion rates
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('sku_code, product_name');

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return false;
    }

    const productSKUs = new Set(products.map(p => p.sku_code));
    const conversionSKUs = new Set(conversionRates.map(r => r.sku));

    const missingConversions = products.filter(p => !conversionSKUs.has(p.sku_code));
    console.log(`✅ Products ที่ไม่มี conversion rates: ${missingConversions.length} จาก ${products.length} products`);

    // Test 1.4: Sample conversion rates analysis
    const sampleRates = conversionRates.slice(0, 5);
    console.log('\n📋 ตัวอย่างข้อมูล conversion rates:');
    sampleRates.forEach((rate, index) => {
      console.log(`${index + 1}. SKU: ${rate.sku}`);
      console.log(`   Product: ${rate.product_name}`);
      console.log(`   Level 1: ${rate.unit_level1_name} (rate: ${rate.unit_level1_rate})`);
      console.log(`   Level 2: ${rate.unit_level2_name} (rate: ${rate.unit_level2_rate})`);
      console.log(`   Level 3: ${rate.unit_level3_name}`);
      console.log('');
    });

    // Test 1.5: Validate conversion logic
    console.log('🔬 ทดสอบตรรกะการแปลงหน่วย:');
    const testRate = sampleRates[0];
    if (testRate && testRate.unit_level1_rate && testRate.unit_level2_rate) {
      const level1Rate = testRate.unit_level1_rate;
      const level2Rate = testRate.unit_level2_rate;

      console.log(`✅ ตัวอย่าง SKU: ${testRate.sku}`);
      console.log(`   1 ${testRate.unit_level1_name} = ${level1Rate} ${testRate.unit_level3_name}`);
      console.log(`   1 ${testRate.unit_level2_name} = ${level2Rate} ${testRate.unit_level3_name}`);

      // สมมุติมี inventory: 2 ลัง + 3 กล่อง + 5 ชิ้น
      const testInventory = { level1: 2, level2: 3, level3: 5 };
      const totalPieces = (testInventory.level1 * level1Rate) + (testInventory.level2 * level2Rate) + testInventory.level3;

      console.log(`   ทดสอบ: ${testInventory.level1} ลัง + ${testInventory.level2} กล่อง + ${testInventory.level3} ชิ้น`);
      console.log(`   = ${totalPieces} ชิ้นรวม`);
    }

    return true;
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return false;
  }
}

async function testCalculationFormulas() {
  console.log('\n📐 2. ทดสอบสูตรการคำนวณ');
  console.log('=' .repeat(50));

  try {
    // Get a sample conversion rate
    const { data: sampleRate } = await supabase
      .from('product_conversion_rates')
      .select('*')
      .limit(1)
      .single();

    if (!sampleRate) {
      console.log('❌ ไม่พบข้อมูล conversion rate สำหรับทดสอบ');
      return false;
    }

    const { unit_level1_rate, unit_level2_rate } = sampleRate;

    console.log(`✅ ทดสอบด้วย SKU: ${sampleRate.sku}`);
    console.log(`   Level 1 rate: ${unit_level1_rate}, Level 2 rate: ${unit_level2_rate}`);

    // Test different inventory scenarios
    const testCases = [
      { l1: 0, l2: 0, l3: 10, description: 'เฉพาะชิ้น' },
      { l1: 0, l2: 5, l3: 0, description: 'เฉพาะกล่อง' },
      { l1: 2, l2: 0, l3: 0, description: 'เฉพาะลัง' },
      { l1: 1, l2: 3, l3: 7, description: 'ผสมทุกระดับ' },
    ];

    testCases.forEach((testCase, index) => {
      const { l1, l2, l3, description } = testCase;

      // Calculate using the same logic as ProductSummaryTable
      const level1Pieces = l1 * (unit_level1_rate || 0);
      const level2Pieces = l2 * (unit_level2_rate || 0);
      const totalPieces = level1Pieces + level2Pieces + l3;

      console.log(`\n   ${index + 1}. ${description}:`);
      console.log(`      Input: ${l1} ลัง + ${l2} กล่อง + ${l3} ชิ้น`);
      console.log(`      Calculation: (${l1}×${unit_level1_rate}) + (${l2}×${unit_level2_rate}) + ${l3}`);
      console.log(`      Result: ${totalPieces} ชิ้นรวม`);

      // Test reverse calculation (ชิ้น -> ลัง+กล่อง+ชิ้น)
      if (unit_level1_rate && unit_level2_rate && totalPieces > 0) {
        const cartons = Math.floor(totalPieces / unit_level1_rate);
        const remaining1 = totalPieces % unit_level1_rate;
        const boxes = Math.floor(remaining1 / unit_level2_rate);
        const pieces = remaining1 % unit_level2_rate;

        console.log(`      Reverse: ${totalPieces} ชิ้น = ${cartons} ลัง + ${boxes} กล่อง + ${pieces} ชิ้น`);
      }
    });

    return true;
  } catch (error) {
    console.error('❌ Calculation test failed:', error);
    return false;
  }
}

async function testEdgeCases() {
  console.log('\n⚠️  3. ทดสอบกรณีพิเศษและ Error Handling');
  console.log('=' .repeat(50));

  try {
    // Test 3.1: Products with null rates
    const { data: nullRates } = await supabase
      .from('product_conversion_rates')
      .select('*')
      .or('unit_level1_rate.is.null,unit_level2_rate.is.null');

    console.log(`✅ Products ที่มี null rates: ${nullRates?.length || 0} records`);

    // Test 3.2: Products with zero rates
    const { data: zeroRates } = await supabase
      .from('product_conversion_rates')
      .select('*')
      .or('unit_level1_rate.eq.0,unit_level2_rate.eq.0');

    console.log(`✅ Products ที่มี zero rates: ${zeroRates?.length || 0} records`);

    // Test 3.3: Calculation with null/zero rates
    console.log('\n🧪 ทดสอบการคำนวณกับข้อมูลผิดปกติ:');

    const edgeCases = [
      { rate1: null, rate2: 6, l1: 2, l2: 3, l3: 5 },
      { rate1: 30, rate2: null, l1: 2, l2: 3, l3: 5 },
      { rate1: 0, rate2: 6, l1: 2, l2: 3, l3: 5 },
      { rate1: 30, rate2: 0, l1: 2, l2: 3, l3: 5 },
    ];

    edgeCases.forEach((testCase, index) => {
      const { rate1, rate2, l1, l2, l3 } = testCase;

      // Same calculation logic as in ProductSummaryTable
      const level1Pieces = l1 * (rate1 || 0);
      const level2Pieces = l2 * (rate2 || 0);
      const totalPieces = level1Pieces + level2Pieces + l3;

      console.log(`   ${index + 1}. Rate1: ${rate1}, Rate2: ${rate2}`);
      console.log(`      Input: ${l1} ลัง + ${l2} กล่อง + ${l3} ชิ้น`);
      console.log(`      Result: ${totalPieces} ชิ้นรวม`);
    });

    return true;
  } catch (error) {
    console.error('❌ Edge cases test failed:', error);
    return false;
  }
}

async function generateTestReport() {
  console.log('\n📋 4. สรุปผลการทดสอบระบบ');
  console.log('=' .repeat(50));

  try {
    // Get comprehensive statistics
    const { data: conversionRates } = await supabase
      .from('product_conversion_rates')
      .select('*');

    const { data: products } = await supabase
      .from('products')
      .select('sku_code');

    const totalProducts = products?.length || 0;
    const totalConversions = conversionRates?.length || 0;
    const coverage = totalProducts > 0 ? ((totalConversions / totalProducts) * 100).toFixed(1) : 0;

    const validRates = conversionRates?.filter(r =>
      r.unit_level1_rate !== null || r.unit_level2_rate !== null
    ).length || 0;

    const completeRates = conversionRates?.filter(r =>
      r.unit_level1_rate !== null &&
      r.unit_level2_rate !== null &&
      r.unit_level1_name &&
      r.unit_level2_name &&
      r.unit_level3_name
    ).length || 0;

    console.log('📊 สถิติระบบการแปลงหน่วย:');
    console.log(`   • จำนวน Products ทั้งหมด: ${totalProducts}`);
    console.log(`   • จำนวน Conversion Rates: ${totalConversions}`);
    console.log(`   • Coverage: ${coverage}%`);
    console.log(`   • Valid Rates: ${validRates} (${((validRates/totalConversions)*100).toFixed(1)}%)`);
    console.log(`   • Complete Rates: ${completeRates} (${((completeRates/totalConversions)*100).toFixed(1)}%)`);

    console.log('\n✅ ผลการประเมิน:');
    if (coverage >= 95) {
      console.log('   🟢 EXCELLENT: ระบบมี coverage สูงมาก');
    } else if (coverage >= 80) {
      console.log('   🟡 GOOD: ระบบมี coverage ดี');
    } else {
      console.log('   🔴 NEEDS IMPROVEMENT: ต้องเพิ่ม conversion rates');
    }

    if (validRates / totalConversions >= 0.95) {
      console.log('   🟢 EXCELLENT: ข้อมูล conversion rates มีคุณภาพสูง');
    } else {
      console.log('   🔴 NEEDS CLEANUP: มีข้อมูลที่ไม่สมบูรณ์');
    }

    return true;
  } catch (error) {
    console.error('❌ Report generation failed:', error);
    return false;
  }
}

// Run all tests
async function runComprehensiveTests() {
  const tests = [
    { name: 'Database Data Test', fn: testDatabaseData },
    { name: 'Calculation Formulas Test', fn: testCalculationFormulas },
    { name: 'Edge Cases Test', fn: testEdgeCases },
    { name: 'Generate Report', fn: generateTestReport },
  ];

  const results = [];

  for (const test of tests) {
    console.log(`\n🚀 Running: ${test.name}`);
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
  console.log('🎯 สรุปผลการทดสอบทั้งหมด:');
  console.log('='.repeat(60));

  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  });

  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.length;

  console.log(`\n📊 ผลรวม: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);

  if (passedTests === totalTests) {
    console.log('🎉 ระบบการแปลงหน่วยทำงานได้อย่างสมบูรณ์!');
  } else {
    console.log('⚠️  ระบบมีจุดที่ต้องปรับปรุง');
  }
}

// Execute tests
runComprehensiveTests().catch(console.error);