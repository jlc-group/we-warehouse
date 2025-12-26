/**
 * Utility functions for location standardization and validation
 * Supports both single warehouse (A1/1) and multi-warehouse (WH001-A1/1) formats
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

  if (parts.length >= 2) {
    // Handle case where split results in ["A1", "4"] (from A1-4)
    if (parts.length === 2 && /^[A-Z]\d+$/.test(parts[0])) {
      const row = parts[0][0];
      const position = parts[0].substring(1);
      const level = parts[1];

      // Validate
      const positionNum = parseInt(position);
      if (
        /^[A-Z]$/.test(row) &&
        /^[1-4]$/.test(level) &&
        !isNaN(positionNum) && positionNum >= 1 && positionNum <= 20
      ) {
        return `${row}${positionNum}/${level}`;
      }
    }

    if (parts.length >= 3) {
      const [row, level, position] = parts;
      // ... existing logic continues below ...
      // Validate row (should be A-N only)
      if (/^[A-Z]$/.test(row)) {
        // Validate level (should be 1-4)
        if (/^[1-4]$/.test(level)) {
          // Validate position (should be 1-20)
          const positionNum = parseInt(position);
          if (!isNaN(positionNum) && positionNum >= 1 && positionNum <= 20) {
            // Format in target format: A1/1 (RowPosition/Level)
            return `${row}${positionNum}/${level}`;
          }
        }
      }
    }
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

/**
 * Multi-Warehouse Location Functions
 * Added for multi-warehouse support while maintaining backward compatibility
 */

/**
 * Parse multi-warehouse location format
 * Supports: "WH001-A1/1", "MAIN-B5/3", or legacy "A1/1"
 */
export function parseMultiWarehouseLocation(location: string): {
  warehouseCode: string;
  location: string;
  row: string;
  position: number;
  level: number;
} | null {
  if (!location) return null;

  const cleaned = location.trim().toUpperCase();

  // Check if it has warehouse prefix (WH001-A1/1)
  const warehousePrefixMatch = cleaned.match(/^([A-Z0-9]+)-(.+)$/);

  let warehouseCode = 'MAIN'; // Default warehouse for legacy format
  let locationPart = cleaned;

  if (warehousePrefixMatch) {
    warehouseCode = warehousePrefixMatch[1];
    locationPart = warehousePrefixMatch[2];
  }

  // Parse the location part
  const locationData = parseLocation(locationPart);
  if (!locationData) return null;

  return {
    warehouseCode,
    location: locationPart,
    row: locationData.row,
    position: locationData.position,
    level: locationData.level
  };
}

/**
 * Format multi-warehouse location
 * Creates: "WH001-A1/1" format
 */
export function formatMultiWarehouseLocation(
  warehouseCode: string,
  row: string,
  position: number,
  level: number
): string {
  const location = formatLocation(row, position, level);

  // For default warehouse, use legacy format for backward compatibility
  if (warehouseCode === 'MAIN') {
    return location;
  }

  return `${warehouseCode.toUpperCase()}-${location}`;
}

/**
 * Extract warehouse code from location
 * Returns 'MAIN' for legacy format locations
 */
export function extractWarehouseCode(location: string): string {
  const parsed = parseMultiWarehouseLocation(location);
  return parsed ? parsed.warehouseCode : 'MAIN';
}

/**
 * Extract location part without warehouse prefix
 * "WH001-A1/1" -> "A1/1"
 * "A1/1" -> "A1/1"
 */
export function extractLocationPart(location: string): string {
  const parsed = parseMultiWarehouseLocation(location);
  return parsed ? parsed.location : location;
}

/**
 * Convert legacy location to multi-warehouse format
 * "A1/1" -> "MAIN-A1/1" (or keep as "A1/1" for default warehouse)
 */
export function convertToMultiWarehouseFormat(location: string, warehouseCode: string = 'MAIN'): string {
  const locationPart = extractLocationPart(location);
  return formatMultiWarehouseLocation(warehouseCode,
    parseLocation(locationPart)?.row || 'A',
    parseLocation(locationPart)?.position || 1,
    parseLocation(locationPart)?.level || 1
  );
}

/**
 * Validate multi-warehouse location format
 */
export function isValidMultiWarehouseLocation(location: string): boolean {
  const parsed = parseMultiWarehouseLocation(location);
  return parsed !== null && isValidLocation(parsed.location);
}

/**
 * Generate all locations for a specific warehouse
 */
export function generateWarehouseLocations(
  warehouseCode: string,
  rowStart: string = 'A',
  rowEnd: string = 'Z',
  maxPositions: number = 20,
  maxLevels: number = 4
): string[] {
  const locations: string[] = [];
  const startCharCode = rowStart.charCodeAt(0);
  const endCharCode = rowEnd.charCodeAt(0);

  for (let charCode = startCharCode; charCode <= endCharCode; charCode++) {
    const row = String.fromCharCode(charCode);
    for (let level = 1; level <= maxLevels; level++) {
      for (let position = 1; position <= maxPositions; position++) {
        locations.push(formatMultiWarehouseLocation(warehouseCode, row, position, level));
      }
    }
  }

  return locations.sort();
}

/**
 * Compare locations across warehouses
 * Handles both single and multi-warehouse formats
 */
export function compareMultiWarehouseLocations(location1: string, location2: string): boolean {
  const parsed1 = parseMultiWarehouseLocation(location1);
  const parsed2 = parseMultiWarehouseLocation(location2);

  if (!parsed1 || !parsed2) return false;

  return parsed1.warehouseCode === parsed2.warehouseCode &&
    parsed1.location === parsed2.location;
}

/**
 * Generate QR Code data for multi-warehouse location
 * Format: "WH001-A1/1" or "A1/1" for MAIN warehouse
 */
export function generateWarehouseLocationQR(warehouseCode: string, location: string): string {
  const normalizedLocation = normalizeLocation(location);

  if (warehouseCode === 'MAIN') {
    // For main warehouse, use legacy format for backward compatibility
    return normalizedLocation;
  }

  return `${warehouseCode.toUpperCase()}-${normalizedLocation}`;
}

/**
 * Parse QR Code data to extract warehouse and location
 * Supports both legacy and multi-warehouse QR formats
 */
export function parseWarehouseLocationQR(qrData: string): {
  warehouseCode: string;
  location: string;
  fullLocation: string;
} | null {
  const parsed = parseMultiWarehouseLocation(qrData);
  if (!parsed) return null;

  return {
    warehouseCode: parsed.warehouseCode,
    location: parsed.location,
    fullLocation: qrData
  };
}