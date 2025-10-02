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
} as const;