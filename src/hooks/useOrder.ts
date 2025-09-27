import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Order status options
export const orderStatusOptions = [
  { value: 'DRAFT', label: 'ร่าง', color: 'gray' },
  { value: 'CONFIRMED', label: 'ยืนยันแล้ว', color: 'blue' },
  { value: 'PROCESSING', label: 'กำลังประมวลผล', color: 'yellow' },
  { value: 'PACKED', label: 'แพ็คแล้ว', color: 'purple' },
  { value: 'SHIPPED', label: 'จัดส่งแล้ว', color: 'indigo' },
  { value: 'DELIVERED', label: 'ส่งมอบแล้ว', color: 'green' },
  { value: 'CANCELLED', label: 'ยกเลิก', color: 'red' },
];

// Order type options
export const orderTypeOptions = [
  { value: 'SALE', label: 'ขายสินค้า' },
  { value: 'PURCHASE', label: 'สั่งซื้อ' },
  { value: 'TRANSFER', label: 'โอนย้าย' },
  { value: 'RETURN', label: 'ส่งคืน' },
];

// Priority options
export const priorityOptions = [
  { value: 'LOW', label: 'ต่ำ', color: 'gray' },
  { value: 'NORMAL', label: 'ปกติ', color: 'blue' },
  { value: 'HIGH', label: 'สูง', color: 'orange' },
  { value: 'URGENT', label: 'ด่วน', color: 'red' },
];

export const getOrderStatusLabel = (status: string) => {
  return orderStatusOptions.find(option => option.value === status)?.label || status;
};

export const getOrderStatusColor = (status: string) => {
  return orderStatusOptions.find(option => option.value === status)?.color || 'gray';
};

// Hook for fetching orders with customer data
export function useOrders() {
  return useQuery({
    queryKey: ['orders_v3'],  // Updated version with customer join
    queryFn: async () => {
      console.log('🔍 [useOrders] Fetching orders with customer data...');

      // Join with customers table to get customer information
      const { data, error } = await supabase
        .from('customer_orders')
        .select(`
          id,
          order_number,
          customer_id,
          order_date,
          status,
          order_type,
          priority,
          total_amount,
          final_amount,
          internal_notes,
          shipping_address_line1,
          created_at,
          updated_at,
          customers!inner(
            id,
            customer_name,
            customer_code,
            customer_type,
            phone,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [useOrders] Error fetching orders with customers:', error);
        // If join fails, fallback to simple query
        console.log('🔄 [useOrders] Attempting fallback query without customer join...');

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('customer_orders')
          .select(`
            id,
            order_number,
            customer_id,
            order_date,
            status,
            order_type,
            priority,
            total_amount,
            final_amount,
            internal_notes,
            shipping_address_line1,
            created_at,
            updated_at
          `)
          .order('created_at', { ascending: false });

        if (fallbackError) {
          throw fallbackError;
        }

        console.log(`⚠️ [useOrders] Fallback successful: ${fallbackData?.length || 0} orders (without customer data)`);
        return fallbackData || [];
      }

      console.log(`✅ [useOrders] Successfully fetched ${data?.length || 0} orders with customer data`);
      return data || [];
    },
  });
}

// Hook for fetching single order
export function useSingleOrder(orderId?: string) {
  return useQuery({
    queryKey: ['order_v2', orderId],  // Changed to force cache clear
    queryFn: async () => {
      if (!orderId) return null;

      console.log('🔍 Fetching single order:', orderId);

      const { data, error } = await supabase
        .from('customer_orders')
        .select(`
          id,
          order_number,
          customer_id,
          order_date,
          status,
          order_type,
          priority,
          total_amount,
          final_amount,
          shipping_address_line1,
          internal_notes,
          created_at,
          updated_at
        `)
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('❌ Error fetching order:', error);
        throw error;
      }

      console.log('✅ Fetched order:', data?.order_number);
      return data;
    },
    enabled: !!orderId,
  });
}

// Hook for creating orders
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderData, orderItems }: {
      orderData: any;
      orderItems: any[];
    }) => {
      // Generate order number
      const { count } = await supabase
        .from('customer_orders')
        .select('*', { count: 'exact', head: true });

      const orderNumber = `ORD-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(3, '0')}`;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('customer_orders')
        .insert({
          ...orderData,
          order_number: orderNumber,
          order_date: orderData.order_date || new Date().toISOString(),
          status: orderData.status || 'DRAFT',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items if provided
      if (orderItems && orderItems.length > 0) {
        const itemsWithOrderId = orderItems.map((item, index) => ({
          ...item,
          order_id: order.id,
          line_number: index + 1,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsWithOrderId);

        if (itemsError) throw itemsError;
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders_v3'] });
    },
  });
}

// Hook for updating order status
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status, notes }: {
      orderId: string;
      status: string;
      notes?: string;
    }) => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Set timestamp fields based on status
      switch (status) {
        case 'CONFIRMED':
          updateData.confirmed_at = new Date().toISOString();
          break;
        case 'SHIPPED':
          updateData.shipped_at = new Date().toISOString();
          break;
        case 'DELIVERED':
          updateData.delivered_at = new Date().toISOString();
          break;
      }

      if (notes) {
        updateData.internal_notes = notes;
      }

      const { data, error } = await supabase
        .from('customer_orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders_v3'] });
      queryClient.invalidateQueries({ queryKey: ['order_v2'] });
    },
  });
}

// Hook for order statistics
export function useOrderStats(customerId?: string, warehouseId?: string) {
  return useQuery({
    queryKey: ['orderStats_v2', customerId, warehouseId],  // Changed to force cache clear
    queryFn: async () => {
      let query = supabase
        .from('customer_orders')
        .select(`
          id,
          status,
          final_amount,
          total_amount,
          created_at
        `);

      // Apply filters
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      // Calculate statistics
      const totalOrders = orders?.length || 0;
      const totalAmount = orders?.reduce((sum, order) => sum + (order.final_amount || order.total_amount || 0), 0) || 0;

      const statusCounts = orders?.reduce((acc, order) => {
        const status = order.status || 'DRAFT';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalOrders,
        totalAmount,
        confirmed: statusCounts['CONFIRMED'] || 0,
        processing: statusCounts['PROCESSING'] || 0,
        packed: statusCounts['PACKED'] || 0,
        shipped: statusCounts['SHIPPED'] || 0,
        delivered: statusCounts['DELIVERED'] || 0,
        cancelled: statusCounts['CANCELLED'] || 0,
        draft: statusCounts['DRAFT'] || 0,
      };
    },
  });
}

// Legacy hook for backward compatibility
export function useOrder() {
  const ordersQuery = useOrders();

  const validateOrderStock = useCallback(async () => {
    return { success: true, valid: true, issues: [] };
  }, []);

  return {
    orders: ordersQuery.data || [],
    loading: ordersQuery.isLoading,
    error: ordersQuery.error?.message || null,
    fetchOrders: () => ordersQuery.refetch(),
    validateOrderStock,
    refresh: () => ordersQuery.refetch()
  };
}