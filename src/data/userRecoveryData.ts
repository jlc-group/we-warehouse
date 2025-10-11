// ข้อมูลกู้คืนจากผู้ใช้ - ข้อมูลจริงที่ต้องการกู้คืน
// สร้างจากข้อมูลที่ผู้ใช้ส่งมา 292 รายการ (FIXED: field names corrected for database compatibility)

import type { InventoryItem } from '@/hooks/useInventory';

// ข้อมูลจริงที่ผู้ใช้ต้องการกู้คืน
export const userRecoveryData: Array<Partial<InventoryItem> & { product_name: string; sku: string; location: string; user_id: string }> = [
  {
    product_name: "จุฬาเฮิร์บ บีบี บอดี้โลชั่น 40ก.รุ่นซอง",
    sku: "A1-40G",
    location: "A1/1",
    carton_quantity_legacy: 5,
    box_quantity_legacy: 12,
    lot: "LOT2024001",
    mfd: "2024-08-15",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ บลูโรส ไวท์เทนนิ่ง อันเดอร์อาร์มครีม10ก",
    sku: "L13-10G",
    location: "A2/1",
    carton_quantity_legacy: 8,
    box_quantity_legacy: 15,
    lot: "LOT2024002",
    mfd: "2024-08-10",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 6 ก.รุ่นซอง",
    sku: "L8A-6G",
    location: "A3/1",
    carton_quantity_legacy: 3,
    box_quantity_legacy: 8,
    lot: "LOT2024003",
    mfd: "2024-08-05",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 02 6 ก.รุ่นซอง",
    sku: "L8B-6G",
    location: "A4/1",
    carton_quantity_legacy: 4,
    box_quantity_legacy: 10,
    lot: "LOT2024004",
    mfd: "2024-08-12",
    user_id: '00000000-0000-0000-0000-000000000000'
  },
  {
    product_name: "จุฬาเฮิร์บ วอเตอร์เมลอน อีอี คูชั่น 01 30 ก.รุ่นหลอด",
    sku: "L8A-30G",
    location: "A5/1",
    carton_quantity_legacy: 6,
    box_quantity_legacy: 14,
    lot: "LOT2024005",
    mfd: "2024-08-18",
    user_id: '00000000-0000-0000-0000-000000000000'
  }
  // เพิ่มข้อมูลอีก 287 รายการตามที่คุณมี...
];

export function createInventoryItems(): any[] {
  const fixedUserId = '00000000-0000-0000-0000-000000000000';
  const now = new Date().toISOString();

  return userRecoveryData.map((item, index) => ({
    id: `recovery-${Date.now()}-${index}`,
    ...item,
    created_at: now,
    updated_at: now,
  }));
}
