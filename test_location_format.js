// Test script to verify location format normalization
// Run with: node test_location_format.js

// Simulate the normalizeLocation function
function normalizeLocation(location) {
  if (!location) return '';

  // Remove extra whitespace and convert to uppercase
  const cleaned = location.trim().toUpperCase();

  // If already in correct target format A1/1, return as-is
  if (/^[A-N][1-4]\/([1-9]|1[0-9]|20)$/.test(cleaned)) {
    return cleaned;
  }

  // Handle legacy A/1/1 format - convert to A1/1
  if (/^[A-N]\/[1-4]\/([1-9]|1[0-9]|20)$/.test(cleaned)) {
    const [row, level, position] = cleaned.split('/');
    return `${row}${level}/${position}`;
  }

  // Try to parse different formats
  const parts = cleaned.split(/[/\-\s.]+/);

  if (parts.length >= 3) {
    const [row, level, position] = parts;

    // Validate row (should be A-N only)
    if (!/^[A-N]$/.test(row)) {
      return location; // Return original if can't normalize
    }

    // Validate level (should be 1-4)
    if (!/^[1-4]$/.test(level)) {
      return location;
    }

    // Validate position (should be 1-20)
    const positionNum = parseInt(position);
    if (isNaN(positionNum) || positionNum < 1 || positionNum > 20) {
      return location;
    }

    // Format in new target format: A1/1
    const normalized = `${row}${level}/${positionNum}`;
    return normalized;
  }

  // Try to parse concatenated formats like A101, A11
  if (/^[A-N]\d{2,3}$/.test(cleaned)) {
    const row = cleaned[0];
    const numbers = cleaned.slice(1);

    if (numbers.length === 2) {
      // A11 -> A1/1
      const level = parseInt(numbers[0]);
      const position = parseInt(numbers[1]);
      if (level >= 1 && level <= 4 && position >= 1 && position <= 20) {
        return `${row}${level}/${position}`;
      }
    } else if (numbers.length === 3) {
      // A101 -> A1/01 -> A1/1
      const level = parseInt(numbers[0]);
      const position = parseInt(numbers.slice(1));
      if (level >= 1 && level <= 4 && position >= 1 && position <= 20) {
        return `${row}${level}/${position}`;
      }
    }
  }

  return location;
}

// Test cases
const testCases = [
  // Target format (should return as-is)
  'A1/1',
  'A1/20',
  'B2/15',
  'N4/20',

  // Legacy A/1/1 format
  'A/1/1',
  'A/1/20',
  'B/2/15',
  'N/4/20',

  // Zero-padded legacy format
  'A/1/01',
  'A/1/02',
  'B/2/05',

  // Other legacy formats
  'A-1-1',
  'A 1 1',
  'A.1.1',

  // Concatenated formats
  'A11',
  'A101',
  'B215',

  // Invalid cases
  'Z1/1',    // Invalid row
  'A5/1',    // Invalid level
  'A1/25',   // Invalid position
  'A1',      // Incomplete
];

console.log('🧪 Testing Location Format Normalization');
console.log('=' * 50);

testCases.forEach(testCase => {
  const result = normalizeLocation(testCase);
  const status = /^[A-N][1-4]\/([1-9]|1[0-9]|20)$/.test(result) ? '✅' :
                 result === testCase ? '⚠️ ' : '❌';

  console.log(`${status} "${testCase}" → "${result}"`);
});

console.log('\n📊 Summary:');
console.log('✅ = Successfully normalized to target format');
console.log('⚠️  = Returned unchanged (expected for invalid inputs)');
console.log('❌ = Failed to normalize correctly');

// Test the specific user case
console.log('\n🎯 User Requirement Test:');
const userFormats = ['A1/1', 'A1/2', 'A1/3', 'A20/4'];
userFormats.forEach(format => {
  const result = normalizeLocation(format);
  const isValid = result === format;
  console.log(`${isValid ? '✅' : '❌'} "${format}" should stay as "${format}" → Got: "${result}"`);
});