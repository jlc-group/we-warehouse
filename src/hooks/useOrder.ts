import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  CustomerOrder,
  CustomerOrderInsert,
  CustomerOrderUpdate,
  OrderItem,
  OrderItemInsert,
  OrderItemUpdate
} from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { deductStock, validateStock } from './useStockManagement';

// Hook สำหรับดึงใบสั่งซื้อทั้งหมด
export function useOrders(customerId?: string, warehouseId?: string) {
  return useQuery({
    queryKey: ['orders', customerId, warehouseId],
    queryFn: async () => {
      console.log('🔍 Fetching orders...', { customerId, warehouseId });

      let query = supabase
        .from('customer_orders')
        .select(`
          *,
          customers (
            customer_name,
            customer_code,
            customer_type
          ),
          warehouses (
            name,
            code
          )
        `)
        .order('created_at', { ascending: false });

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching orders:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} orders`);
      return data as any[]; // CustomerOrder with joined data
    },
  });
}

// Hook สำหรับดึงใบสั่งซื้อรายเดียวพร้อมรายการสินค้า
export function useOrder(orderId?: string) {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      if (!orderId) return null;

      console.log('🔍 Fetching order:', orderId);

      const { data, error } = await supabase
        .from('customer_orders')
        .select(`
          *,
          customers (
            customer_name,
            customer_code,
            customer_type,
            phone,
            email
          ),
          warehouses (
            name,
            code
          ),
          order_items (
            *,
            inventory_items (
              product_name,
              sku,
              location
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('❌ Error fetching order:', error);
        throw error;
      }

      console.log('✅ Fetched order:', data.order_number);
      return data as any; // CustomerOrder with joined data
    },
    enabled: !!orderId,
  });
}

