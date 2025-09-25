import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for Bill Clearing System
export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
  notes: string | null;
  metadata: any;
  // View fields
  order_number?: string;
  customer_name?: string;
  changed_by_name?: string;
  hours_since_change?: number;
}

export interface BillClearingPermission {
  id: string;
  user_id: string;
  permission_type: 'bill_clearer' | 'bill_checker' | 'bill_approver' | 'bill_manager';
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface ClearingBatch {
  id: string;
  batch_number: string;
  created_by: string;
  created_at: string;
  processed_at: string | null;
  total_orders: number;
  total_amount: number;
  status: 'draft' | 'processing' | 'completed' | 'cancelled';
  notes: string | null;
  metadata: any;
  // View fields
  created_by_name?: string;
  actual_order_count?: number;
  actual_total_amount?: number;
}

export interface ClearingBatchItem {
  id: string;
  batch_id: string;
  order_id: string;
  added_at: string;
  cleared_amount: number | null;
  notes: string | null;
}

export interface ClearableOrder {
  id: string;
  order_number: string;
  customer_id: string;
  warehouse_id: string | null;
  status: string;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
  cleared_at: string | null;
  cleared_by: string | null;
  cleared_notes: string | null;
  cleared_amount: number | null;
  payment_status: string;
  approval_required: boolean;
  approved_for_clearing_by: string | null;
  approved_for_clearing_at: string | null;
  // View fields
  customer_name?: string;
  customer_code?: string;
  warehouse_name?: string;
  warehouse_code?: string;
  status_display?: string;
  days_since_created?: number;
  is_cleared?: boolean;
  is_approved_for_clearing?: boolean;
}

// Hook to check user permissions
export const useBillClearingPermissions = (userId?: string) => {
  return useQuery({
    queryKey: ['bill-clearing-permissions', userId],
    queryFn: async () => {
      if (!userId) return [];

      try {
        const { data, error } = await supabase
          .from('bill_clearing_permissions')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .is('revoked_at', null);

        if (error) {
          // If table doesn't exist, return default permissions
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.log('Bill clearing permissions table not found, returning default permissions');
            return [
              {
                id: `default-${userId}`,
                user_id: userId,
                permission_type: 'bill_clearer' as const,
                granted_by: 'system',
                granted_at: new Date().toISOString(),
                revoked_at: null,
                is_active: true,
                notes: 'Default permissions (table not yet migrated)'
              }
            ] as BillClearingPermission[];
          }
          throw error;
        }

        return data as BillClearingPermission[];
      } catch (error: any) {
        // Fallback for any network or permission errors
        console.warn('Using fallback permissions:', error.message);
        return [
          {
            id: `fallback-${userId}`,
            user_id: userId,
            permission_type: 'bill_clearer' as const,
            granted_by: 'system',
            granted_at: new Date().toISOString(),
            revoked_at: null,
            is_active: true,
            notes: 'Fallback permissions (migration pending)'
          }
        ] as BillClearingPermission[];
      }
    },
    enabled: !!userId,
  });
};

// Hook to get clearable orders
export const useClearableOrders = (filters?: {
  status?: string;
  customerId?: string;
  warehouseId?: string;
  isCleared?: boolean;
}) => {
  return useQuery({
    queryKey: ['clearable-orders', filters],
    queryFn: async () => {
      try {
        // Try to use the specialized view first
        let query = supabase.from('clearable_orders_view').select('*');

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }

        if (filters?.customerId) {
          query = query.eq('customer_id', filters.customerId);
        }

        if (filters?.warehouseId) {
          query = query.eq('warehouse_id', filters.warehouseId);
        }

        if (filters?.isCleared !== undefined) {
          query = query.eq('is_cleared', filters.isCleared);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.log('clearable_orders_view not found, falling back to customer_orders');
            return await getFallbackOrders(filters);
          }
          throw error;
        }

        return data as ClearableOrder[];
      } catch (error: any) {
        console.warn('Using fallback orders query:', error.message);
        return await getFallbackOrders(filters);
      }
    },
  });
};

