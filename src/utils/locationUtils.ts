/**
 * Utility functions for location standardization and validation
 */

/**
 * Normalize location string to standard format
 * Ensures consistent format: "Row/Level/Position" (e.g., "A/1/01")
 */
export function normalizeLocation(location: string): string {
  if (!location) return '';

  // Remove extra whitespace and convert to uppercase
  const cleaned = location.trim().toUpperCase();

  // If already in correct format with 2-digit position, return as-is
  if (/^[A-Z]\/[1-4]\/\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Try to parse different formats
  const parts = cleaned.split(/[/\s-]+/);

  if (parts.length >= 3) {
    const [row, level, position] = parts;

    // Validate row (should be A-Z)
    if (!/^[A-Z]$/.test(row)) {
      return location; // Return original if can't normalize
    }

    // Validate level (should be 1-4)
    if (!/^[1-4]$/.test(level)) {
      return location;
    }

    // Validate position (should be 1-99, pad with zero if needed)
    const positionNum = parseInt(position);
    if (isNaN(positionNum) || positionNum < 1 || positionNum > 99) {
      return location;
    }

    // Format position with leading zero if needed
    const formattedPosition = positionNum.toString().padStart(2, '0');

    const normalized = `${row}/${level}/${formattedPosition}`;
    return normalized;
  }

  return location;
}

/**
 * Validate if location format is correct
 */
export function isValidLocation(location: string): boolean {
  if (!location) {
    return false;
  }

  const normalized = normalizeLocation(location);
  const isValid = /^[A-Z]\/[1-4]\/\d{2}$/.test(normalized);

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
 */
export function parseLocation(location: string): { row: string; level: number; position: number } | null {
  const normalized = normalizeLocation(location);
  const match = normalized.match(/^([A-Z])\/([1-4])\/(\d{2})$/);

  if (!match) return null;

  return {
    row: match[1],
    level: parseInt(match[2]),
    position: parseInt(match[3])
  };
}

/**
 * Format location components into standard string
 */
export function formatLocation(row: string, level: number, position: number): string {
  const formattedPosition = position.toString().padStart(2, '0');
  return `${row.toUpperCase()}/${level}/${formattedPosition}`;
}