// Hook สำหรับดึงรายการสินค้าในใบสั่งซื้อ
export function useOrderItems(orderId?: string) {
  return useQuery({
    queryKey: ['order-items', orderId],
    queryFn: async () => {
      if (!orderId) return [];

      console.log('🔍 Fetching order items:', orderId);

      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          inventory_items (
            id,
            product_name,
            sku,
            location,
            warehouse_id
          )
        `)
        .eq('order_id', orderId)
        .order('line_number');

      if (error) {
        console.error('❌ Error fetching order items:', error);
        throw error;
      }

      console.log(`✅ Fetched ${data?.length || 0} order items`);
      return data as any[]; // OrderItem with joined data
    },
    enabled: !!orderId,
  });
}

// Hook สำหรับสถิติใบสั่งซื้อ
export function useOrderStats(customerId?: string, warehouseId?: string) {
  return useQuery({
    queryKey: ['order-stats', customerId, warehouseId],
    queryFn: async () => {
      console.log('📊 Fetching order stats...', { customerId, warehouseId });

      let query = supabase
        .from('customer_orders')
        .select('id, status, final_amount, created_at');

      if (customerId) {
        query = query.eq('customer_id', customerId);
      }

      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching order stats:', error);
        throw error;
      }

      // คำนวณสถิติ
      const totalOrders = data?.length || 0;
      const totalAmount = data?.reduce((sum, order) => sum + (order.final_amount || 0), 0) || 0;

      const statusCounts = data?.reduce((counts, order) => {
        const status = order.status || 'DRAFT';
        counts[status] = (counts[status] || 0) + 1;
        return counts;
      }, {} as Record<string, number>) || {};

      const stats = {
        totalOrders,
        totalAmount,
        averageOrderValue: totalOrders > 0 ? totalAmount / totalOrders : 0,
        statusCounts,
        drafts: statusCounts['DRAFT'] || 0,
        confirmed: statusCounts['CONFIRMED'] || 0,
        processing: statusCounts['PROCESSING'] || 0,
        ready: statusCounts['READY'] || 0,
        shipped: statusCounts['SHIPPED'] || 0,
        delivered: statusCounts['DELIVERED'] || 0,
        cancelled: statusCounts['CANCELLED'] || 0,
      };

      console.log('✅ Order stats:', stats);
      return stats;
    },
  });
}

// Hook สำหรับตรวจสอบสต็อกเพียงพอ
async function validateStockAvailability(orderItems: OrderItemInsert[]) {
  console.log('🔍 Validating stock availability for', orderItems.length, 'items');

  for (const item of orderItems) {
    if (!item.inventory_item_id) {
      continue; // ข้ามรายการที่ไม่มี inventory_item_id
    }

    // ดึงสต็อกปัจจุบัน
    const { data: currentItem, error } = await supabase
      .from('inventory_items')
      .select('id, product_name, sku, location, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity')
      .eq('id', item.inventory_item_id)
      .single();

    if (error) {
      console.error('❌ Error fetching inventory for validation:', error);
      throw new Error(`ไม่สามารถตรวจสอบสต็อกของ ${item.product_name}`);
    }

    // ตรวจสอบสต็อกเพียงพอ
    const availableLevel1 = currentItem.unit_level1_quantity || 0;
    const availableLevel2 = currentItem.unit_level2_quantity || 0;
    const availableLevel3 = currentItem.unit_level3_quantity || 0;

    const itemData = item as any; // Type assertion
    const requestedLevel1 = itemData.ordered_quantity_level1 || 0;
    const requestedLevel2 = itemData.ordered_quantity_level2 || 0;
    const requestedLevel3 = itemData.ordered_quantity_level3 || 0;

    console.log('📊 Stock check:', {
      product: item.product_name,
      location: currentItem.location,
      available: { level1: availableLevel1, level2: availableLevel2, level3: availableLevel3 },
      requested: { level1: requestedLevel1, level2: requestedLevel2, level3: requestedLevel3 }
    });

    if (requestedLevel1 > availableLevel1) {
      throw new Error(`สต็อกไม่เพียงพอ: ${item.product_name} ที่ตำแหน่ง ${currentItem.location}\nต้องการ ${requestedLevel1} ลัง แต่มีเพียง ${availableLevel1} ลัง`);
    }

    if (requestedLevel2 > availableLevel2) {
      throw new Error(`สต็อกไม่เพียงพอ: ${item.product_name} ที่ตำแหน่ง ${currentItem.location}\nต้องการ ${requestedLevel2} เศษ แต่มีเพียง ${availableLevel2} เศษ`);
    }

    if (requestedLevel3 > availableLevel3) {
      throw new Error(`สต็อกไม่เพียงพอ: ${item.product_name} ที่ตำแหน่ง ${currentItem.location}\nต้องการ ${requestedLevel3} ชิ้น แต่มีเพียง ${availableLevel3} ชิ้น`);
    }
  }

  console.log('✅ All stock availability validated');
}

// Hook สำหรับสร้างใบสั่งซื้อใหม่
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderData,
      orderItems
    }: {
      orderData: CustomerOrderInsert;
      orderItems: OrderItemInsert[]
    }) => {
      console.log('📝 Creating order for customer:', orderData.customer_id);
      console.log('📊 Order data:', orderData);

      // Validate required fields
      if (!orderData.customer_id) {
        throw new Error('กรุณาเลือกลูกค้า');
      }

      if (!orderData.warehouse_id) {
        throw new Error('กรุณาเลือกคลังสินค้า');
      }

      // ตรวจสอบสต็อกเพียงพอก่อนสร้างคำสั่งซื้อ
      await validateStockAvailability(orderItems);

      // สร้างใบสั่งซื้อ
      const { data: order, error: orderError } = await supabase
        .from('customer_orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error('❌ Error creating order:', orderError);

        // ให้ข้อความ error ที่เข้าใจง่าย
        if (orderError.code === '23503') {
          throw new Error('ข้อมูลไม่ถูกต้อง: ลูกค้าหรือคลังสินค้าไม่พบในระบบ');
        } else if (orderError.code === '23505') {
          throw new Error('หมายเลขใบสั่งซื้อซ้ำ');
        } else {
          throw new Error(`ไม่สามารถสร้างใบสั่งซื้อได้: ${orderError.message}`);
        }
      }

      // สร้างรายการสินค้า
      if (orderItems.length > 0) {
        const itemsWithOrderId = orderItems.map(item => ({
          ...item,
          order_id: order.id,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId);

        if (itemsError) {
          console.error('❌ Error creating order items:', itemsError);
          throw itemsError;
        }

        // จองสต็อก (stock reservation) สำหรับใบสั่งซื้อที่สถานะ DRAFT
        // เพื่อป้องกันการขายซ้ำก่อนยืนยันคำสั่งซื้อ
        if (order.status === 'DRAFT') {
          await reserveStock(order.id, orderItems);
        }
      }

      console.log('✅ Order created:', order.order_number);
      return order as CustomerOrder;
    },
    onSuccess: (data) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      toast.success(`สร้างใบสั่งซื้อ "${data.order_number}" สำเร็จ`);
    },
    onError: (error) => {
      console.error('❌ Create order failed:', error);

      // แสดงข้อความ error ที่เข้าใจง่าย
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างใบสั่งซื้อ';
      toast.error(errorMessage);
    },
  });
}

// Hook สำหรับตัดสต็อกเมื่อยืนยันคำสั่งซื้อ - ใช้ระบบใหม่
async function deductInventoryStock(orderId: string) {
  console.log('📦 Starting inventory deduction for order:', orderId);

  // ดึงรายการสินค้าในคำสั่งซื้อ
  const { data: orderItems, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);

  if (itemsError) {
    console.error('❌ Error fetching order items for deduction:', itemsError);
    throw new Error('ไม่สามารถดึงรายการสินค้าในคำสั่งซื้อ');
  }

  if (!orderItems || orderItems.length === 0) {
    console.log('ℹ️ No items to deduct for order:', orderId);
    return;
  }

  // วนลูปตัดสต็อกแต่ละรายการ
  for (const item of orderItems) {
    if (!item.inventory_item_id) {
      console.warn('⚠️ No inventory_item_id for order item:', item.id);
      continue;
    }

    const itemData = item as any; // Type assertion
    
    try {
      await deductStock(item.inventory_item_id, {
        level1: itemData.ordered_quantity_level1 || 0,
        level2: itemData.ordered_quantity_level2 || 0,
        level3: itemData.ordered_quantity_level3 || 0
      });
      
      console.log('✅ Stock deducted successfully for:', item.product_name);
    } catch (error) {
      console.error('❌ Error deducting stock:', error);
      throw error;
    }
  }

  console.log('✅ All inventory deductions completed for order:', orderId);
}

// Hook สำหรับจองสต็อก (Stock Reservation) - ใช้ notes field แทน
async function reserveStock(orderId: string, orderItems: OrderItemInsert[]) {
  console.log('🔒 Starting stock reservation for order:', orderId);

  try {
    for (const item of orderItems) {
      if (!item.inventory_item_id) {
        continue; // ข้ามรายการที่ไม่มี inventory_item_id
      }

      // อัปเดต notes ใน inventory_items เพื่อระบุว่าถูกจอง
      const { error: reservationError } = await supabase
        .from('inventory_items')
        .update({
          notes: `RESERVED for Order ${orderId} - ${item.product_name}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.inventory_item_id);

      if (reservationError) {
        console.error('❌ Error creating stock reservation:', reservationError);
        // ไม่ throw error เพราะการสร้างคำสั่งซื้อสำเร็จแล้ว
      } else {
        console.log('🔒 Stock reserved for:', item.product_name);
      }
    }

    console.log('✅ Stock reservation completed for order:', orderId);
  } catch (error) {
    console.error('❌ Stock reservation failed:', error);
    // ไม่ throw error เพื่อไม่ให้การสร้างใบสั่งซื้อล้มเหลว
  }
}

