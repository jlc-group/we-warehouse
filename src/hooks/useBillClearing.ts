import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

// Utility functions for order status
export const getOrderStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending':
    case 'pending_clearance':
      return 'bg-yellow-100 text-yellow-800';
    case 'cleared':
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getOrderStatusLabel = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending':
    case 'pending_clearance':
      return 'รอการเคลียร์';
    case 'cleared':
      return 'เคลียร์แล้ว';
    case 'completed':
      return 'สำเร็จ';
    case 'cancelled':
      return 'ยกเลิก';
    case 'rejected':
      return 'ปฏิเสธ';
    case 'draft':
      return 'ร่าง';
    case 'confirmed':
      return 'ยืนยันแล้ว';
    default:
      return status;
  }
};

// Mock types
export interface BillClearingPermission {
  id: string;
  user_id: string;
  permission_type: 'view' | 'clear';
  granted_by: string;
  granted_at: string;
  expires_at?: string;
  is_active: boolean;
}

export interface ClearableOrder {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_code?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  total_amount: number;
  status: string;
  payment_status?: 'paid' | 'pending' | 'partial' | 'overdue';
  created_at: string;
  delivery_date?: string;
  cleared_at?: string;
  cleared_by?: string;
  cleared_amount?: number;
  cleared_notes?: string;
  is_cleared: boolean;
  days_since_created?: number;
  approval_required?: boolean;
  is_approved_for_clearing?: boolean;
  can_clear: boolean;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: string;
  to_status: string;
  changed_by: string;
  changed_at: string;
  reason?: string;
  notes?: string;
}

