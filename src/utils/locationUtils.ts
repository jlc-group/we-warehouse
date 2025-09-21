/**
 * Utility functions for location standardization and validation
 */

/**
 * Normalize location string to standard format
 * Ensures consistent format: "A/1/1" (Database constraint format)
 * DATABASE FORMAT: A/1/1 to N/4/20 (Row/Level/Position with slashes)
 */
export function normalizeLocation(location: string): string {
  if (!location) return '';

  // Remove extra whitespace and convert to uppercase
  const cleaned = location.trim().toUpperCase();

  // If already in correct database format A/1/4, return as-is
  if (/^[A-N]\/([1-9]|1[0-9]|20)\/[1-4]$/.test(cleaned)) {
    return cleaned;
  }

  // Handle compact A1/4 format - convert to A/1/4 (database format)
  if (/^[A-N]([1-9]|1[0-9]|20)\/[1-4]$/.test(cleaned)) {
    const match = cleaned.match(/^([A-N])([1-9]|1[0-9]|20)\/([1-4])$/);
    if (match) {
      const [, row, position, level] = match;
      return `${row}/${position}/${level}`;
    }
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

    // Format in database format: A/1/4
    const normalized = `${row}/${positionNum}/${level}`;
    return normalized;
  }

  // Try to parse concatenated formats like A101, A11
  if (/^[A-N]\d{2,3}$/.test(cleaned)) {
    const row = cleaned[0];
    const numbers = cleaned.slice(1);

    if (numbers.length === 2) {
      // A14 -> A/1/4 (position 1, level 4)
      const position = parseInt(numbers[0]);
      const level = parseInt(numbers[1]);
      if (position >= 1 && position <= 20 && level >= 1 && level <= 4) {
        return `${row}/${position}/${level}`;
      }
    } else if (numbers.length === 3) {
      // A014 -> A/01/4 -> A/1/4 (position 1, level 4)
      const position = parseInt(numbers.slice(0, 2));
      const level = parseInt(numbers[2]);
      if (position >= 1 && position <= 20 && level >= 1 && level <= 4) {
        return `${row}/${position}/${level}`;
      }
    }
  }

  return location;
}

/**
 * Validate if location format is correct
 * DATABASE FORMAT: ^[A-N]/([1-9]|1[0-9]|20)/[1-4]$ (A/1/4 to N/20/4)
 */
export function isValidLocation(location: string): boolean {
  if (!location) {
    return false;
  }

  const normalized = normalizeLocation(location);
  const isValid = /^[A-N]\/([1-9]|1[0-9]|20)\/[1-4]$/.test(normalized);

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
 * DATABASE FORMAT: ^[A-N]/([1-9]|1[0-9]|20)/[1-4]$ (A/1/4 to N/20/4)
 */
export function parseLocation(location: string): { row: string; level: number; position: number } | null {
  const normalized = normalizeLocation(location);
  const match = normalized.match(/^([A-N])\/([1-9]|1[0-9]|20)\/([1-4])$/);

  if (!match) return null;

  return {
    row: match[1],
    position: parseInt(match[2]),
    level: parseInt(match[3])
  };
}

/**
 * Format location components into standard string
 * DATABASE FORMAT: A/1/1 to N/20/4 (Database constraint format: Row/Position/Level)
 * This matches the warehouse layout: A1/4 = Row A, Position 1, Level 4 (top shelf)
 */
export function formatLocation(row: string, position: number, level: number): string {
  // Validate inputs match constraints
  if (!/^[A-N]$/.test(row.toUpperCase()) || level < 1 || level > 4 || position < 1 || position > 20) {
    throw new Error(`Invalid location parameters: row=${row}, position=${position}, level=${level}`);
  }

  // Format in database format: A/1/4 (Row/Position/Level)
  return `${row.toUpperCase()}/${position}/${level}`;
}

/**
 * Format location for display purposes (user-friendly format)
 * Converts A/1/1 (database) to A1/1 (display format)
 * For consistency with warehouse worker expectations: A1/1, A2/15, etc.
 */
export function displayLocation(location: string): string {
  const normalized = normalizeLocation(location);
  return convertDbToUrlFormat(normalized);
}

/**
 * Format location for database storage (normalized format)
 * Uses the same format as displayLocation but ensures consistency
 * NEW TARGET FORMAT: A1/1 to A20/4
 */
export function dbLocation(location: string): string {
  return normalizeLocation(location);
}

/**
 * Convert URL format to Database format
 * URL: A4/5 → Database: A/4/5
 */
export function convertUrlToDbFormat(urlLocation: string): string {
  if (!urlLocation) return '';

  // If already in database format (A/5/4), return as-is
  if (/^[A-N]\/([1-9]|1[0-9]|20)\/[1-4]$/.test(urlLocation.toUpperCase())) {
    return urlLocation.toUpperCase();
  }

  // Convert URL format A5/4 to database format A/5/4
  const match = urlLocation.toUpperCase().match(/^([A-N])([1-9]|1[0-9]|20)\/([1-4])$/);
  if (match) {
    const [, row, position, level] = match;
    return `${row}/${position}/${level}`;
  }

  return urlLocation;
}

/**
 * Convert Database format to URL format
 * Database: A/4/5 → URL: A4/5
 */
export function convertDbToUrlFormat(dbLocation: string): string {
  if (!dbLocation) return '';

  // If already in URL format (A5/4), return as-is
  if (/^[A-N]([1-9]|1[0-9]|20)\/[1-4]$/.test(dbLocation.toUpperCase())) {
    return dbLocation.toUpperCase();
  }

  // Convert database format A/5/4 to URL format A5/4
  const match = dbLocation.toUpperCase().match(/^([A-N])\/([1-9]|1[0-9]|20)\/([1-4])$/);
  if (match) {
    const [, row, position, level] = match;
    return `${row}${position}/${level}`;
  }

  return dbLocation;
}

/**
 * Generate all possible warehouse locations
 * Returns array of all valid locations (A1/1 to N4/20)
 * Total: 14 rows * 4 levels * 20 positions = 1,120 locations
 */
// Cache for expensive location generation
let _cachedWarehouseLocations: string[] | null = null;

export function generateAllWarehouseLocations(): string[] {
  // Return cached result if available
  if (_cachedWarehouseLocations) {
    return _cachedWarehouseLocations;
  }

  const locations: string[] = [];
  const rows = 'ABCDEFGHIJKLMN'; // A-N (14 rows)

  for (const row of rows) {
    for (let level = 1; level <= 4; level++) {
      for (let position = 1; position <= 20; position++) {
        locations.push(formatLocation(row, position, level));
      }
    }
  }

  // Cache the result and return
  _cachedWarehouseLocations = locations.sort();
  return _cachedWarehouseLocations;
}