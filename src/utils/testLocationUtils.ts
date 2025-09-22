// Test file for locationUtils
import { normalizeLocation, isValidLocation } from './locationUtils';

console.log('🧪 Testing normalizeLocation function:');

// Test cases
const testCases = [
  'A1/1',      // Target format
  'A/1/1',     // Old database format
  'A11',       // Concatenated format
  'A101',      // Concatenated with leading zero
  'a1/1',      // Lowercase
  'A/1/01',    // Old format with leading zero
  'B15/2',     // Different values
  'Z20/4',     // Max values
];

testCases.forEach(input => {
  const normalized = normalizeLocation(input);
  const isValid = isValidLocation(input);
  console.log(`Input: "${input}" → Normalized: "${normalized}" → Valid: ${isValid}`);
});

console.log('\n🎯 Expected standard format: A1/1 to Z20/4');
console.log('✅ All outputs should match: ^[A-Z]([1-9]|1[0-9]|20)/[1-4]$');
