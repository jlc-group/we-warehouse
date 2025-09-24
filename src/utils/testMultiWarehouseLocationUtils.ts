/**
 * Test file for multi-warehouse location utilities
 * Run this to verify that all functions work correctly
 */

import {
  parseMultiWarehouseLocation,
  formatMultiWarehouseLocation,
  extractWarehouseCode,
  extractLocationPart,
  convertToMultiWarehouseFormat,
  isValidMultiWarehouseLocation,
  generateWarehouseLocations,
  compareMultiWarehouseLocations
} from './locationUtils';

export function testMultiWarehouseLocationUtils() {
  console.log('🧪 Testing Multi-Warehouse Location Utils...\n');

  // Test 1: Parse multi-warehouse locations
  console.log('📍 Test 1: Parse Locations');
  const testLocations = [
    'A1/1',           // Legacy format
    'WH001-A1/1',     // Multi-warehouse format
    'MAIN-B5/3',      // Default warehouse with prefix
    'FACTORY-Z20/4'   // Max location
  ];

  testLocations.forEach(location => {
    const parsed = parseMultiWarehouseLocation(location);
    console.log(`  ${location} ->`, parsed);
  });

  // Test 2: Format multi-warehouse locations
  console.log('\n🏗️ Test 2: Format Locations');
  const formatTests = [
    { warehouse: 'MAIN', row: 'A', position: 1, level: 1 },
    { warehouse: 'WH001', row: 'B', position: 5, level: 3 },
    { warehouse: 'FACTORY', row: 'Z', position: 20, level: 4 }
  ];

  formatTests.forEach(test => {
    const formatted = formatMultiWarehouseLocation(test.warehouse, test.row, test.position, test.level);
    console.log(`  ${test.warehouse} ${test.row}${test.position}/${test.level} -> ${formatted}`);
  });

  // Test 3: Extract warehouse codes
  console.log('\n🏷️ Test 3: Extract Warehouse Codes');
  testLocations.forEach(location => {
    const warehouseCode = extractWarehouseCode(location);
    console.log(`  ${location} -> warehouse: ${warehouseCode}`);
  });

  // Test 4: Extract location parts
  console.log('\n📍 Test 4: Extract Location Parts');
  testLocations.forEach(location => {
    const locationPart = extractLocationPart(location);
    console.log(`  ${location} -> location: ${locationPart}`);
  });

  // Test 5: Convert to multi-warehouse format
  console.log('\n🔄 Test 5: Convert to Multi-Warehouse Format');
  const legacyLocations = ['A1/1', 'B5/3', 'Z20/4'];
  legacyLocations.forEach(location => {
    const converted = convertToMultiWarehouseFormat(location, 'WH002');
    console.log(`  ${location} + WH002 -> ${converted}`);
  });

  // Test 6: Validation
  console.log('\n✅ Test 6: Validation');
  const validationTests = [
    'A1/1',           // Valid legacy
    'WH001-A1/1',     // Valid multi-warehouse
    'INVALID-X99/9',  // Invalid location
    'A1/5',           // Invalid level
    ''                // Empty
  ];

  validationTests.forEach(location => {
    const isValid = isValidMultiWarehouseLocation(location);
    console.log(`  ${location || '(empty)'} -> ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  });

  // Test 7: Generate warehouse locations
  console.log('\n🏭 Test 7: Generate Warehouse Locations');
  const warehouseLocations = generateWarehouseLocations('WH001', 'A', 'C', 3, 2);
  console.log(`  WH001 (A-C, 1-3, 1-2): ${warehouseLocations.length} locations`);
  console.log(`  Sample: ${warehouseLocations.slice(0, 5).join(', ')}...`);

  // Test 8: Compare locations
  console.log('\n🔍 Test 8: Compare Locations');
  const compareTests = [
    ['A1/1', 'MAIN-A1/1'],      // Should be equal (same warehouse)
    ['WH001-A1/1', 'WH001-A1/1'], // Should be equal (exact match)
    ['WH001-A1/1', 'WH002-A1/1'], // Should be different (different warehouse)
    ['A1/1', 'A1/2']             // Should be different (different level)
  ];

  compareTests.forEach(([loc1, loc2]) => {
    const isEqual = compareMultiWarehouseLocations(loc1, loc2);
    console.log(`  ${loc1} == ${loc2} -> ${isEqual ? '✅ Equal' : '❌ Different'}`);
  });

  console.log('\n🎉 Multi-Warehouse Location Utils Testing Completed!');
}

// Export function for use in other files
export default testMultiWarehouseLocationUtils;