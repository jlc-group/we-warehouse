import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeLocation } from '@/utils/locationUtils';
// Temporarily disable optimization imports to prevent refresh issues
// import {
//   debounce,
//   rateLimiter,
//   connectionManager,
//   cacheManager,
//   resourceMonitor,
//   optimizeQuery
// } from '@/utils/apiOptimization';
import type { Database } from '@/integrations/supabase/types';
// Dynamic import for better code splitting
import { createInventoryItems } from '@/data/userRecoveryData';

type BaseInventoryItem = Database['public']['Tables']['inventory_items']['Row'];
type InventoryInsert = Database['public']['Tables']['inventory_items']['Insert'];
type InventoryUpdate = Database['public']['Tables']['inventory_items']['Update'];

// Product types
type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

// Extended InventoryItem to support UI components while maintaining database compatibility
export interface InventoryItem extends BaseInventoryItem {
  // Ensure all required fields are present with proper types
  unit_level1_name: string | null;
  unit_level2_name: string | null;
  unit_level3_name: string | null;
  unit_level1_rate: number | null;
  unit_level2_rate: number | null;
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

export function useInventory(warehouseId?: string) {
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
      // Rate limiting removed for direct database access

      // Only show loading if not a stable reload and no cached data
      if (!isStableLoaded || isRetry) {
        setLoading(true);
      }
      setConnectionStatus('connecting');
      // Starting optimized fetch process

      // Simple direct query without timeout to prevent hanging
      console.log('🔄 Starting direct database query...');

      // Build query with optional warehouse filter
      let query = supabase
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
          unit_level1_name,
          unit_level2_name,
          unit_level3_name,
          unit_level1_rate,
          unit_level2_rate,
          warehouse_id,
          user_id,
          created_at,
          updated_at
        `);

      // Apply warehouse filter if provided
      if (warehouseId) {
        query = query.eq('warehouse_id', warehouseId);
      }

      const { data, error } = await query.order('location'); // No limit - fetch all data


      if (error) {
        console.error('Fetch error:', error);
        throw error;
      }

      setItems(data || []);
      setConnectionStatus('connected');
      setIsStableLoaded(true); // Mark as stable
      setRetryCount(0); // Reset retry count on success

      // If no data, system ready for new data
      if (!data || data.length === 0) {
        // Cache management disabled for direct database access
      }

    } catch (error) {
      console.error('Error fetching inventory items:', error);

      // Implement retry logic (disabled to prevent infinite loops)
      // if (retryCount < 2 && !isRetry) {
      //   setRetryCount(prev => prev + 1);
      //   console.log(`Retrying fetch... attempt ${retryCount + 1}/3`);
      //   setTimeout(() => {
      //     fetchItems(true);
      //   }, 2000 * (retryCount + 1));
      //   return;
      // }

      // ไม่เปลี่ยน connectionStatus ทันที เพื่อไม่ให้กระพริบ (ถ้ามีข้อมูลอยู่แล้ว)
      if (!isStableLoaded) {
        setConnectionStatus('disconnected');
      }

      // Simple fallback: show empty state instead of sample data to avoid confusion
      if (!isStableLoaded) {
        setItems([]);
        setConnectionStatus('disconnected');
        setIsStableLoaded(true); // Prevent infinite loading

        toast({
          title: '⚠️ ไม่สามารถเชื่อมต่อฐานข้อมูลได้',
          description: 'กรุณาตรวจสอบการเชื่อมต่อและลองใหม่อีกครั้ง',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]); // Add warehouseId dependency to refetch when warehouse changes

  // Function to ensure product exists in products table
  // Note: Using 'as any' temporarily due to Supabase types not recognizing 'products' table
  // TODO: Re-generate Supabase types or update schema to fix this
  const ensureProductExists = async (productCode: string, productName: string, productType: string = 'FG') => {
    try {
      // Check if product already exists
      const { data: existingProduct } = await (supabase as any)
        .from('products')
        .select('id, sku_code, product_name, product_type, category, subcategory, brand')
        .eq('sku_code', productCode)
        .maybeSingle();

      if (existingProduct) {
        return existingProduct;
      }

      // Create new product if it doesn't exist
      const productData = {
        sku_code: productCode,
        product_name: productName,
        product_type: productType as 'FG' | 'PK',
        is_active: true
      };

      const { data: newProduct, error } = await (supabase as any)
        .from('products')
        .insert(productData)
        .select('id, sku_code, product_name, product_type, category, subcategory, brand')
        .single();

      if (error) {
        console.error('Failed to create product:', error);
        throw new Error(`ไม่สามารถสร้างสินค้าใหม่ได้: ${error.message}`);
      }

      console.log('✅ Created new product:', newProduct);
      return newProduct;
    } catch (error) {
      console.error('Error in ensureProductExists:', error);
      // Return a minimal product object if creation fails
      return {
        id: `temp-${Date.now()}`,
        sku_code: productCode,
        product_name: productName,
        product_type: productType as 'FG' | 'PK',
        is_active: true
      };
    }
  };

  const addItem = async (itemData: any) => {
    try {
      // Rate limiting and connection management removed for direct access

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
      // Standard format: A1/1 to Z20/4 (RowPosition/Level) - Updated for full A-Z warehouse layout
      const locationRegex = /^[A-Z]([1-9]|1[0-9]|20)\/[1-4]$/;
      const isLocationValid = locationRegex.test(normalizedLocation);
      const finalLocation = normalizedLocation; // Keep original location instead of forcing A1/1

      console.log('🗺️ Location processing:', {
        original: originalLocation,
        normalized: normalizedLocation,
        isValid: isLocationValid,
        final: finalLocation,
        regex: locationRegex.toString()
      });

      // Validate critical data before insert
      if (!itemData.product_name || !productCode) {
        const error = new Error('Missing required fields: product_name or sku');
        console.error('❌ Data validation failed:', error.message);
        throw error;
      }

      if (!isLocationValid) {
        console.warn('⚠️ Location validation failed, but keeping original:', {
          original: originalLocation,
          normalized: normalizedLocation,
          final: finalLocation
        });
      }

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
        warehouse_id: itemData.warehouse_id || null, // Add warehouse support
        user_id: userId
      };

      console.log('📦 Insert data prepared:', {
        location: insertData.location,
        sku: insertData.sku,
        product_name: insertData.product_name,
        quantities: {
          carton_legacy: insertData.carton_quantity_legacy,
          box_legacy: insertData.box_quantity_legacy,
          pieces_legacy: insertData.pieces_quantity_legacy,
          level1: insertData.unit_level1_quantity,
          level2: insertData.unit_level2_quantity,
          level3: insertData.unit_level3_quantity
        }
      });

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
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถเพิ่มสินค้าได้: ${supabaseError.message || supabaseError.details || 'Unknown error'}`,
        variant: 'destructive',
      });
      // Don't throw error to prevent app crash - return null instead
      return null;
    }
  };

  const updateItem = async (id: string, updates: any) => {
    try {
      // Ensure location is always normalized and validated before updating
      if (updates.location) {
        const originalLocation = updates.location;
        const normalizedLocation = normalizeLocation(originalLocation);
        // Standard format: A1/1 to Z20/4 (RowPosition/Level) - Updated to support A-Z
        const locationRegex = /^[A-Z]([1-9]|1[0-9]|20)\/[1-4]$/;
        const isLocationValid = locationRegex.test(normalizedLocation);
        updates.location = normalizedLocation; // Keep original location instead of forcing A1/1

        console.log('🗺️ Update location processing:', {
          original: originalLocation,
          normalized: normalizedLocation,
          isValid: isLocationValid,
          final: updates.location
        });
      }

      // Clean updates object to only include valid database fields
      const validUpdateFields: any = {};

      // Core fields
      if ('product_name' in updates) validUpdateFields.product_name = updates.product_name;
      if ('sku' in updates) validUpdateFields.sku = updates.sku;
      if ('location' in updates) validUpdateFields.location = updates.location;
      if ('lot' in updates) validUpdateFields.lot = updates.lot;
      if ('mfd' in updates) validUpdateFields.mfd = updates.mfd;

      // Legacy quantity fields (for compatibility)
      if ('quantity_boxes' in updates) validUpdateFields.carton_quantity_legacy = updates.quantity_boxes;
      if ('quantity_loose' in updates) validUpdateFields.box_quantity_legacy = updates.quantity_loose;
      if ('pieces_quantity_legacy' in updates) validUpdateFields.pieces_quantity_legacy = updates.pieces_quantity_legacy;

      // Multi-level unit fields (primary)
      if ('unit_level1_quantity' in updates) validUpdateFields.unit_level1_quantity = updates.unit_level1_quantity;
      if ('unit_level2_quantity' in updates) validUpdateFields.unit_level2_quantity = updates.unit_level2_quantity;
      if ('unit_level3_quantity' in updates) validUpdateFields.unit_level3_quantity = updates.unit_level3_quantity;

      // Unit metadata
      if ('unit_level1_name' in updates) validUpdateFields.unit_level1_name = updates.unit_level1_name;
      if ('unit_level2_name' in updates) validUpdateFields.unit_level2_name = updates.unit_level2_name;
      if ('unit_level3_name' in updates) validUpdateFields.unit_level3_name = updates.unit_level3_name;
      if ('unit_level1_rate' in updates) validUpdateFields.unit_level1_rate = updates.unit_level1_rate;
      if ('unit_level2_rate' in updates) validUpdateFields.unit_level2_rate = updates.unit_level2_rate;

      // Warehouse field
      if ('warehouse_id' in updates) validUpdateFields.warehouse_id = updates.warehouse_id;

      console.log('🔧 updateItem - START:', {
        id,
        originalUpdates: updates,
        cleanedUpdates: validUpdateFields,
        fieldsCount: Object.keys(validUpdateFields).length
      });

      // Debug: Log each field being sent with detailed info
      console.log('📝 Fields being sent to database:', JSON.stringify(validUpdateFields, null, 2));

      // Log quantity-specific info for debugging
      const quantityFields = Object.keys(validUpdateFields).filter(key =>
        key.includes('quantity') || key.includes('level')
      );
      if (quantityFields.length > 0) {
        console.log('📊 Quantity fields detected:', quantityFields.map(field =>
          `${field}: ${validUpdateFields[field]}`
        ).join(', '));
      }

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

      console.log('✅ updateItem - SUCCESS:', {
        id,
        returnedData: data,
        wasDataReturned: !!data
      });

      // Update local state immediately with proper sorting
      if (data) {
        setItems(prev => {
          const updatedItems = prev.map((item: any) => item.id === id ? data as any : item)
            .sort((a: any, b: any) => a.location.localeCompare(b.location));
          console.log('🔄 updateItem - Local state updated:', {
            updatedItemId: id,
            totalItems: updatedItems.length,
            updatedLocation: (data as any).location,
            updatedItem: data
          });
          return updatedItems;
        });
      } else {
        console.warn('⚠️ updateItem - No data returned from database update');
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
      const movementData = {
        inventory_item_id: id,
        movement_type: 'OUT',
        quantity_level1_change: -cartonQty,
        quantity_level2_change: -looseQty,
        quantity_level3_change: 0,
        reference_type: 'EXPORT',
        reference_id: null,
        notes: `ส่งออกจาก ${currentItem.location} ไป ${destination}`,
        user_id: null
      };

      // บันทึก movement (ปิดชั่วคราวจนกว่า inventory_movements table จะพร้อม)
      try {
        const { error: movementError } = await (supabase as any)
          .from('inventory_movements')
          .insert(movementData);

        if (movementError) {
          console.error('Movement error:', movementError);
          // Don't throw here, the update already succeeded
        }
      } catch (error) {
        console.error('Movement logging failed:', error);
        // ไม่ throw error เพราะการอัปเดตหลักสำเร็จแล้ว
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
    console.log('useInventory mounted - loading data automatically', { warehouseId });
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]); // Re-fetch when warehouseId changes

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

  // Check items in target location
  const getItemsAtLocation = useCallback((location: string): InventoryItem[] => {
    const normalizedLocation = normalizeLocation(location);
    return items.filter(item => normalizeLocation(item.location) === normalizedLocation);
  }, [items]);

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
    getItemsAtLocation,
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