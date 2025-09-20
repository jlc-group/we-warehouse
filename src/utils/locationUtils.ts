/**
 * Utility functions for location standardization and validation
 */

/**
 * Normalize location string to standard format
 * Ensures consistent format: "Row/Level/Position" (e.g., "A/1/1", "A/1/20")
 * Database constraint: ^[A-N]/[1-4]/([1-9]|1[0-9]|20)$
 */
export function normalizeLocation(location: string): string {
  if (!location) return '';

  // Remove extra whitespace and convert to uppercase
  const cleaned = location.trim().toUpperCase();

  // If already in correct format, return as-is
  if (/^[A-N]\/[1-4]\/([1-9]|1[0-9]|20)$/.test(cleaned)) {
    return cleaned;
  }

  // Try to parse different formats
  const parts = cleaned.split(/[/\-\s]+/);

  if (parts.length >= 3) {
    const [row, level, position] = parts;

    // Validate row (should be A-N only, database constraint)
    if (!/^[A-N]$/.test(row)) {
      return location; // Return original if can't normalize
    }

    // Validate level (should be 1-4)
    if (!/^[1-4]$/.test(level)) {
      return location;
    }

    // Validate position (should be 1-20, database constraint)
    const positionNum = parseInt(position);
    if (isNaN(positionNum) || positionNum < 1 || positionNum > 20) {
      return location;
    }

    // Format position WITHOUT leading zero (database expects 1, not 01)
    const formattedPosition = positionNum.toString();

    const normalized = `${row}/${level}/${formattedPosition}`;
    return normalized;
  }

  return location;
}

/**
 * Validate if location format is correct
 * Database constraint: ^[A-N]/[1-4]/([1-9]|1[0-9]|20)$
 */
export function isValidLocation(location: string): boolean {
  if (!location) {
    return false;
  }

  const normalized = normalizeLocation(location);
  const isValid = /^[A-N]\/[1-4]\/([1-9]|1[0-9]|20)$/.test(normalized);

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
 * Database constraint: ^[A-N]/[1-4]/([1-9]|1[0-9]|20)$
 */
export function parseLocation(location: string): { row: string; level: number; position: number } | null {
  const normalized = normalizeLocation(location);
  const match = normalized.match(/^([A-N])\/([1-4])\/([1-9]|1[0-9]|20)$/);

  if (!match) return null;

  return {
    row: match[1],
    level: parseInt(match[2]),
    position: parseInt(match[3])
  };
}

/**
 * Format location components into standard string
 * Database constraint: ^[A-N]/[1-4]/([1-9]|1[0-9]|20)$
 */
export function formatLocation(row: string, level: number, position: number): string {
  // Validate inputs match database constraints
  if (!/^[A-N]$/.test(row.toUpperCase()) || level < 1 || level > 4 || position < 1 || position > 20) {
    throw new Error(`Invalid location parameters: row=${row}, level=${level}, position=${position}`);
  }

  // Format WITHOUT leading zero (database expects 1, not 01)
  const formattedPosition = position.toString();
  return `${row.toUpperCase()}/${level}/${formattedPosition}`;
}