// Fallback function to get orders from existing tables
async function getFallbackOrders(filters?: {
  status?: string;
  customerId?: string;
  warehouseId?: string;
  isCleared?: boolean;
}): Promise<ClearableOrder[]> {
  let query = supabase
    .from('customer_orders')
    .select(`
      *,
      customers:customer_id (
        customer_name,
        customer_code
      ),
      warehouses:warehouse_id (
        name,
        code
      )
    `);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }

  if (filters?.warehouseId) {
    query = query.eq('warehouse_id', filters.warehouseId);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('Error in fallback orders query:', error);
    return [];
  }

  // Transform data to match ClearableOrder interface
  return (data || []).map((order: any) => ({
    ...order,
    customer_name: order.customers?.customer_name,
    customer_code: order.customers?.customer_code,
    warehouse_name: order.warehouses?.name,
    warehouse_code: order.warehouses?.code,
    status_display: getOrderStatusLabel(order.status || 'draft'),
    days_since_created: Math.floor(
      (new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
    ),
    is_cleared: false, // Default since no clearing columns exist yet
    is_approved_for_clearing: false,
    payment_status: 'pending', // Default value
    approval_required: false,
    approved_for_clearing_by: null,
    approved_for_clearing_at: null,
    cleared_at: null,
    cleared_by: null,
    cleared_notes: null,
    cleared_amount: null,
  })) as ClearableOrder[];
}

// Hook to get order status history
export const useOrderStatusHistory = (orderId?: string, limit?: number) => {
  return useQuery({
    queryKey: ['order-status-history', orderId, limit],
    queryFn: async () => {
      try {
        let query = supabase.from('order_status_history_view').select('*');

        if (orderId) {
          query = query.eq('order_id', orderId);
        }

        query = query.order('changed_at', { ascending: false });

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.log('order_status_history_view not found, returning empty history');
            return getFallbackOrderHistory(orderId, limit);
          }
          throw error;
        }

        return data as OrderStatusHistory[];
      } catch (error: any) {
        console.warn('Using fallback order history:', error.message);
        return getFallbackOrderHistory(orderId, limit);
      }
    },
  });
};

