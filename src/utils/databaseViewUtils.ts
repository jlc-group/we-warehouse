import { localDb } from '@/integrations/local/client';

// Cache สำหรับเก็บผลการตรวจสอบ view
const viewExistenceCache = new Map<string, boolean>();
const cacheTimeout = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

// Interface สำหรับผลการตรวจสอบ view
export interface ViewCheckResult {
  exists: boolean;
  cached: boolean;
  checkedAt: Date;
}

/**
 * ตรวจสอบว่า database view มีอยู่หรือไม่
 * @param viewName ชื่อ view ที่ต้องการตรวจสอบ
 * @param useCache ใช้ cache หรือไม่ (default: true)
 * @returns ผลการตรวจสอบ
 */
export async function checkViewExists(
  viewName: string,
  useCache: boolean = true
): Promise<ViewCheckResult> {
  const now = Date.now();

  // ตรวจสอบ cache ก่อน
  if (useCache && viewExistenceCache.has(viewName)) {
    const cachedTime = cacheTimestamps.get(viewName) || 0;
    if (now - cachedTime < cacheTimeout) {
      return {
        exists: viewExistenceCache.get(viewName) || false,
        cached: true,
        checkedAt: new Date(cachedTime)
      };
    }
  }

  console.log(`🔍 Checking if view '${viewName}' exists...`);

  try {
    // ลองเรียก view เพื่อตรวจสอบ
    const { error } = await localDb
      .from(viewName)
      .select('*')
      .limit(1);

    // ถ้าไม่มี error แสดงว่า view มีอยู่
    // ถ้ามี error และเป็น "does not exist" แสดงว่า view ไม่มี
    const exists = !error;

    // บันทึกลง cache
    viewExistenceCache.set(viewName, exists);
    cacheTimestamps.set(viewName, now);

    console.log(`${exists ? '✅' : '❌'} View '${viewName}' ${exists ? 'exists' : 'does not exist'}`);

    return {
      exists,
      cached: false,
      checkedAt: new Date(now)
    };

  } catch (error) {
    console.warn(`⚠️ Error checking view '${viewName}':`, error);

    // กรณีเกิด error ให้ถือว่า view ไม่มี
    viewExistenceCache.set(viewName, false);
    cacheTimestamps.set(viewName, now);

    return {
      exists: false,
      cached: false,
      checkedAt: new Date(now)
    };
  }
}

/**
 * ล้าง cache สำหรับ view ที่ระบุ
 * @param viewName ชื่อ view (ถ้าไม่ระบุจะล้างทั้งหมด)
 */
export function clearViewCache(viewName?: string): void {
  if (viewName) {
    viewExistenceCache.delete(viewName);
    cacheTimestamps.delete(viewName);
    console.log(`🧹 Cleared cache for view '${viewName}'`);
  } else {
    viewExistenceCache.clear();
    cacheTimestamps.clear();
    console.log('🧹 Cleared all view cache');
  }
}

/**
 * ดู cache ปัจจุบัน (สำหรับ debugging)
 */
export function getViewCacheStatus(): Record<string, { exists: boolean; cachedAt: Date }> {
  const result: Record<string, { exists: boolean; cachedAt: Date }> = {};

  for (const [viewName, exists] of viewExistenceCache.entries()) {
    const cachedAt = cacheTimestamps.get(viewName) || Date.now();
    result[viewName] = {
      exists,
      cachedAt: new Date(cachedAt)
    };
  }

  return result;
}

/**
 * ตรวจสอบ views หลายตัวพร้อมกัน
 * @param viewNames รายชื่อ views ที่ต้องการตรวจสอบ
 * @param useCache ใช้ cache หรือไม่
 * @returns ผลการตรวจสอบทั้งหมด
 */
export async function checkMultipleViews(
  viewNames: string[],
  useCache: boolean = true
): Promise<Record<string, ViewCheckResult>> {
  console.log(`🔍 Checking ${viewNames.length} views:`, viewNames);

  const results = await Promise.allSettled(
    viewNames.map(viewName => checkViewExists(viewName, useCache))
  );

  const output: Record<string, ViewCheckResult> = {};

  viewNames.forEach((viewName, index) => {
    const result = results[index];
    if (result.status === 'fulfilled') {
      output[viewName] = result.value;
    } else {
      output[viewName] = {
        exists: false,
        cached: false,
        checkedAt: new Date()
      };
    }
  });

  return output;
}

// รายชื่อ views ที่ระบบใช้งาน
export const REQUIRED_VIEWS = {
  PRODUCTS_SUMMARY: 'products_summary',
  AVAILABLE_PRODUCTS_FOR_SALES: 'available_products_for_sales',
  INVENTORY_SUMMARY: 'inventory_summary',
  STOCK_MOVEMENTS: 'stock_movements'
} as const;

/**
 * ตรวจสอบ views ที่จำเป็นทั้งหมด
 */
export async function checkRequiredViews(): Promise<Record<string, ViewCheckResult>> {
  const viewNames = Object.values(REQUIRED_VIEWS);
  return await checkMultipleViews(viewNames);
}