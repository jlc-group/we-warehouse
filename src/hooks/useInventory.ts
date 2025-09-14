import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

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

      // Generate a random user_id since we don't need authentication
      const randomUserId = crypto.randomUUID();

      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          ...itemData,
          user_id: randomUserId,
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

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    refetch: fetchItems,
  };
}

export type { InventoryItem };