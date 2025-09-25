import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

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
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
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

      // Mock clearable orders
      const mockOrders: ClearableOrder[] = [
        {
          id: '1',
          order_number: 'ORD001',
          customer_name: 'บริษัท ABC จำกัด',
          total_amount: 15000,
          status: 'pending_clearance',
          created_at: new Date().toISOString(),
          can_clear: true,
        },
        {
          id: '2',
          order_number: 'ORD002',
          customer_name: 'บริษัท XYZ จำกัด',
          total_amount: 25000,
          status: 'pending_clearance',
          created_at: new Date().toISOString(),
          can_clear: true,
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