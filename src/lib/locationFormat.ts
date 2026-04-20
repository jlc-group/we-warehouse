/**
 * Location Format Helper
 *
 * Rules:
 *   - DB column `location` stores with slash:   "A3/2"
 *   - QR Code / URL uses dash (URL-safe):       "A3-2"
 *
 * ALL conversions between these two formats must go through these helpers
 * to prevent format drift across the codebase.
 */

/**
 * Convert URL-safe location code to DB format.
 * Used when parsing :locationCode from route params.
 *
 * @example urlToDbLocation('A3-2')  // → 'A3/2'
 * @example urlToDbLocation('B10-4') // → 'B10/4'
 */
export function urlToDbLocation(urlCode: string): string {
    if (!urlCode) return '';
    return urlCode.replace(/-/g, '/');
}

/**
 * Convert DB location to URL-safe format.
 * Used when building QR code URLs and mobile navigation.
 *
 * @example dbToUrlLocation('A3/2')  // → 'A3-2'
 * @example dbToUrlLocation('B10/4') // → 'B10-4'
 */
export function dbToUrlLocation(dbCode: string): string {
    if (!dbCode) return '';
    return dbCode.replace(/\//g, '-');
}

/**
 * Validate location format. Accepts both URL and DB formats.
 * Pattern: 1-2 letters + digits + separator + 1-2 digits
 *   A1/1, A3/2, B10/4, C20/3   (DB)
 *   A1-1, A3-2, B10-4, C20-3   (URL)
 */
export function isValidLocation(code: string): boolean {
    if (!code) return false;
    return /^[A-Z]{1,2}\d{1,2}[\/\-]\d{1,2}$/.test(code);
}
