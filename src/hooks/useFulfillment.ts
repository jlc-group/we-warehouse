import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PendingOrderItem {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  product_name: string;
  sku: string;
  ordered_quantity_level1: number;
  ordered_quantity_level2: number;
  ordered_quantity_level3: number;
  unit_price: number;
  order_date: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  fulfillment_status: 'pending' | 'assigned' | 'picking' | 'picked' | 'shipped';
  fulfillment_location?: string;
  inventory_item_id?: string;
}

export interface FulfillmentStatusUpdate {
  item_id: string;
  status: 'pending' | 'assigned' | 'picking' | 'picked' | 'shipped';
  location?: string;
  fulfilled_by?: string;
}

// Hook สำหรับดึงรายการใบสั่งที่รอจัด
export function usePendingFulfillmentItems() {
  return useQuery({
    queryKey: ['pending-fulfillment-items'],
    queryFn: async () => {
      console.log('📦 Fetching pending fulfillment items...');

      const { data, error } = await supabase
        .from('pending_fulfillment_items')
        .select('*')
        .order('order_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching fulfillment items:', error);
        throw error;
      }

      console.log('✅ Fetched fulfillment items:', data?.length || 0);
      return (data || []) as PendingOrderItem[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 30, // Refresh every 30 seconds
  });
}

// Hook สำหรับสถิติ fulfillment
export function useFulfillmentStats() {
  return useQuery({
    queryKey: ['fulfillment-stats'],
    queryFn: async () => {
      console.log('📊 Fetching fulfillment stats...');

      const { data, error } = await supabase
        .from('fulfillment_dashboard')
        .select('*');

      if (error) {
        console.error('❌ Error fetching fulfillment stats:', error);
        throw error;
      }

      // แปลงเป็น object สำหรับใช้งานง่าย
      const stats = data?.reduce((acc, row) => {
        acc[row.fulfillment_status] = {
          item_count: row.item_count,
          order_count: row.order_count
        };
        return acc;
      }, {} as Record<string, { item_count: number; order_count: number }>);

      console.log('✅ Fulfillment stats:', stats);
      return stats || {};
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook สำหรับอัปเดต fulfillment location
export function useUpdateFulfillmentLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, location }: { itemId: string; location: string }) => {
      console.log('📍 Updating fulfillment location:', { itemId, location });

      const { data, error } = await supabase
        .from('order_items')
        .update({
          fulfillment_location: location,
          fulfillment_status: 'assigned'
        })
        .eq('id', itemId)
        .select();

      if (error) {
        console.error('❌ Error updating fulfillment location:', error);
        throw error;
      }

      console.log('✅ Updated fulfillment location:', data);
      return data;
    },
    onSuccess: () => {
      // Invalidate และ refetch ข้อมูล
      queryClient.invalidateQueries({ queryKey: ['pending-fulfillment-items'] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-stats'] });

      toast.success('กำหนด Location สำเร็จ', {
        description: 'อัปเดตตำแหน่งสำหรับการจัดส่งแล้ว'
      });
    },
    onError: (error) => {
      console.error('❌ Failed to update fulfillment location:', error);
      toast.error('ไม่สามารถกำหนด Location ได้', {
        description: 'กรุณาลองใหม่อีกครั้ง'
      });
    },
  });
}

// Hook สำหรับอัปเดต fulfillment status
export function useUpdateFulfillmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      status,
      fulfilledBy
    }: {
      itemId: string;
      status: 'pending' | 'assigned' | 'picking' | 'picked' | 'shipped';
      fulfilledBy?: string;
    }) => {
      console.log('🔄 Updating fulfillment status:', { itemId, status, fulfilledBy });

      const updateData: any = {
        fulfillment_status: status
      };

      // ถ้าเป็นสถานะที่เสร็จแล้ว ให้บันทึกเวลาและผู้ทำ
      if (status === 'shipped') {
        updateData.fulfilled_at = new Date().toISOString();
        if (fulfilledBy) {
          updateData.fulfilled_by = fulfilledBy;
        }
      }

      const { data, error } = await supabase
        .from('order_items')
        .update(updateData)
        .eq('id', itemId)
        .select();

      if (error) {
        console.error('❌ Error updating fulfillment status:', error);
        throw error;
      }

      console.log('✅ Updated fulfillment status:', data);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate และ refetch ข้อมูล
      queryClient.invalidateQueries({ queryKey: ['pending-fulfillment-items'] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-stats'] });

      const statusLabels = {
        pending: 'รอจัด',
        assigned: 'กำหนด Location แล้ว',
        picking: 'กำลังเบิก',
        picked: 'เบิกเสร็จแล้ว',
        shipped: 'จัดส่งแล้ว'
      };

      toast.success('อัปเดตสถานะสำเร็จ', {
        description: `เปลี่ยนสถานะเป็น "${statusLabels[variables.status]}" แล้ว`
      });
    },
    onError: (error) => {
      console.error('❌ Failed to update fulfillment status:', error);
      toast.error('ไม่สามารถอัปเดตสถานะได้', {
        description: 'กรุณาลองใหม่อีกครั้ง'
      });
    },
  });
}

// Hook สำหรับ bulk update fulfillment status
export function useBulkUpdateFulfillmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemIds,
      status,
      fulfilledBy
    }: {
      itemIds: string[];
      status: 'pending' | 'assigned' | 'picking' | 'picked' | 'shipped';
      fulfilledBy?: string;
    }) => {
      console.log('🔄 Bulk updating fulfillment status:', { itemIds, status, fulfilledBy });

      const updateData: any = {
        fulfillment_status: status
      };

      if (status === 'shipped') {
        updateData.fulfilled_at = new Date().toISOString();
        if (fulfilledBy) {
          updateData.fulfilled_by = fulfilledBy;
        }
      }

      const { data, error } = await supabase
        .from('order_items')
        .update(updateData)
        .in('id', itemIds)
        .select();

      if (error) {
        console.error('❌ Error bulk updating fulfillment status:', error);
        throw error;
      }

      console.log('✅ Bulk updated fulfillment status:', data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-fulfillment-items'] });
      queryClient.invalidateQueries({ queryKey: ['fulfillment-stats'] });

      toast.success('อัปเดตสถานะเป็นกลุ่มสำเร็จ', {
        description: `อัปเดต ${variables.itemIds.length} รายการแล้ว`
      });
    },
    onError: (error) => {
      console.error('❌ Failed to bulk update fulfillment status:', error);
      toast.error('ไม่สามารถอัปเดตสถานะได้', {
        description: 'กรุณาลองใหม่อีกครั้ง'
      });
    },
  });
}