// Hook สำหรับปลดการจอง stock - ใช้ notes field แทน
async function unreserveStock(orderId: string) {
  console.log('🔓 Unreserving stock for order:', orderId);

  // ค้นหา inventory items ที่ถูกจองสำหรับ order นี้
  const { data: reservedItems, error: fetchError } = await supabase
    .from('inventory_items')
    .select('id')
    .like('notes', `%RESERVED for Order ${orderId}%`);

  if (fetchError) {
    console.error('❌ Error fetching reserved items:', fetchError);
    return;
  }

  if (reservedItems && reservedItems.length > 0) {
    // ล้าง notes เพื่อปลดการจอง
    const { error } = await supabase
      .from('inventory_items')
      .update({
        notes: null,
        updated_at: new Date().toISOString()
      })
      .in('id', reservedItems.map(item => item.id));

    if (error) {
      console.error('❌ Error unreserving stock:', error);
    } else {
      console.log('✅ Stock unreserved for order:', orderId);
    }
  }
}

// Hook สำหรับอัปเดตสถานะใบสั่งซื้อ
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      notes
    }: {
      orderId: string;
      status: string;
      notes?: string
    }) => {
      console.log('📝 Updating order status:', orderId, status);

      const updates: CustomerOrderUpdate = {
        status,
        updated_at: new Date().toISOString(),
      };

      // เพิ่มเวลาสำหรับสถานะต่างๆ
      if (status === 'CONFIRMED') {
        updates.confirmed_at = new Date().toISOString();
      } else if (status === 'SHIPPED') {
        updates.shipped_at = new Date().toISOString();
      } else if (status === 'DELIVERED') {
        updates.delivered_at = new Date().toISOString();
      }

      if (notes) {
        updates.internal_notes = notes;
      }

      // จัดการ stock ตามสถานะ
      if (status === 'CONFIRMED') {
        // ตัดสต็อกจริงเมื่อยืนยันใบสั่งซื้อ
        await deductInventoryStock(orderId);
        console.log('✅ Stock deducted for confirmed order:', orderId);
      } else if (status === 'CANCELLED') {
        // ปลดการจอง stock
        await unreserveStock(orderId);
      }

      const { data, error } = await supabase
        .from('customer_orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating order status:', error);
        throw error;
      }

      console.log('✅ Order status updated:', data.order_number, status);
      return data as CustomerOrder;
    },
    onSuccess: (data) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', data.id] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] }); // อัปเดต inventory cache ด้วย

      const statusLabel = getOrderStatusLabel(data.status || 'DRAFT');
      let message = `อัปเดตสถานะใบสั่งซื้อ "${data.order_number}" เป็น ${statusLabel} สำเร็จ`;

      if (data.status === 'CONFIRMED') {
        message += ' และตัดสต็อกจากคลังเรียบร้อยแล้ว';
      } else if (data.status === 'CANCELLED') {
        message += ' และปลดการจองสต็อกแล้ว';
      }

      toast.success(message);
    },
    onError: (error) => {
      console.error('❌ Update order status failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตสถานะใบสั่งซื้อ';
      toast.error(errorMessage);
    },
  });
}

