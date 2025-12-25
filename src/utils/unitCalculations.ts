// Multi-level unit calculation utilities
export interface UnitLevel {
  name: string;
  quantity: number;
  conversionRate: number;
}

export interface MultiLevelInventoryItem {
  // Level 1 (Largest unit - e.g., ลัง)
  unit_level1_name?: string | null;
  unit_level1_quantity: number;
  unit_level1_rate: number;

  // Level 2 (Middle unit - e.g., กล่อง)
  unit_level2_name?: string | null;
  unit_level2_quantity: number;
  unit_level2_rate: number;

  // Level 3 (Base unit - e.g., ชิ้น)
  unit_level3_name?: string | null;
  unit_level3_quantity: number;
}

/**
 * Calculate total quantity in base units (level 3)
 * Formula: (L1_qty * L1_rate) + (L2_qty * L2_rate) + L3_qty
 */
export function calculateTotalBaseQuantity(item: MultiLevelInventoryItem): number {
  const level1Total = (item.unit_level1_quantity || 0) * (item.unit_level1_rate || 0);
  const level2Total = (item.unit_level2_quantity || 0) * (item.unit_level2_rate || 0);
  const level3Total = item.unit_level3_quantity || 0;

  return level1Total + level2Total + level3Total;
}

/**
 * Format unit display for UI
 * Returns a human-readable string like "10 ลัง + 2 กล่อง + 5 ชิ้น"
 */
// Overload for interface parameter
export function formatUnitsDisplay(item: MultiLevelInventoryItem): string;
// Overload for separate parameters
export function formatUnitsDisplay(
  level1Qty: number,
  level2Qty: number,
  level3Qty: number,
  level1Name: string,
  level2Name: string,
  level3Name: string
): string;
// Implementation
export function formatUnitsDisplay(
  itemOrLevel1Qty: MultiLevelInventoryItem | number,
  level2Qty?: number,
  level3Qty?: number,
  level1Name?: string,
  level2Name?: string,
  level3Name?: string
): string {
  const parts: string[] = [];

  // Handle interface parameter
  if (typeof itemOrLevel1Qty === 'object') {
    const item = itemOrLevel1Qty;

    // Level 1 display
    if ((item.unit_level1_quantity || 0) > 0 && item.unit_level1_name) {
      parts.push(`${item.unit_level1_quantity} ${item.unit_level1_name}`);
    }

    // Level 2 display
    if ((item.unit_level2_quantity || 0) > 0 && item.unit_level2_name) {
      parts.push(`${item.unit_level2_quantity} ${item.unit_level2_name}`);
    }

    // Level 3 display
    if ((item.unit_level3_quantity || 0) > 0) {
      const unit3Name = item.unit_level3_name || 'ชิ้น';
      parts.push(`${item.unit_level3_quantity} ${unit3Name}`);
    }
  } else {
    // Handle separate parameters
    const level1Qty = itemOrLevel1Qty;

    // Level 1 display
    if ((level1Qty || 0) > 0 && level1Name) {
      parts.push(`${level1Qty} ${level1Name}`);
    }

    // Level 2 display
    if ((level2Qty || 0) > 0 && level2Name) {
      parts.push(`${level2Qty} ${level2Name}`);
    }

    // Level 3 display
    if ((level3Qty || 0) > 0) {
      const unit3Name = level3Name || 'ชิ้น';
      parts.push(`${level3Qty} ${unit3Name}`);
    }
  }

  return parts.length > 0 ? parts.join(' + ') : '0';
}

/**
 * Format total quantity with base unit
 * Returns string like "5,057 ชิ้น"
 */
export function formatTotalQuantity(item: MultiLevelInventoryItem): string {
  const total = calculateTotalBaseQuantity(item);
  const baseUnitName = item.unit_level3_name || 'ชิ้น';
  return `${total.toLocaleString('th-TH')} ${baseUnitName}`;
}

/**
 * Validate unit data
 */
