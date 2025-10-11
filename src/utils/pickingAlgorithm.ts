/**
 * Picking Algorithm - คำนวณแผนการหยิบสินค้าอย่างมีประสิทธิภาพ
 * เชื่อมโยงระหว่าง Packing List และ inventory_items
 */

import { normalizeLocation } from './locationUtils';
import { calculateTotalBaseQuantity } from './unitCalculations';

export interface ProductNeed {
  productCode: string;
  productName: string;
  quantity: number;
  unitCode?: string;
}

export interface InventoryLocation {
  id: string;
  sku: string | null;
  product_name: string;
  location: string;
  unit_level1_quantity: number | null;
  unit_level1_rate: number | null;
  unit_level2_quantity: number | null;
  unit_level2_rate: number | null;
  unit_level3_quantity: number | null;
  unit_level1_name?: string | null;
  unit_level2_name?: string | null;
  unit_level3_name?: string | null;
  warehouse_id?: string | null;
  // FIFO Support (ใช้ชื่อจริงใน DB)
  lot?: string | null;
  mfd?: string | null;
  created_at?: string | null;
}

export interface PickingLocation {
  location: string;
  normalizedLocation: string;
  zone: string; // A, B, C, etc.
  position: number; // 1, 2, 3...
  level: number; // 1-4
  available: number;
  needed: number;
  toPick: number;
  remaining: number;
  isCompleted: boolean;
  inventoryId: string;
  // FIFO Support
  lot?: string;
  mfd?: string;
  createdAt?: string;
}

export interface PickingPlan {
  productCode: string;
  productName: string;
  totalNeeded: number;
  totalAvailable: number;
  status: 'sufficient' | 'insufficient' | 'not_found';
  percentage: number;
  locations: PickingLocation[];
}

export interface PickingRoute {
  sequence: number;
  location: string;
  normalizedLocation: string;
  zone: string;
  productCode: string;
  productName: string;
  quantity: number;
  isCompleted: boolean;
}

/**
 * แยกวิเคราะห์ Location string เป็น zone, position, level
 * รูปแบบ: A1/1, B2/3, C5/4
 */
export function parseLocation(location: string): { zone: string; position: number; level: number } | null {
  const normalized = normalizeLocation(location);
  if (!normalized) return null;

  // ตรวจสอบรูปแบบ: A1/1, B2/3, C5/4
  const match = normalized.match(/^([A-Z])(\d+)\/(\d+)$/);
  if (!match) return null;

  const [, zone, pos, lvl] = match;
  return {
    zone,
    position: parseInt(pos),
    level: parseInt(lvl)
  };
}

/**
 * เรียง Locations แบบ FIFO/FEFO
 * เรียงตาม MFD (Manufacturing Date) เก่าก่อน → LOT → Location
 */
export function sortLocationsByFIFO(locations: PickingLocation[]): PickingLocation[] {
  return [...locations].sort((a, b) => {
    // 1. เรียงตาม MFD (วันที่ผลิตเก่าก่อน) - FEFO Priority!
    if (a.mfd && b.mfd) {
      const dateA = new Date(a.mfd).getTime();
      const dateB = new Date(b.mfd).getTime();
      if (dateA !== dateB) {
        return dateA - dateB; // เก่าก่อน
      }
    } else if (a.mfd && !b.mfd) {
      return -1; // ที่มี MFD ไปก่อน
    } else if (!a.mfd && b.mfd) {
      return 1; // ที่ไม่มี MFD ไปหลัง
    }
    
    // 2. ถ้า MFD เท่ากัน เรียงตาม LOT
    if (a.lot && b.lot && a.lot !== b.lot) {
      return a.lot.localeCompare(b.lot);
    }
    
    // 3. สุดท้าย เรียงตาม Location (Zone → Position → Level)
    if (a.zone !== b.zone) {
      return a.zone.localeCompare(b.zone);
    }
    if (a.position !== b.position) {
      return a.position - b.position;
    }
    return a.level - b.level;
  });
}

/**
 * เรียง Locations ตามโซนและตำแหน่ง (เก่า - ไว้สำหรับ backward compatibility)
 * @deprecated ใช้ sortLocationsByFIFO แทน
 */
export function sortLocationsByZone(locations: PickingLocation[]): PickingLocation[] {
  return sortLocationsByFIFO(locations); // ใช้ FIFO แทน
}

/**
 * คำนวณ Picking Plan สำหรับแต่ละสินค้า
 * ใช้ FEFO (First Expired First Out) - หยิบจาก MFD เก่าก่อน
 */
