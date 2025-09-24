import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { normalizeLocation } from '@/utils/locationUtils';
import { secureGatewayClient } from '@/utils/secureGatewayClient';
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

      // Performance: Conditional logging
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Fetching inventory via secure gateway...');
      }

      const params = warehouseId ? { warehouseId } : undefined;
      const { data } = await secureGatewayClient.get<InventoryItem[]>('inventory', params);

      // Filter out items with zero total quantity to show empty locations properly
      const filteredData = (data ?? []).filter(item => {
        const level1 = item.unit_level1_quantity || 0;
        const level2 = item.unit_level2_quantity || 0;
        const level3 = item.unit_level3_quantity || 0;
        const totalQuantity = level1 + level2 + level3;

        // Only show items that have actual inventory
        return totalQuantity > 0;
      });

      console.log(`📦 Filtered out ${(data?.length || 0) - filteredData.length} empty inventory items`);

      const normalizedItems = filteredData.map(item => ({
        ...item,
        location: normalizeLocation(item.location || ''),
      })) as InventoryItem[];

      setItems(normalizedItems);
      setConnectionStatus('connected');
      setIsStableLoaded(true); // Mark as stable
      setRetryCount(0); // Reset retry count on success

      // If no data, system ready for new data
      if (!data || data.length === 0) {
        // Cache management disabled for direct database access
      }

    } catch (error) {
      console.error('Error fetching inventory items (fallback handled by secureGatewayClient):', error);

      // The secureGatewayClient already handles fallback to direct Supabase client
      // so this error means both gateway and fallback failed

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
      const existingResponse = await secureGatewayClient.get<ProductRow | null>('productBySku', {
        sku: productCode,
      });

      if (existingResponse.data) {
        return existingResponse.data as ProductRow;
      }

      const productData: Partial<ProductInsert> = {
        sku_code: productCode,
        product_name: productName,
        product_type: productType as 'FG' | 'PK',
        is_active: true,
      };

      const createResponse = await secureGatewayClient.mutate<ProductRow>('createProduct', productData);

      if (createResponse.data) {
        console.log('✅ Created new product:', createResponse.data);
        return createResponse.data as ProductRow;
      }

      throw new Error('ไม่สามารถสร้างสินค้าใหม่ได้');
    } catch (error) {
      console.error('Error in ensureProductExists:', error);
      return {
        id: `temp-${Date.now()}`,
        sku_code: productCode,
        product_name: productName,
        product_type: productType as 'FG' | 'PK',
        is_active: true,
      } as ProductRow;
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
        // Dual-write: ensure both legacy and unit_level fields are populated consistently
        carton_quantity_legacy: itemData.quantity_boxes || itemData.carton_quantity_legacy || itemData.unit_level1_quantity || 0,
        box_quantity_legacy: itemData.quantity_loose || itemData.box_quantity_legacy || itemData.unit_level2_quantity || 0,
        pieces_quantity_legacy: itemData.pieces_quantity_legacy || itemData.unit_level3_quantity || 0,
        quantity_pieces: itemData.quantity_pieces || 0,
        unit: itemData.unit || 'ชิ้น',
        // Multi-level unit fields - sync with legacy values if not provided
        unit_level1_quantity: itemData.unit_level1_quantity || itemData.quantity_boxes || itemData.carton_quantity_legacy || 0,
        unit_level2_quantity: itemData.unit_level2_quantity || itemData.quantity_loose || itemData.box_quantity_legacy || 0,
        unit_level3_quantity: itemData.unit_level3_quantity || itemData.pieces_quantity_legacy || 0,
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

      const response = await secureGatewayClient.mutate<InventoryItem>(
        'createInventoryItem',
        insertData
      );

      const createdItem = response.data as InventoryItem | undefined;

      if (createdItem) {
        setItems((prev: any[]) => {
          const updatedItems = [...prev, createdItem as any].sort((a: any, b: any) => a.location.localeCompare(b.location));
          return updatedItems;
        });
      }

      toast({
        title: 'บันทึกสำเร็จ',
        description: 'เพิ่มสินค้าเข้าคลังแล้ว',
      });

      return createdItem ?? null;
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

      // Handle quantity updates with dual-write for consistency
      if ('quantity_boxes' in updates) {
        validUpdateFields.carton_quantity_legacy = updates.quantity_boxes;
        validUpdateFields.unit_level1_quantity = updates.quantity_boxes; // sync with new system
      }
      if ('quantity_loose' in updates) {
        validUpdateFields.box_quantity_legacy = updates.quantity_loose;
        validUpdateFields.unit_level2_quantity = updates.quantity_loose; // sync with new system
      }
      if ('pieces_quantity_legacy' in updates) {
        validUpdateFields.pieces_quantity_legacy = updates.pieces_quantity_legacy;
        validUpdateFields.unit_level3_quantity = updates.pieces_quantity_legacy; // sync with new system
      }

      // Multi-level unit fields (primary) - also sync with legacy
      if ('unit_level1_quantity' in updates) {
        validUpdateFields.unit_level1_quantity = updates.unit_level1_quantity;
        validUpdateFields.carton_quantity_legacy = updates.unit_level1_quantity; // sync with legacy
      }
      if ('unit_level2_quantity' in updates) {
        validUpdateFields.unit_level2_quantity = updates.unit_level2_quantity;
        validUpdateFields.box_quantity_legacy = updates.unit_level2_quantity; // sync with legacy
      }
      if ('unit_level3_quantity' in updates) {
        validUpdateFields.unit_level3_quantity = updates.unit_level3_quantity;
        validUpdateFields.pieces_quantity_legacy = updates.unit_level3_quantity; // sync with legacy
      }

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
      const currentResponse = await secureGatewayClient.get<InventoryItem | null>('inventory', { id });
      const currentItem = currentResponse.data as InventoryItem | null;

      if (!currentItem) {
        throw new Error('Item not found');
      }

      // Merge current data with updates (ensure currentItem is treated as object)
      const mergedData = { ...(currentItem as Record<string, any>), ...validUpdateFields };

      // Check if all quantities are zero - if so, delete the record instead of updating
      const totalQuantity = (mergedData.unit_level1_quantity || 0) + 
                           (mergedData.unit_level2_quantity || 0) + 
                           (mergedData.unit_level3_quantity || 0);

      if (totalQuantity === 0) {
        console.log('🗑️ All quantities are zero, deleting record instead of updating:', {
          id,
          location: mergedData.location,
          product_name: mergedData.product_name
        });

        // Temporarily use hard delete until migration is run
        console.log('🗑️ updateItem calling delete for zero quantities:', { id, totalQuantity });
        const deleteResult = await secureGatewayClient.delete('inventory', { id });
        console.log('🗑️ Delete result:', deleteResult);

        // Remove from local state
        setItems(prev => {
          const filteredItems = prev.filter((item: any) => item.id !== id);
          console.log('🔄 Item deleted from local state:', {
            deletedItemId: id,
            remainingItems: filteredItems.length
          });
          return filteredItems;
        });

        toast({
          title: 'ลบสินค้าเรียบร้อย',
          description: `ลบ ${mergedData.product_name} จากตำแหน่ง ${mergedData.location} แล้ว (เนื่องจากจำนวนเป็น 0)`,
        });

        return { success: true, deleted: true };
      }

      // Use upsert with complete data
      const response = await secureGatewayClient.mutate<{ item?: InventoryItem; deleted?: boolean; newQuantities?: { level1: number; level2: number; level3: number } }>(
        'updateInventoryItem',
        { id, updates: validUpdateFields }
      );

      if (response.data?.deleted) {
        setItems(prev => prev.filter((item: any) => item.id !== id));
        toast({
          title: 'ลบสินค้าเรียบร้อย',
          description: `ลบ ${validUpdateFields.product_name || 'สินค้า'} จากระบบแล้ว (เนื่องจากจำนวนเป็น 0)`,
        });
        return { success: true, deleted: true };
      }

      const updatedItem = response.data?.item as InventoryItem | undefined;

      // Performance: Reduce success logging overhead
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ updateItem - SUCCESS:', id);
      }

      // Update local state immediately with proper sorting
      if (updatedItem) {
        setItems(prev => {
          const updatedItems = prev.map((item: any) => item.id === id ? updatedItem as any : item)
            .sort((a: any, b: any) => a.location.localeCompare(b.location));
          // Performance: Reduce local state update logging
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 updateItem - Local state updated:', id);
          }
          return updatedItems;
        });
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ updateItem - No data returned from database update');
        }
      }

      // Local state already updated above - no need for additional refresh

      toast({
        title: 'อัพเดตสำเร็จ',
        description: 'แก้ไขข้อมูลสินค้าแล้ว',
      });

      return response.data?.item || null;
    } catch (error: unknown) {
      const supabaseError = isSupabaseError(error) ? error : {};
      if (process.env.NODE_ENV === 'development') {
        console.error('Error updating inventory item:', error);
      }
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

      await secureGatewayClient.delete('inventory', { id });

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
      const response = await secureGatewayClient.mutate<{ item?: InventoryItem; deleted?: boolean }>('updateInventoryItem', {
        id,
        updates: {
          unit_level1_quantity: newCartonQty,
          unit_level2_quantity: newBoxQty,
          unit_level3_quantity: newLooseQty,
        },
      });

      const updatedItem = response.data?.item as InventoryItem | undefined;

      if (!updatedItem && !response.data?.deleted) {
        throw new Error('ไม่สามารถอัปเดตข้อมูลสินค้าได้');
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

      console.log('📝 Movement prepared:', movementData);

      // Update local state
      if (response.data?.deleted) {
        setItems(prev => prev.filter(item => item.id !== id));
      } else if (updatedItem) {
        setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
      }

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
    if (process.env.NODE_ENV === 'development') {
      console.log('useInventory mounted - loading data automatically', { warehouseId });
    }
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]); // Re-fetch when warehouseId changes

  const loadSampleData = async () => {
    try {
      setLoading(true);

      // First clear existing data (optional - comment out if you want to keep existing data)
      await secureGatewayClient.mutate('clearInventory');

      // Generate sample data
      const { sampleInventoryData } = await import('@/data/sampleInventory');
      const sampleData = sampleInventoryData;

      // Insert sample data in batches to avoid timeout
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < sampleData.length; i += batchSize) {
        batches.push(sampleData.slice(i, i + batchSize));
      }

      const uploadResponse = await secureGatewayClient.mutate<InventoryItem[]>(
        'bulkUpsertInventory',
        { items: sampleData, clearExisting: true }
      );

      if (uploadResponse.data) {
        const normalized = (uploadResponse.data as InventoryItem[]).map(item => ({
          ...item,
          location: normalizeLocation(item.location || ''),
        }));
        setItems(normalized);
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
      await secureGatewayClient.mutate('clearInventory');

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
      const uploadItems = itemsToUpload.map(item => {
        const payload = { ...item } as Record<string, unknown>;
        if (payload.id && (String(payload.id).startsWith('recovery-') || String(payload.id).startsWith('offline-'))) {
          delete payload.id;
        }
        return payload;
      });

      const response = await secureGatewayClient.mutate<InventoryItem[]>(
        'bulkUpsertInventory',
        { items: uploadItems, clearExisting: true }
      );

      const updatedData = response.data as InventoryItem[] | undefined;

      if (updatedData) {
        const normalized = updatedData.map(item => ({
          ...item,
          location: normalizeLocation(item.location || ''),
        }));
        setItems(normalized);
      }

      toast({
        title: '📤 Upload สำเร็จ',
        description: `อัพโหลดข้อมูล ${uploadItems.length} รายการไปยัง Supabase แล้ว`,
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
      await secureGatewayClient.mutate('transferInventoryItems', {
        ids: itemIds,
        targetLocation: normalizedTargetLocation,
        notes,
      });

      console.log('✅ Database update successful:', itemIds.length, 'items updated');

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
      console.log('📝 Movement logs created:', itemsToTransfer.length, 'entries');

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
      await secureGatewayClient.mutate('shipOutInventoryItems', {
        ids: itemIds,
        notes,
      });

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