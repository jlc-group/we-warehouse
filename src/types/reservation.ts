/**
 * Stock Reservation Types
 * สำหรับระบบจองสต็อก (Reserved Stock System)
 */

// ============================================================================
// Enums & Constants
// ============================================================================

export type ReservationStatus = 'active' | 'fulfilled' | 'cancelled';
export type ReservationType = 'fulfillment' | 'transfer' | 'adjustment';

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  active: 'กำลังจอง',
  fulfilled: 'จัดส่งแล้ว',
  cancelled: 'ยกเลิกแล้ว',
};

export const RESERVATION_TYPE_LABELS: Record<ReservationType, string> = {
  fulfillment: 'จัดสินค้า',
  transfer: 'โอนคลัง',
  adjustment: 'ปรับปรุง',
};

// ============================================================================
// Multi-Level Quantity Interface
// ============================================================================

export interface MultiLevelQuantity {
  level1_quantity: number; // ลัง
  level2_quantity: number; // กล่อง
  level3_quantity: number; // ชิ้น
  total_quantity: number;  // รวมเป็น base unit
  level1_name?: string;
  level2_name?: string;
  level3_name?: string;
}

// ============================================================================
// Stock Reservation Record
// ============================================================================

export interface StockReservation {
  id: string;

  // Reference keys
  inventory_item_id: string;
  fulfillment_item_id?: string;
  warehouse_code: string;
  location: string;

  // Reserved quantities (multi-level)
  reserved_level1_quantity: number;
  reserved_level2_quantity: number;
  reserved_level3_quantity: number;
  reserved_total_quantity: number;

  // Unit names
  unit_level1_name: string;
  unit_level2_name: string;
  unit_level3_name: string;

  // Status
  status: ReservationStatus;
  reservation_type: ReservationType;

  // Timestamps & Audit
  reserved_at: string;
  reserved_by?: string;
  fulfilled_at?: string;
  fulfilled_by?: string;
  cancelled_at?: string;
  cancelled_by?: string;

  // Metadata
  notes?: string;
  metadata?: Record<string, any>;

  // Standard
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Reservation with Product Info (from View)
// ============================================================================

export interface ReservationWithProduct extends StockReservation {
  // Product info
  product_name: string;
  product_code?: string;
  sku?: string;

  // PO info (if fulfillment)
  po_number?: string;
  customer_code?: string;

  // User names
  reserved_by_name?: string;
  fulfilled_by_name?: string;
  cancelled_by_name?: string;

  // Duration
  duration_hours?: number;
}

// ============================================================================
// Available Stock Info
// ============================================================================

export interface AvailableStockInfo {
  inventory_item_id: string;
  product_name: string;
  location: string;
  warehouse_code?: string;

  // Total quantities
  total_quantity: number;
  reserved_quantity: number;
  available_quantity: number;

  // Multi-level breakdown
  total_level1: number;
  reserved_level1: number;
  available_level1: number;

  total_level2: number;
  reserved_level2: number;
  available_level2: number;

  total_level3: number;
  reserved_level3: number;
  available_level3: number;

  // Unit names
  unit_level1_name?: string;
  unit_level2_name?: string;
  unit_level3_name?: string;

  // Reservation summary
  active_reservation_count: number;
  total_reservations: number;

  // Status flags
  is_out_of_stock: boolean;
  is_low_stock: boolean;
}

// ============================================================================
// Reservation Summary
// ============================================================================

export interface ReservationSummary {
  warehouse_code: string;
  warehouse_name: string;
  total_reservations: number;
  total_reserved_qty: number;
  products_reserved: number;
  active_reservations: number;
  fulfilled_reservations: number;
  cancelled_reservations: number;
}

// ============================================================================
// Create Reservation Params
// ============================================================================

export interface CreateReservationParams {
  inventory_item_id: string;
  fulfillment_item_id?: string;
  warehouse_code: string;
  location: string;

  // Quantities to reserve
  quantities: MultiLevelQuantity;

