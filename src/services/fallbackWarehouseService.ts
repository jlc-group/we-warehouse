// Fallback Warehouse Service - Uses customer_orders when 3-phase tables don't exist
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FallbackSalesBill {
  id: string;
  order_number: string;
  customer_id: string;
  order_date: string;
  status: string;
  priority: 'normal' | 'high' | 'urgent';
  total_amount: number;
  customer?: {
    id: string;
    customer_name: string;
    customer_code: string;
    phone?: string;
    email?: string;
  };
  order_items?: FallbackOrderItem[];
}

export interface FallbackOrderItem {
  id: string;
  order_id: string;
  product_name: string;
  sku?: string;
  quantity_requested: number;
  picked_quantity?: number;
  shipped_quantity?: number;
  unit_price?: number;
  line_total?: number;
  notes?: string;
}

export interface FallbackWarehouseStats {
  pendingOrders: number;
  inProgress: number;
  completed: number;
  totalOrders: number;
}

export class FallbackWarehouseService {

  // =====================================================
  // Table Existence Check
  // =====================================================

  static async check3PhaseTablesExist(): Promise<boolean> {
    try {
      // Try to query sales_bills table to see if it exists
      const { error } = await supabase
        .from('sales_bills')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }

  // =====================================================
  // Fallback Queue Management
  // =====================================================

  /**
   * Get customer orders that need warehouse processing (fallback)
   */
  static async getFallbackOrdersQueue(): Promise<FallbackSalesBill[]> {
    console.log('📦 [FALLBACK] Fetching customer orders queue for warehouse');

    try {
      const { data, error } = await supabase
        .from('customer_orders')
        .select(`
          id,
          order_number,
          customer_id,
          order_date,
          status,
          priority,
          total_amount,
          customer:customers(
            id,
            customer_name,
            customer_code,
            phone,
            email
          ),
          order_items(
            id,
            order_id,
            product_name,
            sku,
            quantity_requested,
            picked_quantity,
            shipped_quantity,
            unit_price,
            notes
          )
        `)
        .in('status', ['confirmed', 'processing', 'ready'])
        .order('order_date', { ascending: true });

      if (error) {
        console.error('❌ [FALLBACK] Error fetching orders queue:', error);
        throw error;
      }

      console.log(`✅ [FALLBACK] Found ${data.length} orders in queue`);
      return data.map(order => ({
        ...order,
        priority: order.priority as 'normal' | 'high' | 'urgent' || 'normal',
        customer: Array.isArray(order.customer) ? order.customer[0] : order.customer,
        order_items: order.order_items || []
      }));

    } catch (error) {
      console.error('❌ [FALLBACK] Error in getFallbackOrdersQueue:', error);
      throw error;
    }
  }

  /**
   * Get warehouse statistics (fallback)
   */
  static async getFallbackWarehouseStats(): Promise<FallbackWarehouseStats> {
    console.log('📊 [FALLBACK] Fetching warehouse statistics');

    try {
      const { data, error } = await supabase
        .from('customer_orders')
        .select('status');

      if (error) {
        console.error('❌ [FALLBACK] Error fetching stats:', error);
        throw error;
      }

      const stats = data.reduce((acc, order) => {
        acc.totalOrders++;

        switch (order.status) {
          case 'confirmed':
          case 'pending':
            acc.pendingOrders++;
            break;
          case 'processing':
          case 'ready':
            acc.inProgress++;
            break;
          case 'shipped':
          case 'delivered':
            acc.completed++;
            break;
        }

        return acc;
      }, {
        pendingOrders: 0,
        inProgress: 0,
        completed: 0,
        totalOrders: 0
      });

      console.log('✅ [FALLBACK] Stats calculated:', stats);
      return stats;

    } catch (error) {
      console.error('❌ [FALLBACK] Error in getFallbackWarehouseStats:', error);
      throw error;
    }
  }

  // =====================================================
  // Fallback Operations
  // =====================================================

  /**
   * Update order status (fallback operation)
   */
  static async updateOrderStatus(orderId: string, status: string, notes?: string): Promise<void> {
    console.log('📝 [FALLBACK] Updating order status:', orderId, status);

    try {
      const { error } = await supabase
        .from('customer_orders')
        .update({
          status,
          updated_at: new Date().toISOString(),
          ...(notes && { internal_notes: notes })
        })
        .eq('id', orderId);

      if (error) {
        console.error('❌ [FALLBACK] Error updating order status:', error);
        throw error;
      }

      console.log('✅ [FALLBACK] Order status updated');
      toast.success('อัปเดตสถานะออร์เดอร์สำเร็จ', {
        description: `เปลี่ยนสถานะเป็น ${status}`
      });

    } catch (error) {
      console.error('❌ [FALLBACK] Error in updateOrderStatus:', error);
      throw error;
    }
  }

  /**
   * Update picked quantity for order item (fallback)
   */
  static async updatePickedQuantity(
    orderItemId: string,
    pickedQuantity: number,
    pickerId?: string,
    notes?: string
  ): Promise<void> {
    console.log('📦 [FALLBACK] Updating picked quantity:', orderItemId, pickedQuantity);

    try {
      const { error } = await supabase
        .from('order_items')
        .update({
          picked_quantity: pickedQuantity,
          updated_at: new Date().toISOString(),
          ...(notes && { notes })
        })
        .eq('id', orderItemId);

      if (error) {
        console.error('❌ [FALLBACK] Error updating picked quantity:', error);
        throw error;
      }

      console.log('✅ [FALLBACK] Picked quantity updated');
      toast.success('บันทึกการจัดเก็บสำเร็จ', {
        description: `จัดเก็บจำนวน ${pickedQuantity} หน่วย`
      });

    } catch (error) {
      console.error('❌ [FALLBACK] Error in updatePickedQuantity:', error);
      throw error;
    }
  }

  /**
   * Mark order as ready for shipping (fallback)
   */
  static async markOrderReadyForShipping(orderId: string, packedBy?: string): Promise<void> {
    console.log('🚚 [FALLBACK] Marking order ready for shipping:', orderId);

    try {
      await this.updateOrderStatus(orderId, 'ready',
        packedBy ? `Packed by: ${packedBy}` : 'Ready for shipping'
      );

      toast.success('พร้อมจัดส่ง', {
        description: 'ออร์เดอร์พร้อมสำหรับการจัดส่ง'
      });

    } catch (error) {
      console.error('❌ [FALLBACK] Error in markOrderReadyForShipping:', error);
      throw error;
    }
  }

  // =====================================================
  // Migration Helper Methods
  // =====================================================

  /**
   * Check if 3-phase migration is needed
   */
  static async isMigrationNeeded(): Promise<{
    needsMigration: boolean;
    missingTables: string[];
    message: string;
  }> {
    const missingTables: string[] = [];
    let hasAnyTable = false;

    // Check for each 3-phase table
    const tablesToCheck = ['sales_bills', 'warehouse_assignments', 'fulfillment_orders'];

    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(table)
          .select('id')
          .limit(1);

        if (error) {
          missingTables.push(table);
        } else {
          hasAnyTable = true;
        }
      } catch {
        missingTables.push(table);
      }
    }

