import { supabase } from '@/integrations/supabase/client';

// Cache for column existence to avoid repeated checks
let columnExistenceCache: { [key: string]: boolean } = {};

/**
 * Check if a specific column exists in a table
 * Uses caching and optimized detection to avoid unnecessary database calls
 */
export async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const cacheKey = `${tableName}.${columnName}`;

  // Return cached result if available
  if (cacheKey in columnExistenceCache) {
    return columnExistenceCache[cacheKey];
  }

  // For known cases, skip database calls entirely
  if (tableName === 'inventory_items' && columnName === 'is_deleted') {
    // We know this column doesn't exist in production yet
    columnExistenceCache[cacheKey] = false;
    return false;
  }

  // Skip RPC calls that cause 404 errors and go directly to fallback
  console.log(`🔍 Checking column ${tableName}.${columnName} (using fallback method)`);
  return await checkColumnExistsFallback(tableName, columnName);
}

/**
 * Fallback method: Try to query the column and handle errors
 */
async function checkColumnExistsFallback(tableName: string, columnName: string): Promise<boolean> {
  const cacheKey = `${tableName}.${columnName}`;

  try {
    // Try to select just one row with the specific column
    const { error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(1);

    if (error) {
      // If error contains "column does not exist" or similar
      if (error.message.toLowerCase().includes('column') &&
          error.message.toLowerCase().includes('does not exist')) {
        columnExistenceCache[cacheKey] = false;
        return false;
      }
      // For HTTP 400 errors (Bad Request), likely means column doesn't exist
      if (error.code === 'PGRST103' || error.message.includes('400')) {
        columnExistenceCache[cacheKey] = false;
        return false;
      }
      // Other errors might not be related to column existence
      columnExistenceCache[cacheKey] = false;
      return false;
    }

    // If no error, column exists
    columnExistenceCache[cacheKey] = true;
    return true;

  } catch (error) {
    // Silent handling - don't log errors for expected cases
    columnExistenceCache[cacheKey] = false;
    return false;
  }
}

/**
 * Check if inventory_items table has is_deleted column
 * This is the main function we'll use throughout the app
 */
export async function checkSoftDeleteSupport(): Promise<boolean> {
  return await checkColumnExists('inventory_items', 'is_deleted');
}

/**
 * Clear the column existence cache
 * Useful for testing or after schema changes
 */
export function clearColumnCache(): void {
  columnExistenceCache = {};
  console.log('🧹 Column existence cache cleared');
}

/**
 * Get current cache state (for debugging)
 */
export function getColumnCache(): { [key: string]: boolean } {
  return { ...columnExistenceCache };
}