  // Audit
  reserved_by: string;
  notes?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Reserve Stock Result
// ============================================================================

export interface ReserveStockResult {
  success: boolean;
  reservation_id?: string;
  reservation?: StockReservation;
  available_before?: number;
  available_after?: number;
  error?: string;
}

// ============================================================================
// Bulk Reservation (for multiple locations)
// ============================================================================

export interface BulkReservationItem {
  inventory_item_id: string;
  location: string;
  quantities: MultiLevelQuantity;
}

export interface BulkReservationParams {
  fulfillment_item_id: string;
  warehouse_code: string;
  items: BulkReservationItem[];
  reserved_by: string;
  notes?: string;
}

export interface BulkReservationResult {
  success: boolean;
  reservations: StockReservation[];
  failed_items?: {
    inventory_item_id: string;
    location: string;
    error: string;
  }[];
  total_reserved: number;
}

// ============================================================================
// Cancel/Fulfill Params
// ============================================================================

export interface CancelReservationParams {
  reservation_id: string;
  cancelled_by: string;
  reason?: string;
}

export interface FulfillReservationParams {
  reservation_id: string;
  fulfilled_by: string;
  notes?: string;
}

// ============================================================================
// Query Filters
// ============================================================================

export interface ReservationFilters {
  warehouse_code?: string;
  location?: string;
  status?: ReservationStatus;
  reservation_type?: ReservationType;
  fulfillment_item_id?: string;
  date_from?: string;
  date_to?: string;
  reserved_by?: string;
}

// ============================================================================
// Reservation Analytics
// ============================================================================

export interface ReservationAnalytics {
  total_active: number;
  total_fulfilled: number;
  total_cancelled: number;
  total_reserved_qty: number;
  average_duration_hours: number;
  top_products: Array<{
    product_name: string;
    total_reservations: number;
    total_qty: number;
  }>;
  by_warehouse: ReservationSummary[];
}

// ============================================================================
// Inventory with Reservation Info (Extended)
// ============================================================================

export interface InventoryItemWithReservation {
  id: string;
  product_name: string;
  product_code?: string;
  sku?: string;
  location: string;
  lot?: string;
  mfd?: Date;

  // Total quantities
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;

  // Multi-level quantities
  unit_level1_quantity: number;
  reserved_level1_quantity: number;
  available_level1_quantity: number;
  unit_level1_name?: string;
  unit_level1_rate?: number;

  unit_level2_quantity: number;
  reserved_level2_quantity: number;
  available_level2_quantity: number;
  unit_level2_name?: string;
  unit_level2_rate?: number;

  unit_level3_quantity: number;
  reserved_level3_quantity: number;
  available_level3_quantity: number;
  unit_level3_name?: string;

  // Warehouse info
  warehouse_id?: string;
  warehouse_code?: string;
  warehouse_name?: string;

  // Reservation summary
  total_reservations: number;
  active_reservation_count: number;

  // Status
  is_deleted: boolean;
  is_out_of_stock: boolean;
  is_low_stock: boolean;

  // Metadata
  user_id?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Helper Type Guards
// ============================================================================

export function isActiveReservation(reservation: StockReservation): boolean {
  return reservation.status === 'active';
}

export function isFulfilledReservation(reservation: StockReservation): boolean {
  return reservation.status === 'fulfilled';
}

export function isCancelledReservation(reservation: StockReservation): boolean {
  return reservation.status === 'cancelled';
}

export function canCancelReservation(reservation: StockReservation): boolean {
  return reservation.status === 'active';
}

export function canFulfillReservation(reservation: StockReservation): boolean {
  return reservation.status === 'active';
}

// ============================================================================
// Utility Functions
// ============================================================================

export function calculateTotalQuantity(quantities: MultiLevelQuantity): number {
  return quantities.total_quantity;
}

export function formatReservationQuantity(
  reservation: StockReservation
): string {
  const parts: string[] = [];

  if (reservation.reserved_level1_quantity > 0) {
    parts.push(`${reservation.reserved_level1_quantity} ${reservation.unit_level1_name}`);
  }
  if (reservation.reserved_level2_quantity > 0) {
    parts.push(`${reservation.reserved_level2_quantity} ${reservation.unit_level2_name}`);
  }
  if (reservation.reserved_level3_quantity > 0) {
    parts.push(`${reservation.reserved_level3_quantity} ${reservation.unit_level3_name}`);
  }

  return parts.length > 0 ? parts.join(' + ') : `${reservation.reserved_total_quantity} หน่วย`;
}

export function getReservationDuration(reservation: StockReservation): number {
  const endTime = reservation.fulfilled_at || reservation.cancelled_at || new Date().toISOString();
  const startTime = new Date(reservation.reserved_at);
  const end = new Date(endTime);

  return (end.getTime() - startTime.getTime()) / (1000 * 60 * 60); // hours
}

export function getReservationStatusColor(status: ReservationStatus): string {
  switch (status) {
    case 'active':
      return 'bg-blue-100 text-blue-800';
    case 'fulfilled':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