export function calculatePickingPlan(
  productNeed: ProductNeed,
  inventoryLocations: InventoryLocation[]
): PickingPlan {
  const { productCode, productName, quantity: totalNeeded } = productNeed;

  // กรองเฉพาะ inventory ที่ตรงกับสินค้า (EXACT MATCH)
  const matchingInventory = inventoryLocations.filter(inv => {
    // ตรวจสอบ SKU ต้องตรงทุกตัวอักษร (case-insensitive)
    const skuMatch = inv.sku && inv.sku.toLowerCase() === productCode.toLowerCase();
    return skuMatch;
  });

  if (matchingInventory.length === 0) {
    return {
      productCode,
      productName,
      totalNeeded,
      totalAvailable: 0,
      status: 'not_found',
      percentage: 0,
      locations: []
    };
  }

  // สร้าง PickingLocations และเรียงตามโซน
  const pickingLocations: PickingLocation[] = matchingInventory
    .map(inv => {
      const locationParsed = parseLocation(inv.location);
      if (!locationParsed) return null;

      // คำนวณจำนวนที่มีอยู่ในหน่วยฐาน (ชิ้น) โดยแปลงจากลัง/กล่อง
      // Formula: (L1_qty * L1_rate) + (L2_qty * L2_rate) + L3_qty
      const available = calculateTotalBaseQuantity({
        unit_level1_quantity: inv.unit_level1_quantity || 0,
        unit_level1_rate: inv.unit_level1_rate || 0,
        unit_level2_quantity: inv.unit_level2_quantity || 0,
        unit_level2_rate: inv.unit_level2_rate || 0,
        unit_level3_quantity: inv.unit_level3_quantity || 0
      });

      return {
        location: inv.location,
        normalizedLocation: normalizeLocation(inv.location),
        zone: locationParsed.zone,
        position: locationParsed.position,
        level: locationParsed.level,
        available,
        needed: 0, // จะคำนวณด้านล่าง
        toPick: 0,
        remaining: available,
        isCompleted: false,
        inventoryId: inv.id,
        // FIFO Support
        lot: inv.lot || undefined,
        mfd: inv.mfd || undefined,
        createdAt: inv.created_at || undefined
      } as PickingLocation;
    })
    .filter((loc): loc is PickingLocation => loc !== null);

  // เรียงตาม FIFO (วันที่รับเข้าก่อน)
  const sortedLocations = sortLocationsByFIFO(pickingLocations);

  // คำนวณจำนวนที่ต้องหยิบจากแต่ละ Location (FIFO)
  let remainingNeed = totalNeeded;
  let totalAvailable = 0;

  sortedLocations.forEach(location => {
    totalAvailable += location.available;

    if (remainingNeed > 0) {
      const toPick = Math.min(location.available, remainingNeed);
      location.toPick = toPick;
      location.needed = toPick;
      location.remaining = location.available - toPick;
      remainingNeed -= toPick;
      location.isCompleted = toPick > 0;
    }
  });

  // กรองเฉพาะ Location ที่ต้องหยิบ
  const activeLocations = sortedLocations.filter(loc => loc.toPick > 0);

  // คำนวณสถานะ
  const status: 'sufficient' | 'insufficient' = totalAvailable >= totalNeeded ? 'sufficient' : 'insufficient';
  const percentage = totalAvailable > 0 ? Math.min((totalAvailable / totalNeeded) * 100, 100) : 0;

  return {
    productCode,
    productName,
    totalNeeded,
    totalAvailable,
    status,
    percentage,
    locations: activeLocations
  };
}

/**
 * สร้าง Picking Route (เส้นทางการหยิบ) สำหรับพนักงานคลัง
 * เรียงตามลำดับ Location ที่ต้องเดินผ่าน
 */
export function generatePickingRoute(pickingPlans: PickingPlan[]): PickingRoute[] {
  const routes: PickingRoute[] = [];
  let sequence = 1;

  // รวม Locations จากทุก Products
  const allLocations: Array<{
    location: PickingLocation;
    productCode: string;
    productName: string;
  }> = [];

  pickingPlans.forEach(plan => {
    plan.locations.forEach(location => {
      allLocations.push({
        location,
        productCode: plan.productCode,
        productName: plan.productName
      });
    });
  });

  // เรียงตามโซน (A → B → C)
  allLocations.sort((a, b) => {
    const aLoc = a.location;
    const bLoc = b.location;

    if (aLoc.zone !== bLoc.zone) {
      return aLoc.zone.localeCompare(bLoc.zone);
    }
    if (aLoc.position !== bLoc.position) {
      return aLoc.position - bLoc.position;
    }
    return aLoc.level - bLoc.level;
  });

  // สร้าง Routes
  allLocations.forEach(({ location, productCode, productName }) => {
    routes.push({
      sequence: sequence++,
      location: location.location,
      normalizedLocation: location.normalizedLocation,
      zone: location.zone,
      productCode,
      productName,
      quantity: location.toPick,
      isCompleted: false
    });
  });

  return routes;
}

/**
 * สร้าง Picking Plans สำหรับหลายสินค้าพร้อมกัน
 */
export function generateBulkPickingPlans(
  productNeeds: ProductNeed[],
  allInventoryLocations: InventoryLocation[]
): {
  pickingPlans: PickingPlan[];
  pickingRoute: PickingRoute[];
  summary: {
    totalProducts: number;
    sufficientProducts: number;
    insufficientProducts: number;
    notFoundProducts: number;
    totalLocations: number;
  };
} {
  const pickingPlans = productNeeds.map(need =>
    calculatePickingPlan(need, allInventoryLocations)
  );

  const pickingRoute = generatePickingRoute(pickingPlans);

  const summary = {
    totalProducts: pickingPlans.length,
    sufficientProducts: pickingPlans.filter(p => p.status === 'sufficient').length,
    insufficientProducts: pickingPlans.filter(p => p.status === 'insufficient').length,
    notFoundProducts: pickingPlans.filter(p => p.status === 'not_found').length,
    totalLocations: pickingRoute.length
  };

  return {
    pickingPlans,
    pickingRoute,
    summary
  };
}
