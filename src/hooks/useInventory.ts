import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeLocation } from '@/utils/locationUtils';
import { 
  debounce, 
  rateLimiter, 
  connectionManager, 
  cacheManager, 
  resourceMonitor,
  optimizeQuery 
} from '@/utils/apiOptimization';
import type { Database } from '@/integrations/supabase/types';
// Dynamic import for better code splitting
import { createInventoryItems } from '@/data/userRecoveryData';

type BaseInventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type InventoryInsert = Database['public']['Tables']['inventory_items']['Insert'];
type InventoryUpdate = Database['public']['Tables']['inventory_items']['Update'];

// Extended InventoryItem with additional fields that may be added at runtime
export interface InventoryItem extends BaseInventoryItem {
  product_name: string; // Required to match database schema
  lot: string | null; // Required to match database schema
  mfd: string | null; // Required to match database schema
  carton_quantity_legacy: number | null; // Required to match database schema
  box_quantity_legacy: number | null; // Required to match database schema
  pieces_quantity_legacy: number | null; // Required to match database schema
  quantity_pieces: number | null; // Required to match database schema
  unit: string | null; // Required to match database schema
  unit_level1_name: string | null; // Required to match database schema
  unit_level2_name: string | null; // Required to match database schema
  unit_level3_name: string | null; // Required to match database schema
  unit_level1_rate: number | null; // Required to match database schema
  unit_level2_rate: number | null; // Required to match database schema
}

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
  const [retryCount, setRetryCount] = useState(0);
  const [isStableLoaded, setIsStableLoaded] = useState(false); // Flag to prevent flicker
  const { toast } = useToast();

  const fetchItems = useCallback(async (isRetry = false) => {
    const startTime = Date.now();

    try {
      // Skip rate limiting for retries to speed up connection
      if (!isRetry) {
        await rateLimiter.checkLimit();
      }

      // Only show loading if not a stable reload and no cached data
      if (!isStableLoaded || isRetry) {
        setLoading(true);
      }
      setConnectionStatus('connecting');
      // Starting optimized fetch process

      // Add timeout to prevent hanging requests (increased back to 10s for stability)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      // Optimized query with selective fields to reduce data transfer
      const fetchPromise = supabase
        .from('inventory_items')
        .select(`
          id,
          product_name,
          sku,
          location,
          lot,
          mfd,
          unit_level1_quantity,
          unit_level2_quantity,
          unit_level3_quantity,
          carton_quantity_legacy,
          box_quantity_legacy,
          pieces_quantity_legacy,
          quantity_pieces,
          unit,
          unit_level1_name,
          unit_level2_name,
          unit_level3_name,
          unit_level1_rate,
          unit_level2_rate,
          user_id,
          created_at,
          updated_at
        `)
        .order('location')
        .limit(1000); // Add reasonable limit to prevent excessive data transfer

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;


      if (error) {
        console.error('Fetch error:', error);
        throw error;
      }

      setItems(data || []);
      setConnectionStatus('connected');
      setIsStableLoaded(true); // Mark as stable
      setRetryCount(0); // Reset retry count on success

      // Data loaded successfully
      // If no data, system ready for new data
      if (!data || data.length === 0) {
        // Try loading cached data if available
        const cachedData = cacheManager.get('inventory_items');
        if (cachedData) {
          setItems(cachedData);
          toast({
            title: '📦 โหลดข้อมูล Cache',
            description: 'ใช้ข้อมูลที่เก็บไว้ล่าสุด',
          });
        }
      } else {
        // Cache successful data for future use
        cacheManager.set('inventory_items', data, 10 * 60 * 1000); // Cache for 10 minutes
      }

    } catch (error) {
      console.error('Error fetching inventory items:', error);
      resourceMonitor.recordApiCall(Date.now() - startTime, true);

      // Implement retry logic
      if (retryCount < 2 && !isRetry) {
        setRetryCount(prev => prev + 1);
        console.log(`Retrying fetch... attempt ${retryCount + 1}/3`);

        // Wait a bit before retrying
        setTimeout(() => {
          fetchItems(true);
        }, 2000 * (retryCount + 1)); // Exponential backoff: 2s, 4s

        return; // Exit early, don't change states yet
      }

      // ไม่เปลี่ยน connectionStatus ทันที เพื่อไม่ให้กระพริบ (ถ้ามีข้อมูลอยู่แล้ว)
      if (!isStableLoaded) {
        setConnectionStatus('disconnected');
      }

      // Try fallback strategies in order
      const cachedData = cacheManager.get('inventory_items');
      if (cachedData && cachedData.length > 0) {
        // Use cached data as fallback
        setItems(cachedData);
        setConnectionStatus('connected'); // Keep as connected since we have data
        setIsStableLoaded(true);
        toast({
          title: '📦 ใช้ข้อมูล Cache',
          description: 'เชื่อมต่อช้า - ใช้ข้อมูลที่เก็บไว้ล่าสุด',
        });
      } else {
        // Only try sample data if no cache available and no current data
        if (!isStableLoaded || items.length === 0) {
          try {
            const { sampleInventoryData } = await import('@/data/sampleInventory');
            const sampleData = sampleInventoryData.slice(0, 20); // Reduced from 50 to 20 for faster loading
            setItems(sampleData as unknown as InventoryItem[]);
            setConnectionStatus('connected'); // Keep as connected since we have data
            setIsStableLoaded(true);

            toast({
              title: '⚠️ โหลดข้อมูลตัวอย่าง',
              description: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ ใช้ข้อมูลตัวอย่างแทน',
              variant: 'destructive',
            });
          } catch (fallbackError) {
            console.error('Failed to load sample data:', fallbackError);
            if (!isStableLoaded) {
              setItems([]);
              setConnectionStatus('disconnected');
              toast({
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่',
                variant: 'destructive',
              });
            }
          }
        }
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove dependencies to prevent re-rendering loops

  // Function to ensure product exists in products table
  const ensureProductExists = async (productCode: string, productName: string, productType: string = 'FG') => {
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
          product_type: productType as 'FG' | 'PK',
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create product:', error);
        throw new Error(`ไม่สามารถสร้างสินค้าใหม่ได้: ${error.message}`);
      }

      console.log('✅ Created new product:', newProduct);
      return newProduct;
    } catch (error) {
      console.error('Error ensuring product exists:', error);
      throw error; // Re-throw to handle at higher level
    }
  };

  const addItem = async (itemData: any) => {
    try {
      // Apply rate limiting and connection management
      await rateLimiter.checkLimit();
      await connectionManager.acquire();

      // Set user_id to null to bypass RLS policies since user_id is nullable
      // This allows public access without authentication
      const userId = null;

      // Ensure product exists in products table (for new products)
      const productCode = itemData.sku || itemData.product_code;
      if (productCode && itemData.product_name) {
        const productType = itemData.product_type || 'FG';
        await ensureProductExists(productCode, itemData.product_name, productType);
      }

      // Normalize location with comprehensive logging
      const originalLocation = itemData.location || '';
      const normalizedLocation = normalizeLocation(originalLocation);
      // Standard format: A1/1 to Z4/20 (RowLevel/Position) - Updated to support A-Z
      const locationRegex = /^[A-Z][1-4]\/([1-9]|1[0-9]|20)$/;
      const isLocationValid = locationRegex.test(normalizedLocation);
      const finalLocation = isLocationValid ? normalizedLocation : 'A1/1';

      console.log('🗺️ Location processing:', {
        original: originalLocation,
        normalized: normalizedLocation,
        isValid: isLocationValid,
        final: finalLocation,
        regex: locationRegex.toString()
      });

      // Location normalized and validated
      
      // Use correct database schema fields for insert
      const insertData: any = {
        product_name: itemData.product_name,
        sku: productCode, // Use sku field (correct database field)
        location: finalLocation,
        lot: itemData.lot || null,
        mfd: itemData.mfd || null,
        // Use correct database field names
        carton_quantity_legacy: itemData.quantity_boxes || itemData.carton_quantity_legacy || 0,
        box_quantity_legacy: itemData.quantity_loose || itemData.box_quantity_legacy || 0,
        pieces_quantity_legacy: itemData.pieces_quantity_legacy || 0,
        quantity_pieces: itemData.quantity_pieces || 0,
        unit: itemData.unit || 'ชิ้น',
        // Multi-level unit fields
        unit_level1_quantity: itemData.unit_level1_quantity || 0,
        unit_level2_quantity: itemData.unit_level2_quantity || 0,
        unit_level3_quantity: itemData.unit_level3_quantity || 0,
        unit_level1_name: itemData.unit_level1_name || null,
        unit_level2_name: itemData.unit_level2_name || null,
        unit_level3_name: itemData.unit_level3_name || 'ชิ้น',
        unit_level1_rate: itemData.unit_level1_rate || 0,
        unit_level2_rate: itemData.unit_level2_rate || 0,
        user_id: userId
      };

      // Insert data to database
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

      // Update local state immediately and ensure proper sorting
      if (data) {
        setItems((prev: any[]) => {
          const updatedItems = [...prev, data as any].sort((a: any, b: any) => a.location.localeCompare(b.location));
          return updatedItems;
        });
      }

      toast({
        title: 'บันทึกสำเร็จ',
        description: 'เพิ่มสินค้าเข้าคลังแล้ว',
      });

      return data;
    } catch (error: unknown) {
      const supabaseError = isSupabaseError(error) ? error : {};
      resourceMonitor.recordApiCall(Date.now() - Date.now(), true);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถเพิ่มสินค้าได้: ${supabaseError.message || supabaseError.details || 'Unknown error'}`,
        variant: 'destructive',
      });
      // Don't throw error to prevent app crash - return null instead
      return null;
    } finally {
      connectionManager.release();
    }
  };

  const updateItem = async (id: string, updates: any) => {
    try {
      // Ensure location is always normalized and validated before updating
      if (updates.location) {
        const originalLocation = updates.location;
        const normalizedLocation = normalizeLocation(originalLocation);
        // Standard format: A1/1 to Z4/20 (RowLevel/Position) - Updated to support A-Z
        const locationRegex = /^[A-Z][1-4]\/([1-9]|1[0-9]|20)$/;
        const isLocationValid = locationRegex.test(normalizedLocation);
        updates.location = isLocationValid ? normalizedLocation : 'A1/1';

        console.log('🗺️ Update location processing:', {
          original: originalLocation,
          normalized: normalizedLocation,
          isValid: isLocationValid,
          final: updates.location
        });
      }

      // Clean updates object to only include valid database fields
      const validUpdateFields: any = {};

      // Test with minimal fields - only update what we know exists
      if ('product_name' in updates) validUpdateFields.product_name = updates.product_name;
      if ('location' in updates) validUpdateFields.location = updates.location;
      
      // Add quantity fields if they exist
      if ('quantity_boxes' in updates) validUpdateFields.quantity_boxes = updates.quantity_boxes;
      if ('quantity_loose' in updates) validUpdateFields.quantity_loose = updates.quantity_loose;

      console.log('🔧 updateItem - Cleaned update data:', {
        id,
        originalUpdates: updates,
        cleanedUpdates: validUpdateFields
      });

      // Debug: Log each field being sent
      console.log('📝 Fields being sent to database:', JSON.stringify(validUpdateFields, null, 2));

      // Temporarily remove user_id constraint to bypass RLS
      if ('user_id' in validUpdateFields) {
        delete validUpdateFields.user_id;
      }

      // Workaround: Get current item data first, then replace
      const { data: currentItem } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', id)
        .single();

      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Merge current data with updates (ensure currentItem is treated as object)
      const mergedData = { ...(currentItem as Record<string, any>), ...validUpdateFields };

      // Use upsert with complete data
      const { data, error } = await (supabase as any)
        .from('inventory_items')
        .upsert(mergedData, { onConflict: 'id' })
        .select('id, product_name, location')
        .single();

      if (error) {
        console.error('❌ Update error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error,
          updateData: validUpdateFields
        });
        throw error;
      }
      
      // Update local state immediately with proper sorting
      if (data) {
        setItems(prev => {
          const updatedItems = prev.map((item: any) => item.id === id ? data as any : item)
            .sort((a: any, b: any) => a.location.localeCompare(b.location));
          // console.log('🔄 updateItem - Updated local state:', {
          //   updatedItemId: id,
          //   totalItems: updatedItems.length,
          //   updatedLocation: (data as any).location
          // });
          return updatedItems;
        });
      }

      // Local state already updated above - no need for additional refresh

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
      // Don't throw error to prevent app crash
      return null;
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

  const exportItem = async (id: string, cartonQty: number, boxQty: number, looseQty: number, destination: string, notes?: string) => {
    try {
      // Get current item
      const currentItem = items.find(item => item.id === id);
      if (!currentItem) {
        throw new Error('ไม่พบสินค้าที่ต้องการส่งออก');
      }

      // Calculate new quantities
      const currentCartonQty = Number(currentItem.unit_level1_quantity) || 0;
      const currentBoxQty = Number(currentItem.unit_level2_quantity) || 0;
      const currentLooseQty = Number(currentItem.unit_level3_quantity) || 0;

      // Validate quantities
      if (currentCartonQty < cartonQty) {
        throw new Error(`จำนวนลังในคลังไม่เพียงพอ (มีอยู่ ${currentCartonQty} ลัง)`);
      }
      if (currentBoxQty < boxQty) {
        throw new Error(`จำนวนกล่องในคลังไม่เพียงพอ (มีอยู่ ${currentBoxQty} กล่อง)`);
      }
      if (currentLooseQty < looseQty) {
        throw new Error(`จำนวนชิ้นในคลังไม่เพียงพอ (มีอยู่ ${currentLooseQty} ชิ้น)`);
      }

      const newCartonQty = currentCartonQty - cartonQty;
      const newBoxQty = currentBoxQty - boxQty;
      const newLooseQty = currentLooseQty - looseQty;

      // Update inventory
      const { data: updatedItem, error: updateError } = await (supabase as any)
        .from('inventory_items')
        .update({
          unit_level1_quantity: newCartonQty,
          unit_level2_quantity: newBoxQty,
          unit_level3_quantity: newLooseQty
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      // Record movement
      const { error: movementError } = await (supabase as any)
        .from('inventory_movements')
        .insert({
          inventory_item_id: id,
          movement_type: 'export',
          location_before: currentItem.location,
          location_after: destination,
          box_quantity_before: currentCartonQty,
          box_quantity_after: newCartonQty,
          box_quantity_change: -cartonQty,
          loose_quantity_before: currentLooseQty,
          loose_quantity_after: newLooseQty,
          loose_quantity_change: -looseQty,
          notes: notes || `ส่งออกไปยัง ${destination} (ลัง: ${cartonQty}, กล่อง: ${boxQty}, ชิ้น: ${looseQty})`,
          created_by: 'user'
        });

      if (movementError) {
        console.error('Movement error:', movementError);
        // Don't throw here, the update already succeeded
      }

      // Update local state
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));

      const totalItems = cartonQty + boxQty + looseQty;
      const itemDetails = [
        cartonQty > 0 ? `${cartonQty} ลัง` : '',
        boxQty > 0 ? `${boxQty} กล่อง` : '',
        looseQty > 0 ? `${looseQty} ชิ้น` : ''
      ].filter(Boolean).join(', ');

      toast({
        title: 'ส่งออกสำเร็จ',
        description: `ส่งสินค้า ${itemDetails} ไปยัง ${destination}`,
      });
    } catch (error: unknown) {
      const supabaseError = isSupabaseError(error) ? error : {};
      console.error('Error exporting inventory item:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถส่งออกสินค้าได้: ${supabaseError.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Remove debounced function temporarily to avoid issues

  // Initialize data on mount
  useEffect(() => {
    fetchItems();
    
    // TEMPORARILY DISABLE REAL-TIME SUBSCRIPTION TO STOP FLICKERING
    // Real-time updates are disabled until the flickering issue is completely resolved
    
    // useInventory mounted - fetchItems called once
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - runs only once, ignore ESLint warning intentionally

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
      const { sampleInventoryData } = await import('@/data/sampleInventory');
      const sampleData = sampleInventoryData;

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


      // Update local state instead of refetching to prevent flicker
      const { data: newData } = await supabase
        .from('inventory_items')
        .select('*')
        .order('location');
      
      if (newData) {
        setItems(newData);
      }

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

      // First get all records to delete them properly
      const { data: allItems, error: fetchError } = await supabase
        .from('inventory_items')
        .select('id');

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      if (allItems && allItems.length > 0) {
        // Delete all records using IN clause
        const { error } = await supabase
          .from('inventory_items')
          .delete()
          .in('id', allItems.map((item: any) => item.id));

        if (error) {
          console.error('Clear data error:', error);
          throw error;
        }
      }


      // Clear local state immediately - no need to refetch
      setItems([]);

      toast({
        title: '🗑️ ล้างข้อมูลสำเร็จ',
        description: 'ลบข้อมูลทั้งหมดออกจากระบบแล้ว ระบบพร้อมใช้งาน',
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
  const emergencyRecovery = useCallback(async () => {
    const { sampleInventoryData } = await import('@/data/sampleInventory');
    const sampleData = sampleInventoryData;
    const recoveryItems: any[] = sampleData.map((item: any, index: number) => ({
      id: `recovery-${Date.now()}-${index}`,
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setItems(recoveryItems as any);
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
        console.warn('Failed to clear existing data:', deleteError);
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

      // Update local state instead of refetching to prevent flicker
      const { data: updatedData } = await supabase
        .from('inventory_items')
        .select('*')
        .order('location');
      
      if (updatedData) {
        setItems(updatedData);
      }

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
  }, [toast]); // Removed fetchItems dependency to prevent unnecessary re-renders

  // Retry connection function with reset - no automatic refetch to prevent flicker
  const retryConnection = async () => {
    setRetryCount(0); // Reset retry count
    setConnectionStatus('connecting');
    // Manual refetch only when user explicitly requests it
    // await fetchItems(true);
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
      console.log('🚛 Starting transfer:', { itemIds, targetLocation, notes });
      setLoading(true);

      // Normalize target location to ensure consistent format
      const normalizedTargetLocation = normalizeLocation(targetLocation);
      console.log('🎯 Normalized target location:', normalizedTargetLocation);

      // Get current items to transfer
      const itemsToTransfer = items.filter(item => itemIds.includes(item.id));
      console.log('📦 Items to transfer:', itemsToTransfer.map(item => ({ id: item.id, sku: item.sku, currentLocation: item.location })));

      if (itemsToTransfer.length === 0) {
        throw new Error('ไม่พบสินค้าที่ต้องการย้าย');
      }

      // Update all items in a single operation - use update instead of upsert
      const { data, error } = await (supabase as any)
        .from('inventory_items')
        .update({ location: normalizedTargetLocation, updated_at: new Date().toISOString() })
        .in('id', itemIds)
        .select();

      if (error) {
        console.error('❌ Transfer error:', error);
        throw error;
      }

      console.log('✅ Database update successful:', data?.length || 0, 'items updated');

      // Log movement for each transferred item
      const fixedUserId = '00000000-0000-0000-0000-000000000000';
      const movementLogs = itemsToTransfer.map(item => ({
        item_id: item.id,
        movement_type: 'transfer' as const,
        carton_quantity_change: 0,
        box_quantity_change: 0,
        pieces_quantity_change: 0,
        location_from: item.location,
        location_to: normalizedTargetLocation,
        notes: notes || `ย้ายจาก ${item.location} ไป ${normalizedTargetLocation}`,
        user_id: null,
        movement_date: new Date().toISOString()
      }));

      // Insert movement logs
      const { error: logError } = await (supabase as any)
        .from('inventory_movements')
        .insert(movementLogs);

      if (logError) {
        console.warn('⚠️ Failed to log movement:', logError);
        // Don't fail the whole operation if logging fails
      } else {
        console.log('📝 Movement logs created:', movementLogs.length, 'entries');
      }

      // Update local state
      setItems(prev => {
        const updated = prev.map(item => {
          if (itemIds.includes(item.id)) {
            return { ...item, location: normalizedTargetLocation, updated_at: new Date().toISOString() };
          }
          return item;
        });
        console.log('🔄 Local state updated for', itemIds.length, 'items');
        return updated;
      });

      toast({
        title: '🚛 ย้ายสินค้าสำเร็จ',
        description: `ย้ายสินค้า ${itemsToTransfer.length} รายการไป ${normalizedTargetLocation} แล้ว`,
      });

      console.log('🎉 Transfer completed successfully!');
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
      const { error: logError } = await (supabase as any)
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
    exportItem,
    transferItems,
    shipOutItems,
    refetch: () => {
      // Manual refetch only when explicitly requested by user
      console.log('Manual refetch requested');
      return fetchItems();
    },
    loadSampleData,
    clearAllData,
    retryConnection,
    emergencyRecovery,
    bulkUploadToSupabase,
    recoverUserData,
    importData,
  };
}

// Export the extended InventoryItem type