export function useBillClearing() {
  const [permissions, setPermissions] = useState<BillClearingPermission[]>([]);
  const [clearableOrders, setClearableOrders] = useState<ClearableOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const hasPermission = useCallback((type: 'view' | 'clear'): boolean => {
    return permissions.some(p => 
      p.permission_type === type && 
      p.is_active &&
      (!p.expires_at || new Date(p.expires_at) > new Date())
    );
  }, [permissions]);

  const canViewBillClearing = useCallback((): boolean => {
    return hasPermission('view');
  }, [hasPermission]);

  const canClearBills = useCallback((): boolean => {
    return hasPermission('clear');
  }, [hasPermission]);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Mock permissions
      const mockPermissions: BillClearingPermission[] = [
        {
          id: '1',
          user_id: 'mock-user',
          permission_type: 'view',
          granted_by: 'admin',
          granted_at: new Date().toISOString(),
          is_active: true,
        },
        {
          id: '2',
          user_id: 'mock-user',
          permission_type: 'clear',
          granted_by: 'admin',
          granted_at: new Date().toISOString(),
          is_active: true,
        },
      ];

      setPermissions(mockPermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดสิทธิ์การใช้งานได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchClearableOrders = useCallback(async () => {
    try {
      setLoading(true);

      // Enhanced mock clearable orders with more realistic data
      const mockOrders: ClearableOrder[] = [
        {
          id: '1',
          order_number: 'ORD-2024-001',
          customer_id: '1',
          customer_name: 'บริษัท ABC จำกัด',
          customer_code: 'CUST001',
          warehouse_id: 'main',
          warehouse_name: 'คลังสินค้าหลัก',
          total_amount: 15000,
          status: 'DELIVERED',
          payment_status: 'pending',
          created_at: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
          delivery_date: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
          is_cleared: false,
          days_since_created: 7,
          approval_required: false,
          is_approved_for_clearing: true,
          can_clear: true,
        },
        {
          id: '2',
          order_number: 'ORD-2024-002',
          customer_id: '2',
          customer_name: 'บริษัท XYZ จำกัด',
          customer_code: 'CUST002',
          warehouse_id: 'main',
          warehouse_name: 'คลังสินค้าหลัก',
          total_amount: 25000,
          status: 'DELIVERED',
          payment_status: 'overdue',
          created_at: new Date(Date.now() - 86400000 * 35).toISOString(), // 35 days ago
          delivery_date: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
          is_cleared: false,
          days_since_created: 35,
          approval_required: true,
          is_approved_for_clearing: false,
          can_clear: false,
        },
        {
          id: '3',
          order_number: 'ORD-2024-003',
          customer_id: '3',
          customer_name: 'บริษัท DEF จำกัด',
          customer_code: 'CUST003',
          warehouse_id: 'main',
          warehouse_name: 'คลังสินค้าหลัก',
          total_amount: 12500,
          status: 'DELIVERED',
          payment_status: 'paid',
          created_at: new Date(Date.now() - 86400000 * 10).toISOString(), // 10 days ago
          delivery_date: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
          cleared_at: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
          cleared_by: 'admin',
          cleared_amount: 12500,
          cleared_notes: 'เคลียร์ตามกำหนดเวลา',
          is_cleared: true,
          days_since_created: 10,
          approval_required: false,
          is_approved_for_clearing: true,
          can_clear: false,
        },
      ];

      setClearableOrders(mockOrders);
    } catch (error) {
      console.error('Error fetching clearable orders:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดรายการใบเคลียร์ได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const clearBill = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      if (!canClearBills()) {
        toast({
          title: 'ไม่มีสิทธิ์',
          description: 'คุณไม่มีสิทธิ์ในการเคลียร์บิล',
          variant: 'destructive',
        });
        return false;
      }

      // Mock clearing process
      setClearableOrders(prev => 
        prev.map(order => 
          order.id === orderId 
            ? { ...order, status: 'cleared', can_clear: false }
            : order
        )
      );

      toast({
        title: 'เคลียร์บิลสำเร็จ',
        description: `เคลียร์บิลเลขที่ ${orderId} เรียบร้อยแล้ว`,
      });

      return true;
    } catch (error) {
      console.error('Error clearing bill:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเคลียร์บิลได้',
        variant: 'destructive',
      });
      return false;
    }
  }, [canClearBills, toast]);

  const grantPermission = useCallback(async (
    userId: string,
    permissionType: 'view' | 'clear',
    expiresAt?: string
  ): Promise<boolean> => {
    try {
      const newPermission: BillClearingPermission = {
        id: Date.now().toString(),
        user_id: userId,
        permission_type: permissionType,
        granted_by: 'current-user',
        granted_at: new Date().toISOString(),
        expires_at: expiresAt,
        is_active: true,
      };

      setPermissions(prev => [...prev, newPermission]);

      toast({
        title: 'มอบสิทธิ์สำเร็จ',
        description: `มอบสิทธิ์ ${permissionType} ให้ผู้ใช้ ${userId} แล้ว`,
      });

      return true;
    } catch (error) {
      console.error('Error granting permission:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถมอบสิทธิ์ได้',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const revokePermission = useCallback(async (permissionId: string): Promise<boolean> => {
    try {
      setPermissions(prev => 
        prev.map(p => 
          p.id === permissionId 
            ? { ...p, is_active: false }
            : p
        )
      );

      toast({
        title: 'ยกเลิกสิทธิ์สำเร็จ',
        description: 'ยกเลิกสิทธิ์เรียบร้อยแล้ว',
      });

      return true;
    } catch (error) {
      console.error('Error revoking permission:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถยกเลิกสิทธิ์ได้',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    clearableOrders,
    loading,
    hasPermission,
    canViewBillClearing,
    canClearBills,
    fetchPermissions,
    fetchClearableOrders,
    clearBill,
    grantPermission,
    revokePermission,
  };
}

// Additional hook for clearing individual bills
export function useClearBill() {
  const { toast } = useToast();

  return {
    mutateAsync: async (params: {
      orderId: string;
      clearedBy: string;
      clearedAmount?: number;
      notes?: string;
    }) => {
      try {
        // Simulate clearing process with validation
        console.log('Starting bill clearing process:', params);

        // Mock validation
        if (!params.orderId || !params.clearedBy) {
          throw new Error('ข้อมูลไม่ครบถ้วน');
        }

        // Simulate async clearing operation
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log('Bill cleared successfully:', params.orderId);

        toast({
          title: 'เคลียร์บิลสำเร็จ',
          description: `เคลียร์บิลเลขที่ ${params.orderId} เรียบร้อยแล้ว`,
        });

        return {
          success: true,
          clearedAt: new Date().toISOString(),
          clearedBy: params.clearedBy,
          clearedAmount: params.clearedAmount,
          notes: params.notes
        };
      } catch (error: any) {
        console.error('Error clearing bill:', error);
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: error.message || 'ไม่สามารถเคลียร์บิลได้',
          variant: 'destructive',
        });
        throw error;
      }
    },
    isPending: false, // In real implementation, this would track loading state
  };
}

// Additional hook for clearable orders with filters
export function useClearableOrders(filters?: any) {
  const [loading] = useState(false);

  // Enhanced mock data with realistic bill clearing scenarios
  const mockOrders: ClearableOrder[] = [
    {
      id: '1',
      order_number: 'ORD-2024-001',
      customer_id: '1',
      customer_name: 'บริษัท ABC จำกัด',
      customer_code: 'CUST001',
      warehouse_id: 'main',
      warehouse_name: 'คลังสินค้าหลัก',
      total_amount: 15000,
      status: 'DELIVERED',
      payment_status: 'pending',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      delivery_date: new Date(Date.now() - 86400000 * 2).toISOString(),
      is_cleared: false,
      days_since_created: 7,
      approval_required: false,
      is_approved_for_clearing: true,
      can_clear: true,
    },
    {
      id: '2',
      order_number: 'ORD-2024-002',
      customer_id: '2',
      customer_name: 'บริษัท XYZ จำกัด',
      customer_code: 'CUST002',
      warehouse_id: 'main',
      warehouse_name: 'คลังสินค้าหลัก',
      total_amount: 25000,
      status: 'DELIVERED',
      payment_status: 'overdue',
      created_at: new Date(Date.now() - 86400000 * 35).toISOString(),
      delivery_date: new Date(Date.now() - 86400000 * 30).toISOString(),
      is_cleared: false,
      days_since_created: 35,
      approval_required: true,
      is_approved_for_clearing: false,
      can_clear: false,
    },
    {
      id: '3',
      order_number: 'ORD-2024-003',
      customer_id: '3',
      customer_name: 'บริษัท DEF จำกัด',
      customer_code: 'CUST003',
      warehouse_id: 'main',
      warehouse_name: 'คลังสินค้าหลัก',
      total_amount: 12500,
      status: 'DELIVERED',
      payment_status: 'paid',
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      delivery_date: new Date(Date.now() - 86400000 * 5).toISOString(),
      cleared_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      cleared_by: 'admin',
      cleared_amount: 12500,
      cleared_notes: 'เคลียร์ตามกำหนดเวลา',
      is_cleared: true,
      days_since_created: 10,
      approval_required: false,
      is_approved_for_clearing: true,
      can_clear: false,
    },
    {
      id: '4',
      order_number: 'ORD-2024-004',
      customer_id: '1',
      customer_name: 'บริษัท ABC จำกัด',
      customer_code: 'CUST001',
      warehouse_id: 'main',
      warehouse_name: 'คลังสินค้าหลัก',
      total_amount: 8500,
      status: 'DELIVERED',
      payment_status: 'pending',
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      delivery_date: new Date(Date.now() - 86400000 * 1).toISOString(),
      is_cleared: false,
      days_since_created: 3,
      approval_required: false,
      is_approved_for_clearing: true,
      can_clear: true,
    },
  ];

  // Apply filters if provided
  let filteredOrders = mockOrders;
  if (filters) {
    filteredOrders = mockOrders.filter(order => {
      if (filters.status && order.status !== filters.status) return false;
      if (filters.customerId && order.customer_id !== filters.customerId) return false;
      if (filters.warehouseId && order.warehouse_id !== filters.warehouseId) return false;
      if (filters.isCleared !== undefined && order.is_cleared !== filters.isCleared) return false;
      return true;
    });
  }

  return {
    data: filteredOrders,
    isLoading: loading,
    error: null
  };
}

// Hook for order status history
export function useOrderStatusHistory() {
  return {
    data: [],
    isLoading: false,
    error: null
  };
}

// Hook for bill clearing permissions
export function useBillClearingPermissions() {
  return {
    data: [],
    isLoading: false,
    error: null
  };
}

// Hook for granting permissions
export function useGrantBillClearingPermission() {
  const { toast } = useToast();

  return {
    mutateAsync: async (_params: any) => {
      toast({
        title: 'มอบสิทธิ์สำเร็จ',
        description: 'มอบสิทธิ์การเคลียร์บิลเรียบร้อยแล้ว',
      });
      return { success: true };
    }
  };
}

// Utility functions
export const getPermissionTypeLabel = (type: string): string => {
  switch (type) {
    case 'view':
      return 'ดูข้อมูล';
    case 'clear':
      return 'เคลียร์บิล';
    default:
      return type;
  }
};

export const hasPermission = (permissions: BillClearingPermission[], type: 'view' | 'clear'): boolean => {
  return permissions.some(p =>
    p.permission_type === type &&
    p.is_active &&
    (!p.expires_at || new Date(p.expires_at) > new Date())
  );
};