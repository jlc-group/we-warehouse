import { useState } from 'react';
import { localDb } from '@/integrations/local/client';
import { useToast } from '@/hooks/use-toast';
import { checkSoftDeleteSupport } from '@/utils/databaseUtils';

// Simple inventory hook without complex features that might cause hanging
export function useInventorySimple() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const { toast } = useToast();

  // Simple fetch function
  const fetchItems = async () => {
    try {
      setLoading(true);
      setConnectionStatus('connecting');
      
      console.log('🔄 Simple fetch starting...');

      // Check if soft delete is supported before filtering
      const hasSoftDelete = await checkSoftDeleteSupport();

      let query = localDb
        .from('inventory_items')
        .select('*');

      // Only apply soft delete filter if the column exists
      if (hasSoftDelete) {
        query = query.eq('is_deleted', false);
      }

      const { data, error } = await query.limit(50); // Very small limit to prevent hanging
      
      if (error) {
        console.error('Simple fetch error:', error);
        setConnectionStatus('disconnected');
        toast({
          title: '❌ เกิดข้อผิดพลาด',
          description: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้',
          variant: 'destructive',
        });
        return;
      }

      console.log('✅ Simple fetch success:', data?.length || 0, 'items');
      setItems(data || []);
      setConnectionStatus('connected');
      
      toast({
        title: '✅ โหลดข้อมูลสำเร็จ',
        description: `พบข้อมูล ${data?.length || 0} รายการ`,
      });
      
    } catch (error) {
      console.error('Simple fetch catch error:', error);
      setConnectionStatus('disconnected');
      setItems([]);
      
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Simple add function
  const addItem = async (itemData: any) => {
    try {
      setLoading(true);
      
      const insertData = {
        product_name: itemData.product_name || 'ไม่ระบุ',
        sku: itemData.sku || 'NO-SKU',
        location: itemData.location || 'A/1/1',
        lot: itemData.lot || null,
        mfd: itemData.mfd || null,
        unit_level1_quantity: itemData.unit_level1_quantity || 0,
        unit_level2_quantity: itemData.unit_level2_quantity || 0,
        unit_level3_quantity: itemData.unit_level3_quantity || 0,
        user_id: null // Allow null for RLS bypass
      };

      const { data, error } = await (localDb as any)
        .from('inventory_items')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Simple add error:', error);
        toast({
          title: '❌ ไม่สามารถเพิ่มข้อมูลได้',
          description: error.message,
          variant: 'destructive',
        });
        return null;
      }

      console.log('✅ Simple add success:', data);
      
      // Refresh data
      await fetchItems();
      
      toast({
        title: '✅ เพิ่มข้อมูลสำเร็จ',
        description: 'บันทึกข้อมูลสินค้าแล้ว',
      });
      
      return data;
    } catch (error) {
      console.error('Simple add catch error:', error);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถเพิ่มข้อมูลได้',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    items,
    loading,
    connectionStatus,
    fetchItems,
    addItem,
    // Minimal interface
    refetch: fetchItems,
    updateItem: async () => null,
    deleteItem: async () => null,
    clearLocation: async () => null,
    exportItem: async () => null,
    transferItems: async () => null,
    shipOutItems: async () => null,
    getItemsAtLocation: () => [],
    isOfflineMode: false,
    loadSampleData: async () => null,
    clearAllData: async () => null,
    retryConnection: fetchItems,
    emergencyRecovery: async () => null,
    bulkUploadToSupabase: async () => null,
    recoverUserData: async () => null,
    importData: async () => null,
    ensureProductExists: async () => null
  };
}
