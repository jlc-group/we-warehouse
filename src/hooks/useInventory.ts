import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { generateSampleInventoryData } from '@/data/sampleInventory';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type InventoryInsert = Database['public']['Tables']['inventory_items']['Insert'];
type InventoryUpdate = Database['public']['Tables']['inventory_items']['Update'];

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = async () => {
    try {
      setLoading(true);
      console.log('Fetching inventory items...');

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('location');

      if (error) {
        console.error('Fetch error:', error);
        throw error;
      }

      console.log('Successfully fetched items:', data?.length || 0);
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลสินค้าได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (itemData: Omit<InventoryInsert, 'user_id'>) => {
    try {
      console.log('Adding item:', itemData);

      // Use a fixed user_id for all operations (no authentication needed)
      const fixedUserId = '00000000-0000-0000-0000-000000000000';

      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          ...itemData,
          user_id: fixedUserId,
        })
        .select()
        .single();

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }
      
      console.log('Successfully added item:', data);
      setItems(prev => [...prev, data]);
      toast({
        title: 'บันทึกสำเร็จ',
        description: 'เพิ่มสินค้าเข้าคลังแล้ว',
      });
      
      return data;
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถเพิ่มสินค้าได้: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateItem = async (id: string, updates: InventoryUpdate) => {
    try {
      console.log('Updating item:', id, updates);

      const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update error:', error);
        throw error;
      }
      
      console.log('Successfully updated item:', data);
      setItems(prev => prev.map(item => item.id === id ? data : item));
      toast({
        title: 'อัพเดตสำเร็จ',
        description: 'แก้ไขข้อมูลสินค้าแล้ว',
      });
      
      return data;
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถแก้ไขข้อมูลได้: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteItem = async (id: string) => {
    try {
      console.log('Deleting item:', id);

      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      console.log('Successfully deleted item:', id);
      setItems(prev => prev.filter(item => item.id !== id));
      toast({
        title: 'ลบสำเร็จ',
        description: 'ลบสินค้าออกจากคลังแล้ว',
      });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถลบสินค้าได้: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    console.log('Initializing inventory hook...');
    fetchItems();

    // Set up real-time subscription
    const channel = supabase
      .channel('inventory_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_items'
        },
        (payload) => {
          console.log('Real-time change:', payload);
          fetchItems(); // Refresh data on any change
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up inventory hook...');
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSampleData = async () => {
    try {
      setLoading(true);
      console.log('Loading sample data...');

      // First clear existing data (optional - comment out if you want to keep existing data)
      const { error: deleteError } = await supabase
        .from('inventory_items')
        .delete()
        .neq('id', ''); // Delete all rows

      if (deleteError) {
        console.warn('Warning clearing data:', deleteError);
        // Continue even if delete fails
      }

      // Generate sample data
      const sampleData = generateSampleInventoryData();
      console.log('Generated sample data:', sampleData.length, 'items');

      // Insert sample data in batches to avoid timeout
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < sampleData.length; i += batchSize) {
        batches.push(sampleData.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const { error } = await supabase
          .from('inventory_items')
          .insert(batch);

        if (error) {
          console.error('Batch insert error:', error);
          throw error;
        }
      }

      console.log('Successfully loaded sample data');

      // Refresh the items
      await fetchItems();

      toast({
        title: 'โหลดข้อมูลตัวอย่างสำเร็จ',
        description: `เพิ่มสินค้าจุฬาเฮิร์บ ${sampleData.length} รายการแล้ว`,
      });

    } catch (error) {
      console.error('Error loading sample data:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลตัวอย่างได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAllData = async () => {
    try {
      setLoading(true);
      console.log('Clearing all data...');

      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .neq('id', ''); // Delete all rows

      if (error) {
        console.error('Clear data error:', error);
        throw error;
      }

      console.log('Successfully cleared all data');

      // Refresh the items
      await fetchItems();

      toast({
        title: 'ล้างข้อมูลสำเร็จ',
        description: 'ลบข้อมูลทั้งหมดแล้ว',
      });

    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถล้างข้อมูลได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    refetch: fetchItems,
    loadSampleData,
    clearAllData,
  };
}

export type { InventoryItem };