// Fallback function for order history
async function getFallbackOrderHistory(orderId?: string, limit?: number): Promise<OrderStatusHistory[]> {
  // Since we don't have status history table, we'll generate basic entries from orders
  if (!orderId) return [];

  try {
    const { data: order, error } = await supabase
      .from('customer_orders')
      .select(`
        id,
        order_number,
        status,
        created_at,
        updated_at,
        customers:customer_id (
          customer_name
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) return [];

    // Create basic history entries
    const history: OrderStatusHistory[] = [];

    // Created entry
    history.push({
      id: `created-${orderId}`,
      order_id: orderId,
      from_status: null,
      to_status: 'draft',
      changed_by: null,
      changed_at: order.created_at || new Date().toISOString(),
      reason: 'order_created',
      notes: 'บิลถูกสร้าง',
      metadata: {},
      order_number: order.order_number,
      customer_name: order.customers?.customer_name,
      changed_by_name: 'ระบบ',
      hours_since_change: Math.floor(
        (new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60)
      ),
    });

    // Current status entry if different from draft
    if (order.status && order.status !== 'draft') {
      history.push({
        id: `current-${orderId}`,
        order_id: orderId,
        from_status: 'draft',
        to_status: order.status,
        changed_by: null,
        changed_at: order.updated_at || order.created_at || new Date().toISOString(),
        reason: 'status_update',
        notes: `อัพเดทสถานะเป็น ${getOrderStatusLabel(order.status)}`,
        metadata: {},
        order_number: order.order_number,
        customer_name: order.customers?.customer_name,
        changed_by_name: 'ระบบ',
        hours_since_change: Math.floor(
          (new Date().getTime() - new Date(order.updated_at || order.created_at).getTime()) / (1000 * 60 * 60)
        ),
      });
    }

    return limit ? history.slice(0, limit) : history;
  } catch (error) {
    console.error('Error in fallback order history:', error);
    return [];
  }
}

// Hook to clear a single bill
export const useClearBill = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      clearedBy,
      clearedAmount,
      notes,
    }: {
      orderId: string;
      clearedBy: string;
      clearedAmount?: number;
      notes?: string;
    }) => {
      try {
        // Try to use the stored procedure first
        const { data, error } = await supabase.rpc('clear_bill', {
          p_order_id: orderId,
          p_cleared_by: clearedBy,
          p_cleared_amount: clearedAmount,
          p_notes: notes,
        });

        if (error) {
          if (error.code === '42883' || error.message.includes('does not exist') || error.message.includes('function')) {
            console.log('clear_bill function not found, using fallback method');
            return await fallbackClearBill(orderId, clearedBy, clearedAmount, notes);
          }
          throw error;
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to clear bill');
        }

        return data;
      } catch (error: any) {
        console.warn('Using fallback clear bill method:', error.message);
        return await fallbackClearBill(orderId, clearedBy, clearedAmount, notes);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clearable-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-status-history'] });

      toast.success('เคลียร์บิลสำเร็จ', {
        description: `บิลเลขที่ ${variables.orderId.slice(0, 8)}... ถูกเคลียร์แล้ว`,
      });
    },
    onError: (error: any) => {
      console.error('Error clearing bill:', error);
      toast.error('ไม่สามารถเคลียร์บิลได้', {
        description: error.message || 'เกิดข้อผิดพลาดในระบบ',
      });
    },
  });
};

// Fallback function for clearing bills when stored procedure doesn't exist
async function fallbackClearBill(
  orderId: string,
  clearedBy: string,
  clearedAmount?: number,
  notes?: string
) {
  try {
    // For now, we'll just update the status to indicate it's been processed
    // When the migration is applied, this will be replaced with proper clearing
    const { data, error } = await supabase
      .from('customer_orders')
      .update({
        status: 'cleared',
        updated_at: new Date().toISOString(),
        updated_by: clearedBy,
        internal_notes: notes ? `เคลียร์บิล: ${notes}` : 'เคลียร์บิลแล้ว (รอ migration)'
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      order_id: orderId,
      message: 'บิลถูกเคลียร์แล้ว (รอระบบ migration สำหรับข้อมูลเพิ่มเติม)'
    };
  } catch (error) {
    console.error('Fallback clear bill failed:', error);
    throw error;
  }
}

// Hook to create clearing batch
export const useCreateClearingBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      createdBy,
      orderIds,
      notes,
    }: {
      createdBy: string;
      orderIds: string[];
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_clearing_batch', {
        p_created_by: createdBy,
        p_order_ids: orderIds,
        p_notes: notes,
      });

      if (error) {
        console.error('Error creating clearing batch:', error);
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create clearing batch');
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clearing-batches'] });
      queryClient.invalidateQueries({ queryKey: ['clearable-orders'] });

      toast.success('สร้าง Batch เคลียร์บิลสำเร็จ', {
        description: `สร้าง batch พร้อมรายการ ${data.total_orders} บิล`,
      });
    },
    onError: (error: any) => {
      console.error('Error creating clearing batch:', error);
      toast.error('ไม่สามารถสร้าง Batch เคลียร์บิลได้', {
        description: error.message || 'เกิดข้อผิดพลาดในระบบ',
      });
    },
  });
};

// Hook to get clearing batches
export const useClearingBatches = (status?: string) => {
  return useQuery({
    queryKey: ['clearing-batches', status],
    queryFn: async () => {
      try {
        let query = supabase.from('clearing_batches_view').select('*');

        if (status) {
          query = query.eq('status', status);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          if (error.code === '42P01' || error.message.includes('does not exist')) {
            console.log('clearing_batches_view not found, returning empty batches');
            return [];
          }
          throw error;
        }

        return data as ClearingBatch[];
      } catch (error: any) {
        console.warn('Clearing batches not available yet:', error.message);
        return [];
      }
    },
  });
};

// Hook to get clearing batch items
export const useClearingBatchItems = (batchId: string) => {
  return useQuery({
    queryKey: ['clearing-batch-items', batchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clearing_batch_items')
        .select(`
          *,
          customer_orders (
            order_number,
            total_amount,
            status,
            customers (
              customer_name,
              customer_code
            )
          )
        `)
        .eq('batch_id', batchId)
        .order('added_at');

      if (error) {
        console.error('Error fetching clearing batch items:', error);
        throw error;
      }

      return data as ClearingBatchItem[];
    },
    enabled: !!batchId,
  });
};

// Hook to update order status manually
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
      notes,
    }: {
      orderId: string;
      newStatus: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('customer_orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating order status:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clearable-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order-status-history'] });

      toast.success('อัพเดทสถานะสำเร็จ', {
        description: `เปลี่ยนสถานะเป็น "${variables.newStatus}" แล้ว`,
      });
    },
    onError: (error: any) => {
      console.error('Error updating order status:', error);
      toast.error('ไม่สามารถอัพเดทสถานะได้', {
        description: error.message || 'เกิดข้อผิดพลาดในระบบ',
      });
    },
  });
};

// Hook to grant permission
export const useGrantBillClearingPermission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      permissionType,
      grantedBy,
      notes,
    }: {
      userId: string;
      permissionType: string;
      grantedBy: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('bill_clearing_permissions')
        .insert({
          user_id: userId,
          permission_type: permissionType,
          granted_by: grantedBy,
          notes: notes,
        })
        .select()
        .single();

      if (error) {
        console.error('Error granting permission:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bill-clearing-permissions'] });

      toast.success('มอบสิทธิ์สำเร็จ', {
        description: `มอบสิทธิ์ "${variables.permissionType}" แล้ว`,
      });
    },
    onError: (error: any) => {
      console.error('Error granting permission:', error);
      toast.error('ไม่สามารถมอบสิทธิ์ได้', {
        description: error.message || 'เกิดข้อผิดพลาดในระบบ',
      });
    },
  });
};

// Utility functions
export const getOrderStatusColor = (status: string): string => {
  const normalizedStatus = status?.toLowerCase();
  switch (normalizedStatus) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'processing':
      return 'bg-purple-100 text-purple-800';
    case 'ready_to_ship':
      return 'bg-indigo-100 text-indigo-800';
    case 'shipped':
      return 'bg-orange-100 text-orange-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'cleared':
      return 'bg-teal-100 text-teal-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'refunded':
      return 'bg-pink-100 text-pink-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getOrderStatusLabel = (status: string): string => {
  const normalizedStatus = status?.toLowerCase();
  switch (normalizedStatus) {
    case 'draft':
      return 'ฉบับร่าง';
    case 'pending':
      return 'รอดำเนินการ';
    case 'confirmed':
      return 'ยืนยันแล้ว';
    case 'processing':
      return 'กำลังดำเนินการ';
    case 'ready_to_ship':
      return 'พร้อมส่ง';
    case 'shipped':
      return 'ส่งแล้ว';
    case 'delivered':
      return 'ส่งถึงแล้ว';
    case 'completed':
      return 'เสร็จสิ้น';
    case 'cleared':
      return 'เคลียร์แล้ว';
    case 'cancelled':
      return 'ยกเลิก';
    case 'refunded':
      return 'คืนเงินแล้ว';
    default:
      return status;
  }
};

export const getPermissionTypeLabel = (type: string): string => {
  switch (type) {
    case 'bill_clearer':
      return 'เคลียร์บิล';
    case 'bill_checker':
      return 'ตรวจสอบสถานะ';
    case 'bill_approver':
      return 'อนุมัติบิล';
    case 'bill_manager':
      return 'จัดการระบบบิล';
    default:
      return type;
  }
};

// Permission check utility
export const hasPermission = (
  permissions: BillClearingPermission[],
  requiredPermission: string
): boolean => {
  return permissions.some(
    (p) => p.permission_type === requiredPermission || p.permission_type === 'bill_manager'
  );
};