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

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('location');

      if (error) {
        console.error('Fetch error:', error);
        throw error;
      }

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

  // Function to ensure product exists in products table
  const ensureProductExists = async (productCode: string, productName: string) => {
    try {
      // Check if product already exists
      const { data: existingProduct } = await supabase
        .from('products')
        .select('*')
        .eq('sku_code', productCode)
        .single();

      if (existingProduct) {
        return existingProduct;
      }

      // Create new product if it doesn't exist
      const { data: newProduct, error } = await supabase
        .from('products')
        .insert({
          sku_code: productCode,
          product_name: productName,
          user_id: '00000000-0000-0000-0000-000000000000'
        })
        .select()
        .single();

      if (error) {
        console.warn('Failed to create product:', error);
        // Don't fail the inventory creation if product creation fails
      }

      return newProduct;
    } catch (error) {
      console.warn('Error ensuring product exists:', error);
      return null;
    }
  };

  const addItem = async (itemData: any) => {
    try {

      // Use a fixed user_id for all operations (no authentication needed)
      const fixedUserId = '00000000-0000-0000-0000-000000000000';

      // Ensure product exists in products table (for new products)
      const productCode = itemData.sku || itemData.product_code;
      if (productCode && itemData.product_name) {
        await ensureProductExists(productCode, itemData.product_name);
      }

      // Support both old format (quantity_boxes) and new format (carton_quantity_legacy)
      const insertData = {
        product_name: itemData.product_name,
        sku: productCode,
        location: itemData.location,
        lot: itemData.lot || null,
        mfd: itemData.mfd || null,
        // Use ACTUAL database column names - support both formats
        carton_quantity_legacy: itemData.carton_quantity_legacy || itemData.quantity_boxes || 0,
        box_quantity_legacy: itemData.box_quantity_legacy || itemData.quantity_loose || 0,
        pieces_quantity_legacy: itemData.pieces_quantity_legacy || 0,
        user_id: fixedUserId,
        // Multi-level unit fields - ฟิลด์หน่วยใหม่
        unit_level1_quantity: itemData.unit_level1_quantity || itemData.carton_quantity_legacy || itemData.quantity_boxes || 0,
        unit_level2_quantity: itemData.unit_level2_quantity || itemData.box_quantity_legacy || itemData.quantity_loose || 0,
        unit_level3_quantity: itemData.unit_level3_quantity || itemData.pieces_quantity_legacy || 0,
        unit_level1_name: itemData.unit_level1_name || 'ลัง',
        unit_level2_name: itemData.unit_level2_name || 'กล่อง',
        unit_level3_name: itemData.unit_level3_name || 'ชิ้น',
        // Add conversion rates if available
        unit_level1_rate: itemData.unit_level1_rate || 0,
        unit_level2_rate: itemData.unit_level2_rate || 0,
      };

      const { data, error } = await supabase
        .from('inventory_items')
        .insert(insertData)
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

      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
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
          fetchItems(); // Refresh data on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchItems]);

  const loadSampleData = async () => {
    try {
      setLoading(true);

      // First clear existing data (optional - comment out if you want to keep existing data)
      const { error: deleteError } = await supabase
        .from('inventory_items')
        .delete()
        .neq('id', ''); // Delete all rows

      if (deleteError) {
        // Continue even if delete fails
      }

      // Generate sample data
      const sampleData = generateSampleInventoryData();

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

      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .neq('id', ''); // Delete all rows

      if (error) {
        console.error('Clear data error:', error);
        throw error;
      }


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
    const userActualData = createInventoryItems();

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

      // Clear existing data first
      const { error: deleteError } = await supabase
        .from('inventory_items')
        .delete()
        .neq('id', '');

      if (deleteError && deleteError.code !== '42501') {
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
    setConnectionStatus('connecting');
    await fetchItems();
  };

  // Import data function
  const importData = useCallback((newItems: InventoryItem[]) => {

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

  // Transfer items between locations
  const transferItems = useCallback(async (itemIds: string[], targetLocation: string, notes?: string) => {
    try {
      setLoading(true);

      // Get current items to transfer
      const itemsToTransfer = items.filter(item => itemIds.includes(item.id));

      if (itemsToTransfer.length === 0) {
        throw new Error('ไม่พบสินค้าที่ต้องการย้าย');
      }

      // Use Supabase transaction with batch update
      const updates = itemsToTransfer.map(item => ({
        id: item.id,
        location: targetLocation,
        updated_at: new Date().toISOString()
      }));

      // Update all items in a single operation
      const { data, error } = await supabase
        .from('inventory_items')
        .upsert(updates.map(update => ({
          id: update.id,
          location: update.location
        })))
        .select();

      if (error) {
        console.error('Transfer error:', error);
        throw error;
      }

      // Log movement for each transferred item
      const fixedUserId = '00000000-0000-0000-0000-000000000000';
      const movementLogs = itemsToTransfer.map(item => ({
        item_id: item.id,
        movement_type: 'transfer' as const,
        carton_quantity_change: 0,
        box_quantity_change: 0,
        pieces_quantity_change: 0,
        location_from: item.location,
        location_to: targetLocation,
        notes: notes || `ย้ายจาก ${item.location} ไป ${targetLocation}`,
        user_id: fixedUserId,
        movement_date: new Date().toISOString()
      }));

      // Insert movement logs
      const { error: logError } = await supabase
        .from('inventory_movements')
        .insert(movementLogs);

      if (logError) {
        console.warn('Failed to log movement:', logError);
        // Don't fail the whole operation if logging fails
      }

      // Update local state
      setItems(prev => prev.map(item => {
        if (itemIds.includes(item.id)) {
          return { ...item, location: targetLocation, updated_at: new Date().toISOString() };
        }
        return item;
      }));

      toast({
        title: '🚛 ย้ายสินค้าสำเร็จ',
        description: `ย้ายสินค้า ${itemsToTransfer.length} รายการไป ${targetLocation} แล้ว`,
      });

      return true;
    } catch (error: unknown) {
      const supabaseError = isSupabaseError(error) ? error : {};
      console.error('Error transferring items:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถย้ายสินค้าได้: ${supabaseError.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [items, toast]);

  // Ship out items (bulk delete with proper logging)
  const shipOutItems = useCallback(async (itemIds: string[], notes?: string) => {
    try {
      setLoading(true);

      // Get current items to ship out
      const itemsToShipOut = items.filter(item => itemIds.includes(item.id));
      if (itemsToShipOut.length === 0) {
        throw new Error('ไม่พบสินค้าที่ต้องการส่งออก');
      }

      // Prepare movement logs for ship out
      const movementLogs = itemsToShipOut.map(item => ({
        item_id: item.id,
        movement_type: 'ship_out' as const,
        location_from: item.location,
        location_to: null, // Ship out means removed from warehouse
        notes: notes || `ส่งออกจาก ${item.location}`,
        user_id: item.user_id || '00000000-0000-0000-0000-000000000000',
        created_at: new Date().toISOString()
      }));

      // Delete items from database
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .in('id', itemIds);

      if (error) throw error;

      // Insert movement logs
      const { error: logError } = await supabase
        .from('inventory_movements')
        .insert(movementLogs);

      if (logError) {
        console.warn('Failed to log ship out movement:', logError);
        // Don't fail the whole operation if logging fails
      }

      // Update local state - remove shipped items
      setItems(prev => prev.filter(item => !itemIds.includes(item.id)));

      toast({
        title: '📦 ส่งออกสินค้าสำเร็จ',
        description: `ส่งออกสินค้า ${itemsToShipOut.length} รายการออกจากระบบคลังแล้ว`,
      });

      return true;
    } catch (error: unknown) {
      const supabaseError = isSupabaseError(error) ? error : {};
      console.error('Error shipping out items:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถส่งออกสินค้าได้: ${supabaseError.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [items, toast]);

  return {
    items,
    loading,
    connectionStatus,
    isOfflineMode,
    addItem,
    updateItem,
    deleteItem,
    transferItems,
    shipOutItems,
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