export function validateUnitData(item: MultiLevelInventoryItem): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check quantities are non-negative
  if (item.unit_level1_quantity < 0) {
    errors.push('จำนวนหน่วยชั้นที่ 1 ต้องไม่น้อยกว่า 0');
  }
  if (item.unit_level2_quantity < 0) {
    errors.push('จำนวนหน่วยชั้นที่ 2 ต้องไม่น้อยกว่า 0');
  }
  if (item.unit_level3_quantity < 0) {
    errors.push('จำนวนหน่วยชั้นที่ 3 ต้องไม่น้อยกว่า 0');
  }

  // Check conversion rates are positive when quantities exist
  if (item.unit_level1_quantity > 0 && item.unit_level1_rate <= 0) {
    errors.push('อัตราแปลงหน่วยชั้นที่ 1 ต้องมากกว่า 0 เมื่อมีจำนวน');
  }
  if (item.unit_level2_quantity > 0 && item.unit_level2_rate <= 0) {
    errors.push('อัตราแปลงหน่วยชั้นที่ 2 ต้องมากกว่า 0 เมื่อมีจำนวน');
  }

  // Check that unit names exist when quantities > 0
  if (item.unit_level1_quantity > 0 && !item.unit_level1_name?.trim()) {
    errors.push('ต้องระบุชื่อหน่วยชั้นที่ 1 เมื่อมีจำนวน');
  }
  if (item.unit_level2_quantity > 0 && !item.unit_level2_name?.trim()) {
    errors.push('ต้องระบุชื่อหน่วยชั้นที่ 2 เมื่อมีจำนวน');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Convert legacy box/loose quantities to new multi-level system
 */
export function convertLegacyToMultiLevel(
  boxQuantity: number,
  looseQuantity: number,
  boxToLooseRate: number = 1
): MultiLevelInventoryItem {
  return {
    unit_level1_name: null,
    unit_level1_quantity: 0,
    unit_level1_rate: 0,

    unit_level2_name: boxQuantity > 0 ? 'กล่อง' : null,
    unit_level2_quantity: boxQuantity,
    unit_level2_rate: boxToLooseRate,

    unit_level3_name: 'ชิ้น',
    unit_level3_quantity: looseQuantity
  };
}

/**
 * Get empty/default multi-level item
 */
export function getEmptyMultiLevelItem(): MultiLevelInventoryItem {
  return {
    unit_level1_name: null,
    unit_level1_quantity: 0,
    unit_level1_rate: 0,

    unit_level2_name: null,
    unit_level2_quantity: 0,
    unit_level2_rate: 0,

    unit_level3_name: 'ชิ้น',
    unit_level3_quantity: 0
  };
}

// Common unit names in Thai
export const COMMON_UNIT_NAMES = {
  level1: ['ลัง', 'หีบ', 'โหล', 'ตัน', 'กระสอบ'],
  level2: ['กล่อง', 'แพ็ค', 'มัด', 'ซอง', 'ถุง'],
  level3: ['ชิ้น', 'หลวม', 'อัน', 'แผง', 'ขวด', 'กิโลกรัม']
};

/**
 * SKU Multiplier Parsing
 * แยก SKU ที่มีตัวคูณท้าย (X6, X12 ฯลฯ) ออกเป็น Base SKU และ Multiplier
 * 
 * ตัวอย่าง:
 * - "L3-8GX6" → { baseSKU: "L3-8G", multiplier: 6, originalSKU: "L3-8GX6" }
 * - "L4-8GX12" → { baseSKU: "L4-8G", multiplier: 12, originalSKU: "L4-8GX12" }
 * - "L3-8G" → { baseSKU: "L3-8G", multiplier: 1, originalSKU: "L3-8G" }
 */
export interface SKUParseResult {
  baseSKU: string;
  multiplier: number;
  originalSKU: string;
  hasMultiplier: boolean;
}

/**
 * Parse SKU with multiplier suffix (e.g., L3-8GX6 → L3-8G × 6)
 * Pattern: {BASE_SKU}X{NUMBER} where NUMBER is 1-3 digits
 */
export function parseSKUWithMultiplier(sku: string): SKUParseResult {
  if (!sku) {
    return { baseSKU: '', multiplier: 1, originalSKU: '', hasMultiplier: false };
  }

  const originalSKU = sku.trim();
  
  // Pattern: ตัวอักษรหรือตัวเลขใดๆ ตามด้วย X และตัวเลข 1-3 หลัก ท้าย string
  // รองรับ: L3-8GX6, L4-8GX12, ABC-123X24, etc.
  const match = originalSKU.match(/^(.+?)X(\d{1,3})$/i);
  
  if (match) {
    const baseSKU = match[1];
    const multiplier = parseInt(match[2], 10);
    
    // ตรวจสอบว่า multiplier มีค่ามากกว่า 1 (X1 ถือว่าไม่มี multiplier)
    if (multiplier > 1) {
      return {
        baseSKU,
        multiplier,
        originalSKU,
        hasMultiplier: true
      };
    }
  }
  
  // ไม่พบ pattern X{NUMBER} หรือ multiplier = 1
  return {
    baseSKU: originalSKU,
    multiplier: 1,
    originalSKU,
    hasMultiplier: false
  };
}

/**
 * Calculate actual quantity needed based on SKU multiplier
 * เช่น ต้องการ L3-8GX6 จำนวน 100 = ต้องใช้ L3-8G จำนวน 100 × 6 = 600 ชิ้น
 */
export function calculateActualQuantityNeeded(sku: string, requestedQuantity: number): {
  baseSKU: string;
  actualQuantity: number;
  multiplier: number;
  originalSKU: string;
} {
  const parsed = parseSKUWithMultiplier(sku);
  return {
    baseSKU: parsed.baseSKU,
    actualQuantity: requestedQuantity * parsed.multiplier,
    multiplier: parsed.multiplier,
    originalSKU: parsed.originalSKU
  };
}

/**
 * Format SKU display with multiplier info
 * เช่น "L3-8GX6" → "L3-8GX6 (= L3-8G × 6)"
 */
export function formatSKUWithMultiplierInfo(sku: string): string {
  const parsed = parseSKUWithMultiplier(sku);
  if (parsed.hasMultiplier) {
    return `${parsed.originalSKU} (= ${parsed.baseSKU} × ${parsed.multiplier})`;
  }
  return parsed.originalSKU;
}

// Enhanced dynamic conversion rate calculation utilities
export interface InventoryItemWithRates extends MultiLevelInventoryItem {
  sku: string;
  product_name?: string;
  location?: string;
}

export interface ConversionRateData {
  sku: string;
  product_name: string;
  unit_level1_name: string;
  unit_level1_rate: number;
  unit_level2_name: string;
  unit_level2_rate: number;
  unit_level3_name: string;
  isDefault?: boolean;
}

/**
 * Calculate total quantity with dynamic conversion rates
 * Uses cached conversion rates and fetches from database when needed
 */
export async function calculateTotalQuantityWithDynamicRates(
  item: InventoryItemWithRates,
  getConversionRate: (sku: string) => Promise<ConversionRateData | null>,
  cache: Map<string, ConversionRateData>
): Promise<number> {
  const level1 = item.unit_level1_quantity || 0;
  const level2 = item.unit_level2_quantity || 0;
  const level3 = item.unit_level3_quantity || 0;

  let level1Rate = item.unit_level1_rate;
  let level2Rate = item.unit_level2_rate;

  // Try to get conversion rates from cache first
  if (cache.has(item.sku)) {
    const cachedRate = cache.get(item.sku)!;
    level1Rate = cachedRate.unit_level1_rate;
    level2Rate = cachedRate.unit_level2_rate;
    console.log(`🧮 UTIL ${item.sku} - Using cached rates - Level1: ${level1}x${level1Rate}, Level2: ${level2}x${level2Rate}, Level3: ${level3}`);
  } else {
    // Fetch from database if not in cache
    try {
      const conversionRate = await getConversionRate(item.sku);
      if (conversionRate) {
        level1Rate = conversionRate.unit_level1_rate;
        level2Rate = conversionRate.unit_level2_rate;
        cache.set(item.sku, conversionRate);
        console.log(`🧮 UTIL ${item.sku} - Using DB rates (${level1Rate}/${level2Rate}) - Level1: ${level1}x${level1Rate}, Level2: ${level2}x${level2Rate}, Level3: ${level3}`);
      }
    } catch (error) {
      console.warn(`⚠️ UTIL Could not fetch conversion rate for ${item.sku}, using defaults`);
    }
  }

  // Use fallback defaults if still no rates
  if (!level1Rate) level1Rate = 144; // Default for ลัง
  if (!level2Rate) level2Rate = 12;   // Default for กล่อง

  return (level1 * level1Rate) + (level2 * level2Rate) + level3;
}

/**
 * Synchronous version for UI components that need immediate results
 * Uses cached rates or fallback defaults
 */
export function calculateTotalQuantityWithCache(
  item: InventoryItemWithRates,
  cache: Map<string, ConversionRateData>
): number {
  const level1 = item.unit_level1_quantity || 0;
  const level2 = item.unit_level2_quantity || 0;
  const level3 = item.unit_level3_quantity || 0;

  // Try to get conversion rates from cache first
  if (cache.has(item.sku)) {
    const cachedRate = cache.get(item.sku)!;
    const total = (level1 * cachedRate.unit_level1_rate) + (level2 * cachedRate.unit_level2_rate) + level3;
    console.log(`🧮 UTIL SYNC ${item.sku} - Using cached - Level1: ${level1}x${cachedRate.unit_level1_rate}, Level2: ${level2}x${cachedRate.unit_level2_rate}, Level3: ${level3} = ${total}`);
    return total;
  }

  // Use item rates if available, otherwise fallback to defaults
  const level1Rate = item.unit_level1_rate || 144;
  const level2Rate = item.unit_level2_rate || 12;
  const total = (level1 * level1Rate) + (level2 * level2Rate) + level3;
  console.log(`🧮 UTIL SYNC ${item.sku} - Using fallback - Level1: ${level1}x${level1Rate}, Level2: ${level2}x${level2Rate}, Level3: ${level3} = ${total}`);
  return total;
}