// Hook สำหรับเพิ่มรายการสินค้าในใบสั่งซื้อ
export function useAddOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemData: OrderItemInsert) => {
      console.log('📝 Adding item to order:', itemData.order_id);

      const { data, error } = await supabase
        .from('order_items')
        .insert(itemData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error adding order item:', error);
        throw error;
      }

      console.log('✅ Order item added:', data.sku);
      return data as OrderItem;
    },
    onSuccess: (data) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', data.order_id] });
      queryClient.invalidateQueries({ queryKey: ['order-items', data.order_id] });
      toast.success(`เพิ่มสินค้า "${data.product_name}" ในใบสั่งซื้อสำเร็จ`);
    },
    onError: (error) => {
      console.error('❌ Add order item failed:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มสินค้าในใบสั่งซื้อ');
    },
  });
}

// Hook สำหรับอัปเดตรายการสินค้าในใบสั่งซื้อ
export function useUpdateOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      updates
    }: {
      itemId: string;
      updates: OrderItemUpdate
    }) => {
      console.log('📝 Updating order item:', itemId);

      const { data, error } = await supabase
        .from('order_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating order item:', error);
        throw error;
      }

      console.log('✅ Order item updated:', data.sku);
      return data as OrderItem;
    },
    onSuccess: (data) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', data.order_id] });
      queryClient.invalidateQueries({ queryKey: ['order-items', data.order_id] });
      toast.success(`อัปเดตสินค้า "${data.product_name}" สำเร็จ`);
    },
    onError: (error) => {
      console.error('❌ Update order item failed:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสินค้าในใบสั่งซื้อ');
    },
  });
}

