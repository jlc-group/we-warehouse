/**
 * Stock Reservation Service
 * บริการจัดการการจองสต็อก (Reserved Stock System)
 *
 * Features:
 * - สร้าง/ยกเลิก/ยืนยัน reservations
 * - รองรับ multi-level units
 * - Transaction-safe operations
 * - Audit trail
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  StockReservation,
  CreateReservationParams,
  ReserveStockResult,
  BulkReservationParams,
  BulkReservationResult,
  CancelReservationParams,
  FulfillReservationParams,
  AvailableStockInfo,
  ReservationFilters,
  ReservationWithProduct,
  ReservationSummary,
  MultiLevelQuantity,
} from '@/types/reservation';

export class StockReservationService {
  /**
   * สร้าง Reservation ใหม่ (Transaction-safe)
   */
  static async createReservation(
    params: CreateReservationParams
  ): Promise<ReserveStockResult> {
    try {
      // ใช้ Function ที่เป็น Transaction-safe
      const { data, error } = await supabase.rpc('reserve_stock_safe', {
        p_inventory_item_id: params.inventory_item_id,
        p_fulfillment_item_id: params.fulfillment_item_id || null,
        p_warehouse_code: params.warehouse_code,
        p_location: params.location,
        p_level1_qty: params.quantities.level1_quantity,
        p_level2_qty: params.quantities.level2_quantity,
        p_level3_qty: params.quantities.level3_quantity,
        p_total_qty: params.quantities.total_quantity,
        p_reserved_by: params.reserved_by,
        p_notes: params.notes || null,
      });

      if (error) {
        console.error('Error creating reservation:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Fetch created reservation
      const { data: reservation } = await supabase
        .from('stock_reservations')
        .select('*')
        .eq('id', data)
        .single();

      return {
        success: true,
        reservation_id: data,
        reservation: reservation || undefined,
      };
    } catch (error: any) {
      console.error('Exception in createReservation:', error);
      return {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการจองสต็อก',
      };
    }
  }

  /**
   * จองสต็อกแบบ Bulk (หลาย locations)
   */
  static async createBulkReservations(
    params: BulkReservationParams
  ): Promise<BulkReservationResult> {
    const reservations: StockReservation[] = [];
    const failed_items: BulkReservationResult['failed_items'] = [];
    let total_reserved = 0;

    for (const item of params.items) {
      const result = await this.createReservation({
        inventory_item_id: item.inventory_item_id,
        fulfillment_item_id: params.fulfillment_item_id,
        warehouse_code: params.warehouse_code,
        location: item.location,
        quantities: item.quantities,
        reserved_by: params.reserved_by,
        notes: params.notes,
      });

      if (result.success && result.reservation) {
        reservations.push(result.reservation);
        total_reserved += item.quantities.total_quantity;
      } else {
        failed_items.push({
          inventory_item_id: item.inventory_item_id,
          location: item.location,
          error: result.error || 'Unknown error',
        });
      }
    }

    return {
      success: failed_items.length === 0,
      reservations,
      failed_items: failed_items.length > 0 ? failed_items : undefined,
      total_reserved,
    };
  }

  /**
   * ยกเลิก Reservation
   */
  static async cancelReservation(
    params: CancelReservationParams
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('cancel_reservation', {
        p_reservation_id: params.reservation_id,
        p_cancelled_by: params.cancelled_by,
      });

      if (error) {
        console.error('Error cancelling reservation:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Update notes if provided
      if (params.reason) {
        await supabase
          .from('stock_reservations')
          .update({ notes: params.reason })
          .eq('id', params.reservation_id);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Exception in cancelReservation:', error);
      return {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการยกเลิกการจอง',
      };
    }
  }

  /**
   * ยืนยัน Reservation และหักสต็อกจริง
   */
  static async fulfillReservation(
    params: FulfillReservationParams
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('fulfill_reservation', {
        p_reservation_id: params.reservation_id,
        p_fulfilled_by: params.fulfilled_by,
      });

      if (error) {
        console.error('Error fulfilling reservation:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      // Update notes if provided
      if (params.notes) {
        await supabase
          .from('stock_reservations')
          .update({ notes: params.notes })
          .eq('id', params.reservation_id);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Exception in fulfillReservation:', error);
      return {
        success: false,
        error: error.message || 'เกิดข้อผิดพลาดในการยืนยันการจัดส่ง',
      };
    }
  }

  /**
   * ยืนยันการจัดส่ง Bulk (หลาย reservations)
   */
  static async fulfillBulkReservations(
    reservationIds: string[],
    fulfilledBy: string
  ): Promise<{ success: boolean; fulfilled: number; failed: number; errors?: string[] }> {
    let fulfilled = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const reservationId of reservationIds) {
      const result = await this.fulfillReservation({
        reservation_id: reservationId,
        fulfilled_by: fulfilledBy,
      });

      if (result.success) {
        fulfilled++;
      } else {
        failed++;
        if (result.error) {
          errors.push(`${reservationId}: ${result.error}`);
        }
      }
    }

    return {
      success: failed === 0,
      fulfilled,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * ดึงข้อมูล Reservation ตาม ID
   */
  static async getReservation(reservationId: string): Promise<StockReservation | null> {
    try {
      const { data, error } = await supabase
        .from('stock_reservations')
        .select('*')
        .eq('id', reservationId)
        .single();

      if (error) {
        console.error('Error fetching reservation:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception in getReservation:', error);
      return null;
    }
  }

  /**
   * ดึง Reservations ตาม Fulfillment Item
   */
  static async getReservationsByFulfillmentItem(
    fulfillmentItemId: string
  ): Promise<StockReservation[]> {
    try {
      const { data, error } = await supabase
        .from('stock_reservations')
        .select('*')
        .eq('fulfillment_item_id', fulfillmentItemId)
        .order('reserved_at', { ascending: false });

      if (error) {
        console.error('Error fetching reservations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getReservationsByFulfillmentItem:', error);
      return [];
    }
  }

  /**
   * ดึง Active Reservations ของ Inventory Item
   */
  static async getActiveReservations(inventoryItemId: string): Promise<StockReservation[]> {
    try {
      const { data, error } = await supabase
        .from('stock_reservations')
        .select('*')
        .eq('inventory_item_id', inventoryItemId)
        .eq('status', 'active')
        .order('reserved_at', { ascending: false });

      if (error) {
        console.error('Error fetching active reservations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getActiveReservations:', error);
      return [];
    }
  }

  /**
   * ดึงข้อมูล Available Stock (real-time calculation)
   */
  static async getAvailableStock(inventoryItemId: string): Promise<AvailableStockInfo | null> {
    try {
      const { data, error } = await supabase
        .from('inventory_available')
        .select('*')
        .eq('id', inventoryItemId)
        .single();

      if (error) {
        console.error('Error fetching available stock:', error);
        return null;
      }

      return {
        inventory_item_id: data.id,
        product_name: data.product_name,
        location: data.location,
        warehouse_code: data.warehouse_code,

        total_quantity: data.quantity,
        reserved_quantity: data.reserved_quantity,
        available_quantity: data.available_quantity,

        total_level1: data.unit_level1_quantity || 0,
        reserved_level1: data.reserved_level1_quantity || 0,
        available_level1: data.available_level1_quantity || 0,

        total_level2: data.unit_level2_quantity || 0,
        reserved_level2: data.reserved_level2_quantity || 0,
        available_level2: data.available_level2_quantity || 0,

        total_level3: data.unit_level3_quantity || 0,
        reserved_level3: data.reserved_level3_quantity || 0,
        available_level3: data.available_level3_quantity || 0,

        unit_level1_name: data.unit_level1_name,
        unit_level2_name: data.unit_level2_name,
        unit_level3_name: data.unit_level3_name,

        active_reservation_count: data.active_reservation_count || 0,
        total_reservations: data.total_reservations || 0,

        is_out_of_stock: data.is_out_of_stock || false,
        is_low_stock: data.is_low_stock || false,
      };
    } catch (error) {
      console.error('Exception in getAvailableStock:', error);
      return null;
    }
  }

  /**
   * Query Reservations พร้อม Filters
   */
  static async queryReservations(
    filters: ReservationFilters
  ): Promise<ReservationWithProduct[]> {
    try {
      let query = supabase
        .from('reservation_history')
        .select('*');

      if (filters.warehouse_code) {
        query = query.eq('warehouse_code', filters.warehouse_code);
      }
      if (filters.location) {
        query = query.eq('location', filters.location);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.reservation_type) {
        query = query.eq('reservation_type', filters.reservation_type);
      }
      if (filters.fulfillment_item_id) {
        query = query.eq('fulfillment_item_id', filters.fulfillment_item_id);
      }
      if (filters.reserved_by) {
        query = query.eq('reserved_by', filters.reserved_by);
      }
      if (filters.date_from) {
        query = query.gte('reserved_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('reserved_at', filters.date_to);
      }

      query = query.order('reserved_at', { ascending: false }).limit(100);

      const { data, error } = await query;

      if (error) {
        console.error('Error querying reservations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in queryReservations:', error);
      return [];
    }
  }

  /**
   * ดึงสรุปการจองแยกตาม Warehouse
   */
  static async getReservationSummaryByWarehouse(): Promise<ReservationSummary[]> {
    try {
      const { data, error } = await supabase
        .from('reservation_summary_by_warehouse')
        .select('*');

      if (error) {
        console.error('Error fetching reservation summary:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception in getReservationSummaryByWarehouse:', error);
      return [];
    }
  }

  /**
   * คำนวณ Total Reserved สำหรับ Fulfillment Task
   */
  static calculateTotalReserved(reservations: StockReservation[]): MultiLevelQuantity {
    return reservations
      .filter(r => r.status === 'active')
      .reduce(
        (acc, r) => ({
          level1_quantity: acc.level1_quantity + r.reserved_level1_quantity,
          level2_quantity: acc.level2_quantity + r.reserved_level2_quantity,
          level3_quantity: acc.level3_quantity + r.reserved_level3_quantity,
          total_quantity: acc.total_quantity + r.reserved_total_quantity,
        }),
        {
          level1_quantity: 0,
          level2_quantity: 0,
          level3_quantity: 0,
          total_quantity: 0,
        }
      );
  }

  /**
   * ตรวจสอบว่าสามารถจองได้หรือไม่
   */
  static async canReserve(
    inventoryItemId: string,
    requestedQuantity: number
  ): Promise<{ can_reserve: boolean; available: number; shortage?: number }> {
    const availableStock = await this.getAvailableStock(inventoryItemId);

    if (!availableStock) {
      return {
        can_reserve: false,
        available: 0,
        shortage: requestedQuantity,
      };
    }

    const can_reserve = availableStock.available_quantity >= requestedQuantity;
    const shortage = can_reserve ? 0 : requestedQuantity - availableStock.available_quantity;

    return {
      can_reserve,
      available: availableStock.available_quantity,
      shortage: shortage > 0 ? shortage : undefined,
    };
  }

  /**
   * Format Reservation สำหรับแสดงผล
   */
  static formatReservation(reservation: StockReservation): string {
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
}

// Export default
export default StockReservationService;
