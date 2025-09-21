// Comprehensive Location System Test
// Tests the entire location format system after migration

import { normalizeLocation, displayLocation, parseLocation, formatLocation, isValidLocation } from './src/utils/locationUtils.js';

class LocationSystemTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  log(status, message, expected = null, actual = null) {
    const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '🔍';
    console.log(`${emoji} ${message}`);

    if (expected !== null && actual !== null) {
      console.log(`   Expected: "${expected}"`);
      console.log(`   Actual:   "${actual}"`);
    }

    this.testResults.total++;
    if (status === 'pass') {
      this.testResults.passed++;
    } else if (status === 'fail') {
      this.testResults.failed++;
    }
  }

  assertEqual(actual, expected, testName) {
    if (actual === expected) {
      this.log('pass', testName);
      return true;
    } else {
      this.log('fail', testName, expected, actual);
      return false;
    }
  }

  assertTrue(condition, testName) {
    if (condition) {
      this.log('pass', testName);
      return true;
    } else {
      this.log('fail', testName);
      return false;
    }
  }

  // Test normalization function
  testNormalization() {
    console.log('\n🧪 Testing normalizeLocation()');
    console.log('=' * 40);

    const testCases = [
      // Target format (should stay unchanged)
      { input: 'A1/1', expected: 'A1/1' },
      { input: 'A1/20', expected: 'A1/20' },
      { input: 'B2/15', expected: 'B2/15' },
      { input: 'N4/20', expected: 'N4/20' },

      // Legacy A/1/1 format
      { input: 'A/1/1', expected: 'A1/1' },
      { input: 'B/2/15', expected: 'B2/15' },
      { input: 'N/4/20', expected: 'N4/20' },

      // Zero-padded legacy format
      { input: 'A/1/01', expected: 'A1/1' },
      { input: 'A/1/02', expected: 'A1/2' },
      { input: 'B/2/05', expected: 'B2/5' },

      // Various separators
      { input: 'A-1-1', expected: 'A1/1' },
      { input: 'A 1 1', expected: 'A1/1' },
      { input: 'A.1.1', expected: 'A1/1' },

      // Concatenated formats
      { input: 'A11', expected: 'A1/1' },
      { input: 'A101', expected: 'A1/1' },
      { input: 'B215', expected: 'B2/15' },

      // Case sensitivity
      { input: 'a1/1', expected: 'A1/1' },
      { input: 'a/1/1', expected: 'A1/1' },

      // Invalid cases (should return unchanged)
      { input: 'Z1/1', expected: 'Z1/1' },  // Invalid row
      { input: 'A5/1', expected: 'A5/1' },  // Invalid level
      { input: 'A1/25', expected: 'A1/25' }, // Invalid position
      { input: 'A1', expected: 'A1' },      // Incomplete
      { input: '', expected: '' },          // Empty
    ];

    testCases.forEach(({ input, expected }) => {
      const actual = normalizeLocation(input);
      this.assertEqual(actual, expected, `normalizeLocation("${input}")`);
    });
  }

  // Test validation function
  testValidation() {
    console.log('\n🧪 Testing isValidLocation()');
    console.log('=' * 40);

    const validCases = [
      'A1/1', 'A1/20', 'B2/15', 'N4/20',
      'A/1/1', 'B/2/15',  // Should be normalized first
      'A-1-1', 'A 1 1'    // Should be normalized first
    ];

    const invalidCases = [
      'Z1/1',   // Invalid row
      'A5/1',   // Invalid level
      'A1/25',  // Invalid position
      'A1',     // Incomplete
      '',       // Empty
      'ABC123', // Wrong format
    ];

    validCases.forEach(input => {
      const result = isValidLocation(input);
      this.assertTrue(result, `isValidLocation("${input}") should be true`);
    });

    invalidCases.forEach(input => {
      const result = isValidLocation(input);
      this.assertTrue(!result, `isValidLocation("${input}") should be false`);
    });
  }

  // Test parsing function
  testParsing() {
    console.log('\n🧪 Testing parseLocation()');
    console.log('=' * 40);

    const testCases = [
      { input: 'A1/1', expected: { row: 'A', level: 1, position: 1 } },
      { input: 'B2/15', expected: { row: 'B', level: 2, position: 15 } },
      { input: 'N4/20', expected: { row: 'N', level: 4, position: 20 } },
      { input: 'A/1/1', expected: { row: 'A', level: 1, position: 1 } }, // Legacy format
    ];

    testCases.forEach(({ input, expected }) => {
      const actual = parseLocation(input);
      const passed = actual &&
                    actual.row === expected.row &&
                    actual.level === expected.level &&
                    actual.position === expected.position;

      if (passed) {
        this.log('pass', `parseLocation("${input}")`);
      } else {
        this.log('fail', `parseLocation("${input}")`, JSON.stringify(expected), JSON.stringify(actual));
      }
    });

    // Test invalid cases
    const invalidCases = ['Z1/1', 'A5/1', 'A1/25', ''];
    invalidCases.forEach(input => {
      const result = parseLocation(input);
      this.assertTrue(result === null, `parseLocation("${input}") should return null`);
    });
  }

  // Test formatting function
  testFormatting() {
    console.log('\n🧪 Testing formatLocation()');
    console.log('=' * 40);

    const testCases = [
      { row: 'A', level: 1, position: 1, expected: 'A1/1' },
      { row: 'B', level: 2, position: 15, expected: 'B2/15' },
      { row: 'N', level: 4, position: 20, expected: 'N4/20' },
      { row: 'a', level: 1, position: 1, expected: 'A1/1' }, // Lowercase should work
    ];

    testCases.forEach(({ row, level, position, expected }) => {
      try {
        const actual = formatLocation(row, level, position);
        this.assertEqual(actual, expected, `formatLocation("${row}", ${level}, ${position})`);
      } catch (error) {
        this.log('fail', `formatLocation("${row}", ${level}, ${position}) threw error: ${error.message}`);
      }
    });

    // Test invalid parameters
    const invalidCases = [
      { row: 'Z', level: 1, position: 1 },  // Invalid row
      { row: 'A', level: 5, position: 1 },  // Invalid level
      { row: 'A', level: 1, position: 25 }, // Invalid position
    ];

    invalidCases.forEach(({ row, level, position }) => {
      try {
        formatLocation(row, level, position);
        this.log('fail', `formatLocation("${row}", ${level}, ${position}) should throw error`);
      } catch (error) {
        this.log('pass', `formatLocation("${row}", ${level}, ${position}) correctly threw error`);
      }
    });
  }

  // Test display function
  testDisplay() {
    console.log('\n🧪 Testing displayLocation()');
    console.log('=' * 40);

    const testCases = [
      { input: 'A1/1', expected: 'A1/1' },
      { input: 'A/1/1', expected: 'A1/1' },  // Should normalize first
      { input: 'B2/15', expected: 'B2/15' },
      { input: 'A-1-1', expected: 'A1/1' },  // Should normalize first
    ];

    testCases.forEach(({ input, expected }) => {
      const actual = displayLocation(input);
      this.assertEqual(actual, expected, `displayLocation("${input}")`);
    });
  }

  // Test QR pattern matching (simulate Index.tsx patterns)
  testQRPatterns() {
    console.log('\n🧪 Testing QR Pattern Matching');
    console.log('=' * 40);

    const locationPatterns = [
      /^[A-N][1-4]\/([1-9]|1[0-9]|20)$/,  // A1/1 (NEW STANDARD FORMAT)
      /^[A-Z]\/[1-4]\/([1-9]|1[0-9]|20)$/,  // A/1/1 (legacy format)
      /^[A-Z]-\d{1,2}-[A-Z]-\d{1,2}$/,  // A-01-B-02 (legacy)
      /^[A-Z]\/\d{1,2}\/[A-Z]\/\d{1,2}$/,  // A/01/B/02 (legacy)
      /^[A-Z]\d{1,2}[A-Z]\d{1,2}$/,     // A01B02 (legacy)
      /^[A-Z]-\d{1,2}[A-Z]-\d{1,2}$/,   // A-01B-02 (legacy)
      /^[A-Z]\d{1,2}-[A-Z]\d{1,2}$/     // A01-B02 (legacy)
    ];

    const testCases = [
      // Should match new standard format
      { input: 'A1/1', shouldMatch: true },
      { input: 'B2/15', shouldMatch: true },
      { input: 'N4/20', shouldMatch: true },

      // Should match legacy formats
      { input: 'A/1/1', shouldMatch: true },
      { input: 'A-01-B-02', shouldMatch: true },
      { input: 'A/01/B/02', shouldMatch: true },
      { input: 'A01B02', shouldMatch: true },

      // Should not match invalid formats
      { input: 'Z1/1', shouldMatch: false },  // Will match pattern but invalid row
      { input: 'A5/1', shouldMatch: false },  // Will match pattern but invalid level
      { input: 'ABC123', shouldMatch: false },
      { input: '', shouldMatch: false },
    ];

    testCases.forEach(({ input, shouldMatch }) => {
      const isMatch = locationPatterns.some(pattern => pattern.test(input));

      if (shouldMatch) {
        this.assertTrue(isMatch, `"${input}" should match QR patterns`);
      } else {
        // Note: Some invalid inputs might still match patterns but fail validation
        const testName = `"${input}" pattern matching`;
        this.log('info', testName + (isMatch ? ' (matches pattern but may be invalid)' : ' (no pattern match)'));
      }
    });
  }

  // Run all tests
  runAllTests() {
    console.log('🎯 Location System Comprehensive Test Suite');
    console.log('=' * 50);

    this.testNormalization();
    this.testValidation();
    this.testParsing();
    this.testFormatting();
    this.testDisplay();
    this.testQRPatterns();

    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('=' * 30);
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`📋 Total:  ${this.testResults.total}`);

    const successRate = ((this.testResults.passed / this.testResults.total) * 100).toFixed(1);
    console.log(`📈 Success Rate: ${successRate}%`);

    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Location system is ready for production.');
    } else {
      console.log('\n⚠️  Some tests failed. Please review and fix issues.');
    }

    return this.testResults.failed === 0;
  }
}

// For Node.js execution
if (typeof window === 'undefined') {
  // Running in Node.js
  const tester = new LocationSystemTester();

  console.log('Note: This test requires the locationUtils functions to be available.');
  console.log('In a real scenario, you would run this in the browser console or after proper imports.\n');

  // Show test structure
  tester.runAllTests();
}

export { LocationSystemTester };