// Hook สำหรับลบรายการสินค้าจากใบสั่งซื้อ
export function useDeleteOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, orderId }: { itemId: string; orderId: string }) => {
      console.log('🗑️ Deleting order item:', itemId);

      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('❌ Error deleting order item:', error);
        throw error;
      }

      console.log('✅ Order item deleted');
      return { itemId, orderId };
    },
    onSuccess: (data) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-items', data.orderId] });
      toast.success('ลบสินค้าจากใบสั่งซื้อสำเร็จ');
    },
    onError: (error) => {
      console.error('❌ Delete order item failed:', error);
      toast.error('เกิดข้อผิดพลาดในการลบสินค้าจากใบสั่งซื้อ');
    },
  });
}

// Hook สำหรับยกเลิกใบสั่งซื้อ
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      console.log('❌ Cancelling order:', orderId);

      // ปลดการจอง stock ก่อนยกเลิก
      await unreserveStock(orderId);

      const updates: CustomerOrderUpdate = {
        status: 'CANCELLED',
        internal_notes: reason ? `ยกเลิก: ${reason}` : 'ยกเลิกใบสั่งซื้อ',
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('customer_orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error cancelling order:', error);
        throw error;
      }

      console.log('✅ Order cancelled:', data.order_number);
      return data as CustomerOrder;
    },
    onSuccess: (data) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', data.id] });
      queryClient.invalidateQueries({ queryKey: ['order-stats'] });
      toast.success(`ยกเลิกใบสั่งซื้อ "${data.order_number}" สำเร็จ`);
    },
    onError: (error) => {
      console.error('❌ Cancel order failed:', error);
      toast.error('เกิดข้อผิดพลาดในการยกเลิกใบสั่งซื้อ');
    },
  });
}

// Utility constants
export const orderStatusOptions = [
  { value: 'DRAFT', label: 'ร่าง', color: 'gray' },
  { value: 'CONFIRMED', label: 'ยืนยันแล้ว', color: 'blue' },
  { value: 'PROCESSING', label: 'กำลังจัดเตรียม', color: 'yellow' },
  { value: 'READY', label: 'พร้อมส่ง', color: 'purple' },
  { value: 'SHIPPED', label: 'จัดส่งแล้ว', color: 'orange' },
  { value: 'DELIVERED', label: 'ส่งมอบแล้ว', color: 'green' },
  { value: 'CANCELLED', label: 'ยกเลิก', color: 'red' },
  { value: 'RETURNED', label: 'ส่งคืน', color: 'red' },
];

export const orderTypeOptions = [
  { value: 'SALE', label: 'ขาย' },
  { value: 'TRANSFER', label: 'โอน' },
  { value: 'SAMPLE', label: 'ตัวอย่าง' },
  { value: 'RETURN', label: 'คืนสินค้า' },
];

export const priorityOptions = [
  { value: 'LOW', label: 'ต่ำ', color: 'gray' },
  { value: 'NORMAL', label: 'ปกติ', color: 'blue' },
  { value: 'HIGH', label: 'สูง', color: 'orange' },
  { value: 'URGENT', label: 'เร่งด่วน', color: 'red' },
];

export function getOrderStatusLabel(status: string) {
  const option = orderStatusOptions.find(opt => opt.value === status);
  return option ? option.label : status;
}

export function getOrderStatusColor(status: string) {
  const option = orderStatusOptions.find(opt => opt.value === status);
  return option ? option.color : 'gray';
}

export function getPriorityLabel(priority: string) {
  const option = priorityOptions.find(opt => opt.value === priority);
  return option ? option.label : priority;
}

export function getPriorityColor(priority: string) {
  const option = priorityOptions.find(opt => opt.value === priority);
  return option ? option.color : 'gray';
}