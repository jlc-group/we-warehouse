// Test file for locationUtils
import { normalizeLocation, isValidLocation } from './locationUtils';

console.log('🧪 Testing normalizeLocation function:');

// Test cases
const testCases = [
  'A/1/1',     // Already correct format
  'A1/1',      // Compact format
  'A11',       // Concatenated format
  'A101',      // Concatenated with leading zero
  'a/1/1',     // Lowercase
  'A/1/01',    // With leading zero
  'B/2/15',    // Different values
  'N/4/20',    // Max values
];

testCases.forEach(input => {
  const normalized = normalizeLocation(input);
  const isValid = isValidLocation(input);
  console.log(`Input: "${input}" → Normalized: "${normalized}" → Valid: ${isValid}`);
});

console.log('\n🎯 Expected database format: A/1/1 to N/4/20');
console.log('✅ All outputs should match: ^[A-N]/[1-4]/([1-9]|1[0-9]|20)$');
