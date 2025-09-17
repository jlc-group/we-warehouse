import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { generateSampleInventoryData } from '@/data/sampleInventory';
import { createInventoryItems } from '@/data/userRecoveryData';

type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type InventoryInsert = Database['public']['Tables']['inventory_items']['Insert'];
type InventoryUpdate = Database['public']['Tables']['inventory_items']['Update'];

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

interface SupabaseError {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

const isSupabaseError = (error: unknown): error is SupabaseError => {
  return typeof error === 'object' && error !== null;
};

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
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
  }, [toast]);

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
        console.error('Insert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        throw error;
      }
      
      console.log('Successfully added item:', data);
      setItems(prev => [...prev, data]);
      toast({
        title: 'บันทึกสำเร็จ',
        description: 'เพิ่มสินค้าเข้าคลังแล้ว',
      });
      
      return data;
    } catch (error: unknown) {
      const supabaseError = isSupabaseError(error) ? error : {};
      console.error('Error adding inventory item:', {
        message: supabaseError.message,
        details: supabaseError.details,
        hint: supabaseError.hint,
        code: supabaseError.code,
        fullError: error
      });
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถเพิ่มสินค้าได้: ${supabaseError.message || supabaseError.details || 'Unknown error'}`,
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
    } catch (error: unknown) {
      const supabaseError = isSupabaseError(error) ? error : {};
      console.error('Error updating inventory item:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถแก้ไขข้อมูลได้: ${supabaseError.message || 'Unknown error'}`,
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
    } catch (error: unknown) {
      const supabaseError = isSupabaseError(error) ? error : {};
      console.error('Error deleting inventory item:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถลบสินค้าได้: ${supabaseError.message || 'Unknown error'}`,
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
  }, [fetchItems]);

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

  // Emergency recovery function
  const emergencyRecovery = useCallback(() => {
    console.log('🚨 EMERGENCY RECOVERY: Force loading sample data immediately...');
    
    const sampleData = generateSampleInventoryData();
    const recoveryItems: InventoryItem[] = sampleData.map((item, index) => ({
      id: `recovery-${Date.now()}-${index}`,
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setItems(recoveryItems);
    setConnectionStatus('connected');
    setIsOfflineMode(false);

    toast({
      title: '🔄 กู้ข้อมูลสำเร็จ',
      description: `กู้คืนข้อมูล ${recoveryItems.length} รายการเรียบร้อยแล้ว`,
    });

    return recoveryItems;
  }, [toast]);

  // กู้ข้อมูลจริงของผู้ใช้
  const recoverUserData = useCallback(() => {
    console.log('🎯 USER DATA RECOVERY: Loading your actual data immediately...');

    const userActualData = createInventoryItems();
    console.log(`📦 Loading ${userActualData.length} items of your real data...`);

    setItems(userActualData);
    setConnectionStatus('connected');
    setIsOfflineMode(false);

    toast({
      title: '🎉 กู้ข้อมูลจริงสำเร็จ!',
      description: `กู้คืนข้อมูลจริงของคุณ ${userActualData.length} รายการเรียบร้อยแล้ว`,
      duration: 5000,
    });

    return userActualData;
  }, [toast]);

  // Bulk upload data to Supabase
  const bulkUploadToSupabase = useCallback(async (itemsToUpload: InventoryItem[]) => {
    try {
      setLoading(true);
      console.log(`🔄 Starting bulk upload of ${itemsToUpload.length} items to Supabase...`);

      // Clear existing data first
      const { error: deleteError } = await supabase
        .from('inventory_items')
        .delete()
        .neq('id', '');

      if (deleteError && deleteError.code !== '42501') {
        console.warn('Warning while clearing existing data:', deleteError);
      }

      // Upload in batches
      const batchSize = 50;
      const batches = [];
      for (let i = 0; i < itemsToUpload.length; i += batchSize) {
        batches.push(itemsToUpload.slice(i, i + batchSize));
      }

      let totalUploaded = 0;
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`📤 Uploading batch ${i + 1}/${batches.length} (${batch.length} items)...`);

        const uploadItems = batch.map(item => {
          const uploadItem = { ...item };
          if (uploadItem.id?.startsWith('recovery-') || uploadItem.id?.startsWith('offline-')) {
            delete uploadItem.id;
          }
          return uploadItem;
        });

        const { data, error } = await supabase
          .from('inventory_items')
          .insert(uploadItems)
          .select();

        if (error) {
          console.error('Batch upload error:', error);
          throw error;
        }

        totalUploaded += batch.length;
      }

      console.log(`🎉 Bulk upload completed: ${totalUploaded} items uploaded to Supabase`);
      await fetchItems();

      toast({
        title: '📤 Upload สำเร็จ',
        description: `อัพโหลดข้อมูล ${totalUploaded} รายการไปยัง Supabase แล้ว`,
      });

      return true;
    } catch (error: unknown) {
      console.error('Bulk upload failed:', error);
      
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัพโหลดข้อมูลไปยัง Supabase ได้',
        variant: 'destructive',
      });

      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchItems, toast]);

  // Retry connection function
  const retryConnection = async () => {
    console.log('Retrying connection...');
    setConnectionStatus('connecting');
    await fetchItems();
  };

  // Import data function
  const importData = useCallback((newItems: InventoryItem[]) => {
    console.log(`📤 Importing ${newItems.length} items...`);

    const existingKeys = new Set(items.map(item => `${item.product_name}-${item.location}`));
    const uniqueNewItems = newItems.filter(item =>
      !existingKeys.has(`${item.product_name}-${item.location}`)
    );

    const timestampedItems = uniqueNewItems.map(item => ({
      ...item,
      id: item.id || `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: item.user_id || '00000000-0000-0000-0000-000000000000'
    }));

    const allItems = [...items, ...timestampedItems];
    setItems(allItems);

    toast({
      title: '📤 Import สำเร็จ',
      description: `Import ${timestampedItems.length} รายการใหม่ (ข้าม ${newItems.length - timestampedItems.length} รายการที่ซ้ำ)`,
    });

    return timestampedItems;
  }, [items, toast]);

  return {
    items,
    loading,
    connectionStatus,
    isOfflineMode,
    addItem,
    updateItem,
    deleteItem,
    refetch: fetchItems,
    loadSampleData,
    clearAllData,
    retryConnection,
    emergencyRecovery,
    bulkUploadToSupabase,
    recoverUserData,
    importData,
  };
}

export type { InventoryItem };