    const needsMigration = missingTables.length > 0;

    let message = '';
    if (needsMigration) {
      if (missingTables.length === tablesToCheck.length) {
        message = 'ระบบ 3-Phase Sales Workflow ยังไม่ได้ติดตั้ง กรุณา apply migration files';
      } else {
        message = `ตาราง ${missingTables.join(', ')} ยังไม่มี กรุณา apply migration ที่เหลือ`;
      }
    } else {
      message = 'ระบบ 3-Phase Sales Workflow พร้อมใช้งาน';
    }

    return {
      needsMigration,
      missingTables,
      message
    };
  }

  /**
   * Get migration instructions
   */
  static getMigrationInstructions(): string {
    return `
🔧 วิธีการ Apply Migration:

1. เปิด Supabase Dashboard
2. ไปที่ SQL Editor
3. รันไฟล์ migrations ตามลำดับ:
   - supabase/migrations/20250126_3phase_sales_workflow.sql
   - supabase/migrations/20250927_add_payment_tracking.sql

หรือใช้ Supabase CLI:
\`\`\`
supabase db push
\`\`\`

เมื่อ apply สำเร็จแล้ว ระบบการจัดสินค้าและบัญชีจะพร้อมใช้งานเต็มรูปแบบ
    `.trim();
  }
}

export default FallbackWarehouseService;