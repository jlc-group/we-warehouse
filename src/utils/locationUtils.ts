/**
 * Utility functions for location standardization and validation
 */

/**
 * Normalize location string to standard format
 * Ensures consistent format: "A1/1" (New standardized format)
 * STANDARD FORMAT: A1/1 to Z20/4 (RowPosition/Level)
 */
export function normalizeLocation(location: string): string {
  if (!location) return '';

  // Remove extra whitespace and convert to uppercase
  const cleaned = location.trim().toUpperCase();

  // If already in target format A1/1, return as-is
  if (/^[A-Z]([1-9]|1[0-9]|20)\/[1-4]$/.test(cleaned)) {
    return cleaned;
  }

  // Handle old database format A/1/01 - convert to A1/1 (RowPosition/Level)
  if (/^[A-Z]\/[1-4]\/([0-9]|[01][0-9]|20)$/.test(cleaned)) {
    const [row, level, position] = cleaned.split('/');
    const positionNum = parseInt(position);
    return `${row}${positionNum}/${level}`;
  }

  // Handle compact A01/4 format - convert to A1/1 (target format: RowPosition/Level)
  if (/^[A-Z]([0-9]|[01][0-9]|20)\/[1-4]$/.test(cleaned)) {
    const match = cleaned.match(/^([A-Z])([0-9]|[01][0-9]|20)\/([1-4])$/);
    if (match) {
      const [, row, position, level] = match;
      const positionNum = parseInt(position);
      return `${row}${positionNum}/${level}`;
    }
  }

  // Try to parse different formats
  const parts = cleaned.split(/[/\-\s.]+/);

  if (parts.length >= 3) {
    const [row, level, position] = parts;

    // Validate row (should be A-N only)
    if (!/^[A-Z]$/.test(row)) {
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

    // Format in target format: A1/1 (RowPosition/Level)
    const normalized = `${row}${positionNum}/${level}`;
    return normalized;
  }

  // Try to parse concatenated formats like A101, A11
  if (/^[A-Z]\d{2,3}$/.test(cleaned)) {
    const row = cleaned[0];
    const numbers = cleaned.slice(1);

    if (numbers.length === 2) {
      // A14 -> A1/4 (position 1, level 4)
      const position = parseInt(numbers[0]);
      const level = parseInt(numbers[1]);
      if (position >= 1 && position <= 20 && level >= 1 && level <= 4) {
        return `${row}${position}/${level}`;
      }
    } else if (numbers.length === 3) {
      // A014 -> A14/1 (position 14, level 1)
      const position = parseInt(numbers.slice(0, 2));
      const level = parseInt(numbers[2]);
      if (position >= 1 && position <= 20 && level >= 1 && level <= 4) {
        return `${row}${position}/${level}`;
      }
    }
  }

  return location;
}

/**
 * Validate if location format is correct
 * STANDARD FORMAT: ^[A-Z]([1-9]|1[0-9]|20)/[1-4]$ (A1/1 to Z20/4)
 */
export function isValidLocation(location: string): boolean {
  if (!location) {
    return false;
  }

  const normalized = normalizeLocation(location);
  const isValid = /^[A-Z]([1-9]|1[0-9]|20)\/[1-4]$/.test(normalized);

  return isValid;
}

/**
 * Compare two locations for equality (case-insensitive, format-agnostic)
 */
export function locationsEqual(location1: string, location2: string): boolean {
  if (!location1 || !location2) return false;

  const norm1 = normalizeLocation(location1);
  const norm2 = normalizeLocation(location2);

  return norm1 === norm2;
}

/**
 * Parse location into components
 * STANDARD FORMAT: ^[A-Z]([1-9]|1[0-9]|20)/[1-4]$ (A1/1 to Z20/4)
 */
export function parseLocation(location: string): { row: string; level: number; position: number } | null {
  const normalized = normalizeLocation(location);
  const match = normalized.match(/^([A-Z])([1-9]|1[0-9]|20)\/([1-4])$/);

  if (!match) return null;

  return {
    row: match[1],
    position: parseInt(match[2]),
    level: parseInt(match[3])
  };
}

/**
 * Format location components into standard string
 * STANDARD FORMAT: A1/1 to Z20/4 (RowPosition/Level)
 * This matches the warehouse layout: A4/1 = Row A, Position 4, Level 1
 */
export function formatLocation(row: string, position: number, level: number): string {
  // Validate inputs match constraints
  if (!/^[A-Z]$/.test(row.toUpperCase()) || level < 1 || level > 4 || position < 1 || position > 20) {
    throw new Error(`Invalid location parameters: row=${row}, position=${position}, level=${level}`);
  }

  // Format in standard format: A4/1 (RowPosition/Level)
  return `${row.toUpperCase()}${position}/${level}`;
}

/**
 * Format location for display purposes (user-friendly format)
 * Converts database format to A1/1 display format
 * For consistency with warehouse worker expectations: A1/1, A15/2, etc.
 */
export function displayLocation(location: string): string {
  if (!location) return '';

  // Clean and uppercase the input
  const cleaned = location.trim().toUpperCase();

  // If already in target format A1/1, return as-is
  if (/^[A-Z]([1-9]|1[0-9]|20)\/[1-4]$/.test(cleaned)) {
    return cleaned;
  }

  // Convert A/1/1 to A1/1 (old format: row/level/position -> new format: row+position/level)
  if (/^[A-Z]\/[1-4]\/([1-9]|1[0-9]|20)$/.test(cleaned)) {
    const [row, level, position] = cleaned.split('/');
    return `${row}${position}/${level}`;
  }

  return cleaned;
}

/**
 * Format location for database storage (normalized format)
 * Uses the same format as displayLocation but ensures consistency
 * STANDARD FORMAT: A1/1 to Z20/4
 */
export function dbLocation(location: string): string {
  return normalizeLocation(location);
}

/**
 * Convert URL format to Standard format (deprecated - both formats are now the same)
 * URL: A1/5 → Standard: A1/5
 */
export function convertUrlToDbFormat(urlLocation: string): string {
  if (!urlLocation) return '';

  // Both URL and database now use the same A1/5 format
  return normalizeLocation(urlLocation);
}

/**
 * Convert Database format to Standard format (deprecated - both formats are now the same)
 * Database: A1/5 → Standard: A1/5
 */
export function convertDbToUrlFormat(dbLocation: string): string {
  if (!dbLocation) return '';

  // Both URL and database now use the same A1/5 format
  return normalizeLocation(dbLocation);
}

/**
 * Generate all possible warehouse locations
 * Returns array of all valid locations (A1/1 to Z20/4)
 * Total: 26 rows * 20 positions * 4 levels = 2,080 locations - Updated to support A-Z
 */
// Cache for expensive location generation
let _cachedWarehouseLocations: string[] | null = null;

export function generateAllWarehouseLocations(): string[] {
  // Clear cache to force regeneration with new A-Z range
  _cachedWarehouseLocations = null;

  // Return cached result if available
  if (_cachedWarehouseLocations) {
    return _cachedWarehouseLocations;
  }

  const locations: string[] = [];
  const rows = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // A-Z (26 rows) - Full warehouse support including Z20/4

  for (const row of rows) {
    for (let level = 1; level <= 4; level++) {
      for (let position = 1; position <= 20; position++) {
        locations.push(formatLocation(row, position, level));
      }
    }
  }

  // Cache the result and return
  _cachedWarehouseLocations = locations.sort();
  console.log(`🏭 Generated ${_cachedWarehouseLocations.length} warehouse locations (A-Z, 1-20, 1-4)`);
  console.log(`🔍 Sample locations: ${_cachedWarehouseLocations.slice(0, 5).join(', ')} ... ${_cachedWarehouseLocations.slice(-5).join(', ')}`);
  console.log(`✅ Z20/4 support: ${_cachedWarehouseLocations.includes('Z20/4') ? 'YES' : 'NO'}`);
  return _cachedWarehouseLocations;
}