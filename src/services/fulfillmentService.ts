// Fulfillment Service - Phase 3: Final Fulfillment and Stock Deduction
import { supabase } from '@/integrations/supabase/client';
import {
  FulfillmentOrder,
  FulfillmentOrderInsert,
  FulfillmentOrderUpdate,
  FulfillmentOrderWithDetails,
  FulfillmentStatus,
  WarehouseAssignmentWithDetails
} from '@/integrations/supabase/types-3phase';
import { toast } from '@/components/ui/sonner';

export class FulfillmentService {

  // =====================================================
  // Fulfillment Order Management
  // =====================================================

  /**
   * Create fulfillment order from ready assignments
   */
  static async createFulfillmentOrder(
    salesBillId: string,
    fulfillmentData: Partial<FulfillmentOrderInsert>
  ): Promise<FulfillmentOrder> {
    console.log('📦 Creating fulfillment order for sales bill:', salesBillId);

    // Validate all assignments are ready to ship
    const assignments = await this.getReadyAssignments(salesBillId);
    if (assignments.length === 0) {
      throw new Error('No assignments ready for fulfillment');
    }

    const { data, error } = await supabase
      .from('fulfillment_orders')
      .insert({
        sales_bill_id: salesBillId,
        status: 'preparing',
        ...fulfillmentData
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating fulfillment order:', error);
      throw error;
    }

    console.log('✅ Fulfillment order created:', data.fulfillment_number);
    toast.success('สร้างใบจัดส่งสำเร็จ', {
      description: `สร้างใบจัดส่ง ${data.fulfillment_number}`
    });

    return data;
  }

  /**
   * Get fulfillment order with full details
   */
  static async getFulfillmentOrderById(fulfillmentId: string): Promise<FulfillmentOrderWithDetails | null> {
    console.log('🔍 Fetching fulfillment order:', fulfillmentId);

    const { data, error } = await supabase
      .from('fulfillment_orders')
      .select(`
        *,
        sales_bill:sales_bills(
          id,
          bill_number,
          customer:customers(
            id,
            customer_name,
            customer_code,
            phone,
            email
          ),
          sales_bill_items(*)
        )
      `)
      .eq('id', fulfillmentId)
      .single();

    if (error) {
      console.error('❌ Error fetching fulfillment order:', error);
      throw error;
    }

    console.log('✅ Fulfillment order fetched');
    return data;
  }

  /**
   * Get all fulfillment orders with optional status filter
   */
  static async getFulfillmentOrders(status?: FulfillmentStatus): Promise<FulfillmentOrderWithDetails[]> {
    console.log('🔍 Fetching fulfillment orders', status ? `with status: ${status}` : '');

    let query = supabase
      .from('fulfillment_orders')
      .select(`
        *,
        sales_bill:sales_bills(
          id,
          bill_number,
          customer:customers(
            id,
            customer_name,
            customer_code,
            phone,
            email
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching fulfillment orders:', error);
      throw error;
    }

    console.log(`✅ Found ${data.length} fulfillment orders`);
    return data;
  }

  /**
   * Update fulfillment order
   */
  static async updateFulfillmentOrder(
    fulfillmentId: string,
    updates: FulfillmentOrderUpdate
  ): Promise<FulfillmentOrder> {
    console.log('📝 Updating fulfillment order:', fulfillmentId, updates);

    const { data, error } = await supabase
      .from('fulfillment_orders')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', fulfillmentId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating fulfillment order:', error);
      throw error;
    }

    console.log('✅ Fulfillment order updated');
    return data;
  }

  // =====================================================
  // Status Management
  // =====================================================

  /**
   * Mark fulfillment order as ready to ship
   */
  static async markReadyToShip(
    fulfillmentId: string,
    preparedBy: string,
    carrier?: string,
    estimatedDeliveryDate?: string
  ): Promise<void> {
    console.log('🚚 Marking fulfillment order as ready to ship:', fulfillmentId);

    await this.updateFulfillmentOrder(fulfillmentId, {
      status: 'ready_to_ship',
      prepared_by: preparedBy,
      prepared_at: new Date().toISOString(),
      carrier,
      estimated_delivery_date: estimatedDeliveryDate
    });

    toast.success('พร้อมจัดส่ง', {
      description: 'ใบจัดส่งพร้อมสำหรับการจัดส่ง'
    });
  }

  /**
   * Ship fulfillment order and deduct stock
   */
  static async shipFulfillmentOrder(
    fulfillmentId: string,
    shippedBy: string,
    trackingNumber?: string,
    shippingCost?: number
  ): Promise<void> {
    console.log('📦 Shipping fulfillment order and deducting stock:', fulfillmentId);

    try {
      // Start transaction by getting fulfillment details
      const fulfillmentOrder = await this.getFulfillmentOrderById(fulfillmentId);
      if (!fulfillmentOrder) {
        throw new Error('Fulfillment order not found');
      }

      if (fulfillmentOrder.status !== 'ready_to_ship') {
        throw new Error('Fulfillment order must be ready to ship');
      }

      // Get warehouse assignments for this sales bill
      const assignments = await this.getAssignmentsForSalesBill(fulfillmentOrder.sales_bill_id);

      // Deduct actual stock for each assignment
      for (const assignment of assignments) {
        await this.deductActualStock(assignment);
      }

      // Update fulfillment order status
      await this.updateFulfillmentOrder(fulfillmentId, {
        status: 'shipped',
        shipped_by: shippedBy,
        shipped_at: new Date().toISOString(),
        stock_deducted_at: new Date().toISOString(),
        stock_deducted_by: shippedBy,
        tracking_number: trackingNumber,
        shipping_cost: shippingCost
      });

      // Update all warehouse assignments to shipped
      await this.updateAssignmentsToShipped(fulfillmentOrder.sales_bill_id);

      // Update sales bill status to shipped
      await this.updateSalesBillStatus(fulfillmentOrder.sales_bill_id, 'shipped');

      console.log('✅ Fulfillment order shipped and stock deducted');
      toast.success('จัดส่งสำเร็จ', {
        description: `จัดส่ง ${fulfillmentOrder.fulfillment_number} เรียบร้อย`
      });

    } catch (error) {
      console.error('❌ Error shipping fulfillment order:', error);
      toast.error('ไม่สามารถจัดส่งได้', {
        description: error instanceof Error ? error.message : 'เกิดข้อผิดพลาด'
      });
      throw error;
    }
  }

  /**
   * Mark fulfillment order as delivered
   */
  static async markDelivered(
    fulfillmentId: string,
    deliveryDate?: string
  ): Promise<void> {
    console.log('✅ Marking fulfillment order as delivered:', fulfillmentId);

    const fulfillmentOrder = await this.getFulfillmentOrderById(fulfillmentId);
    if (!fulfillmentOrder) {
      throw new Error('Fulfillment order not found');
    }

    await this.updateFulfillmentOrder(fulfillmentId, {
      status: 'delivered',
      actual_delivery_date: deliveryDate || new Date().toISOString()
    });

    // Update sales bill to delivered
    await this.updateSalesBillStatus(fulfillmentOrder.sales_bill_id, 'delivered');

    toast.success('จัดส่งครบถ้วน', {
      description: `${fulfillmentOrder.fulfillment_number} ส่งมอบเรียบร้อย`
    });
  }

  // =====================================================
  // Stock Deduction Operations
  // =====================================================

  /**
   * Deduct actual stock from inventory for an assignment
   */
  private static async deductActualStock(assignment: WarehouseAssignmentWithDetails): Promise<void> {
    console.log('📉 Deducting actual stock for assignment:', assignment.id);

    // Use picked quantities if available, otherwise use assigned quantities
    const deductLevel1 = assignment.picked_quantity_level1 || assignment.assigned_quantity_level1 || 0;
    const deductLevel2 = assignment.picked_quantity_level2 || assignment.assigned_quantity_level2 || 0;
    const deductLevel3 = assignment.picked_quantity_level3 || assignment.assigned_quantity_level3 || 0;

    // Deduct from both actual quantities and reserved quantities
    const { error } = await supabase
      .from('inventory_items')
      .update({
        quantity_level1: supabase.raw(`GREATEST(quantity_level1 - ${deductLevel1}, 0)`),
        quantity_level2: supabase.raw(`GREATEST(quantity_level2 - ${deductLevel2}, 0)`),
        quantity_level3: supabase.raw(`GREATEST(quantity_level3 - ${deductLevel3}, 0)`),
        reserved_level1_quantity: supabase.raw(`GREATEST(COALESCE(reserved_level1_quantity, 0) - ${assignment.assigned_quantity_level1 || 0}, 0)`),
        reserved_level2_quantity: supabase.raw(`GREATEST(COALESCE(reserved_level2_quantity, 0) - ${assignment.assigned_quantity_level2 || 0}, 0)`),
        reserved_level3_quantity: supabase.raw(`GREATEST(COALESCE(reserved_level3_quantity, 0) - ${assignment.assigned_quantity_level3 || 0}, 0)`),
        updated_at: new Date().toISOString()
      })
      .eq('id', assignment.inventory_item_id);

    if (error) {
      console.error('❌ Error deducting stock:', error);
      throw error;
    }

    console.log('✅ Stock deducted for assignment:', assignment.id);
  }

  // =====================================================
  // Analytics and Reporting
  // =====================================================

  /**
   * Get fulfillment statistics
   */
  static async getFulfillmentStatistics(dateFrom?: string, dateTo?: string) {
    console.log('📊 Fetching fulfillment statistics');

    let query = supabase
      .from('fulfillment_orders')
      .select('status, shipping_cost, created_at, shipped_at, actual_delivery_date');

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching fulfillment statistics:', error);
      throw error;
    }

    // Calculate statistics
    const totalFulfillments = data.length;
    const totalShippingCost = data.reduce((sum, order) => sum + (order.shipping_cost || 0), 0);

    const statusCounts = data.reduce((acc: Record<string, number>, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});

    // Calculate average fulfillment time (from creation to shipment)
    const fulfillmentTimes = data
      .filter(order => order.shipped_at && order.created_at)
      .map(order => {
        const createdAt = new Date(order.created_at);
        const shippedAt = new Date(order.shipped_at!);
        return shippedAt.getTime() - createdAt.getTime();
      });

    const avgFulfillmentTime = fulfillmentTimes.length > 0
      ? fulfillmentTimes.reduce((sum, time) => sum + time, 0) / fulfillmentTimes.length / (1000 * 60 * 60) // in hours
      : 0;

    // Calculate delivery performance
    const deliveredOrders = data.filter(order => order.actual_delivery_date);
    const onTimeDeliveries = deliveredOrders.filter(order => {
      // Assuming on-time if delivered within estimated date (simplified logic)
      return true; // This would need more complex date comparison logic
    });

    return {
      totalFulfillments,
      totalShippingCost,
      statusCounts,
      avgFulfillmentTimeHours: Math.round(avgFulfillmentTime * 100) / 100,
      deliveryRate: deliveredOrders.length,
      onTimeDeliveryRate: totalFulfillments > 0
        ? Math.round((onTimeDeliveries.length / totalFulfillments) * 100)
        : 0
    };
  }

  /**
   * Get shipping performance metrics
   */
  static async getShippingPerformance() {
    console.log('📊 Fetching shipping performance metrics');

    const { data, error } = await supabase
      .from('fulfillment_orders')
      .select('status, created_at, prepared_at, shipped_at, actual_delivery_date, carrier')
      .not('shipped_at', 'is', null);

    if (error) {
      console.error('❌ Error fetching shipping performance:', error);
      throw error;
    }

    // Group by carrier
    const carrierPerformance = data.reduce((acc: Record<string, any>, order) => {
      const carrier = order.carrier || 'Unknown';
      if (!acc[carrier]) {
        acc[carrier] = {
          totalOrders: 0,
          delivered: 0,
          avgDeliveryTime: 0,
          deliveryTimes: []
        };
      }

      acc[carrier].totalOrders++;

      if (order.actual_delivery_date) {
        acc[carrier].delivered++;

        const shippedAt = new Date(order.shipped_at!);
        const deliveredAt = new Date(order.actual_delivery_date);
        const deliveryTime = deliveredAt.getTime() - shippedAt.getTime();
        acc[carrier].deliveryTimes.push(deliveryTime);
      }

      return acc;
    }, {});

    // Calculate average delivery times
    Object.keys(carrierPerformance).forEach(carrier => {
      const times = carrierPerformance[carrier].deliveryTimes;
      if (times.length > 0) {
        carrierPerformance[carrier].avgDeliveryTime =
          times.reduce((sum: number, time: number) => sum + time, 0) / times.length / (1000 * 60 * 60 * 24); // in days
      }
      delete carrierPerformance[carrier].deliveryTimes; // Clean up
    });

    return carrierPerformance;
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Get ready assignments for a sales bill
   */
  private static async getReadyAssignments(salesBillId: string): Promise<WarehouseAssignmentWithDetails[]> {
    console.log('🔍 Getting ready assignments for sales bill:', salesBillId);

    const { data, error } = await supabase
      .from('warehouse_assignments')
      .select(`
        *,
        sales_bill:sales_bills(*),
        sales_bill_item:sales_bill_items(*),
        inventory_item:inventory_items(*)
      `)
      .eq('sales_bill_id', salesBillId)
      .eq('assignment_status', 'ready_to_ship');

    if (error) {
      console.error('❌ Error getting ready assignments:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get all assignments for a sales bill
   */
  private static async getAssignmentsForSalesBill(salesBillId: string): Promise<WarehouseAssignmentWithDetails[]> {
    console.log('🔍 Getting all assignments for sales bill:', salesBillId);

    const { data, error } = await supabase
      .from('warehouse_assignments')
      .select(`
        *,
        sales_bill:sales_bills(*),
        sales_bill_item:sales_bill_items(*),
        inventory_item:inventory_items(*)
      `)
      .eq('sales_bill_id', salesBillId);

    if (error) {
      console.error('❌ Error getting assignments:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update all assignments to shipped status
   */
  private static async updateAssignmentsToShipped(salesBillId: string): Promise<void> {
    console.log('📝 Updating assignments to shipped status:', salesBillId);

    const { error } = await supabase
      .from('warehouse_assignments')
      .update({
        assignment_status: 'shipped',
        updated_at: new Date().toISOString()
      })
      .eq('sales_bill_id', salesBillId);

    if (error) {
      console.error('❌ Error updating assignments to shipped:', error);
      throw error;
    }

    console.log('✅ All assignments updated to shipped');
  }

  /**
   * Update sales bill status
   */
  private static async updateSalesBillStatus(
    salesBillId: string,
    status: 'shipped' | 'delivered'
  ): Promise<void> {
    console.log('📝 Updating sales bill status:', salesBillId, status);

    const { error } = await supabase
      .from('sales_bills')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', salesBillId);

    if (error) {
      console.error('❌ Error updating sales bill status:', error);
      throw error;
    }

    console.log('✅ Sales bill status updated');
  }

  /**
   * Get pending fulfillment orders (ready to ship but not yet shipped)
   */
  static async getPendingFulfillments(): Promise<FulfillmentOrderWithDetails[]> {
    return this.getFulfillmentOrders('ready_to_ship');
  }

  /**
   * Get active shipments (shipped but not yet delivered)
   */
  static async getActiveShipments(): Promise<FulfillmentOrderWithDetails[]> {
    return this.getFulfillmentOrders('shipped');
  }

  /**
   * Cancel fulfillment order
   */
  static async cancelFulfillmentOrder(
    fulfillmentId: string,
    reason?: string
  ): Promise<void> {
    console.log('❌ Cancelling fulfillment order:', fulfillmentId, reason);

    const fulfillmentOrder = await this.getFulfillmentOrderById(fulfillmentId);
    if (!fulfillmentOrder) {
      throw new Error('Fulfillment order not found');
    }

    if (fulfillmentOrder.status === 'shipped' || fulfillmentOrder.status === 'delivered') {
      throw new Error('Cannot cancel shipped or delivered orders');
    }

    // Delete fulfillment order
    const { error } = await supabase
      .from('fulfillment_orders')
      .delete()
      .eq('id', fulfillmentId);

    if (error) {
      console.error('❌ Error cancelling fulfillment order:', error);
      throw error;
    }

    // Reset assignments status back to ready_to_ship
    await supabase
      .from('warehouse_assignments')
      .update({
        assignment_status: 'ready_to_ship',
        updated_at: new Date().toISOString()
      })
      .eq('sales_bill_id', fulfillmentOrder.sales_bill_id);

    // Reset sales bill status
    await this.updateSalesBillStatus(fulfillmentOrder.sales_bill_id, 'fulfilled');

    console.log('✅ Fulfillment order cancelled');
    toast.success('ยกเลิกใบจัดส่ง', {
      description: reason || 'ยกเลิกใบจัดส่งเรียบร้อย'
    });
  }
}