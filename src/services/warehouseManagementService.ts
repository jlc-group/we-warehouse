import { supabase } from '@/integrations/supabase/client';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  description: string | null;
  address: string | null;
  is_active: boolean;
  location_prefix_start: string | null;
  location_prefix_end: string | null;
  max_levels: number | null;
  max_positions: number | null;
  created_at: string;
  updated_at: string;
}

export interface WarehouseStats {
  warehouse_id: string;
  warehouse_name: string;
  total_items: number;
  total_quantity: number;
  unique_products: number;
}

export interface InterWarehouseTransferData {
  from_warehouse_id: string;
  to_warehouse_id: string;
  inventory_item_id: string;
  product_name: string;
  product_code: string;
  quantity_to_transfer: number; // Total in pieces
  transfer_carton?: number; // จำนวนลัง
  transfer_box?: number; // จำนวนกล่อง
  transfer_pieces?: number; // จำนวนชิ้น
  from_location: string;
  to_location: string;
  notes?: string;
}

export class WarehouseManagementService {
  /**
   * ดึงรายการคลังทั้งหมด
   */
  static async getAllWarehouses(): Promise<Warehouse[]> {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching warehouses:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลคลังเฉพาะ
   */
  static async getWarehouse(warehouseId: string): Promise<Warehouse | null> {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', warehouseId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching warehouse:', error);
      throw error;
    }
  }

  /**
   * สร้างคลังใหม่
   */
  static async createWarehouse(warehouseData: {
    name: string;
    code: string;
    description?: string;
    address?: string;
    location_prefix_start?: string;
    location_prefix_end?: string;
  }): Promise<Warehouse> {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .insert({
          name: warehouseData.name,
          code: warehouseData.code,
          description: warehouseData.description || null,
          address: warehouseData.address || null,
          location_prefix_start: warehouseData.location_prefix_start || null,
          location_prefix_end: warehouseData.location_prefix_end || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating warehouse:', error);
      throw error;
    }
  }

  /**
   * อัปเดตข้อมูลคลัง
   */
  static async updateWarehouse(
    warehouseId: string,
    updates: Partial<Omit<Warehouse, 'id' | 'created_at'>>
  ): Promise<Warehouse> {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', warehouseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating warehouse:', error);
      throw error;
    }
  }

  /**
   * ดึงสถิติของแต่ละคลัง
   */
  static async getWarehouseStats(): Promise<WarehouseStats[]> {
    try {
      // ดึงข้อมูลคลังทั้งหมด
      const { data: warehouses, error: warehousesError } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('is_active', true);

      if (warehousesError) throw warehousesError;

      // ดึงข้อมูล inventory ทั้งหมด
      const { data: inventoryItems, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('warehouse_id, product_name, quantity_pieces');

      if (inventoryError) throw inventoryError;

      // คำนวณสถิติ
      const stats: WarehouseStats[] = (warehouses || []).map((warehouse) => {
        const items = (inventoryItems || []).filter(
          (item) => item.warehouse_id === warehouse.id
        );

        const totalQuantity = items.reduce(
          (sum, item) => sum + (item.quantity_pieces || 0),
          0
        );

        const uniqueProducts = new Set(items.map((item) => item.product_name)).size;

        return {
          warehouse_id: warehouse.id,
          warehouse_name: warehouse.name,
          total_items: items.length,
          total_quantity: totalQuantity,
          unique_products: uniqueProducts,
        };
      });

      return stats;
    } catch (error) {
      console.error('Error fetching warehouse stats:', error);
      throw error;
    }
  }

  /**
   * ย้ายสินค้าระหว่างคลัง
   */
  static async transferBetweenWarehouses(
    transferData: InterWarehouseTransferData
  ): Promise<void> {
    try {
      console.log('Starting inter-warehouse transfer:', transferData);

      // 1. ดึงข้อมูล inventory item ต้นทาง
      const { data: sourceItem, error: sourceError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('id', transferData.inventory_item_id)
        .single();

      if (sourceError) throw sourceError;
      if (!sourceItem) throw new Error('ไม่พบสินค้าต้นทาง');

      // ตรวจสอบจำนวนสินค้า
      if ((sourceItem.quantity_pieces || 0) < transferData.quantity_to_transfer) {
        throw new Error('จำนวนสินค้าไม่เพียงพอ');
      }

      // 2. ตรวจสอบว่ามีสินค้าชนิดเดียวกันในคลังปลายทางหรือไม่
      const { data: targetItems, error: targetCheckError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('warehouse_id', transferData.to_warehouse_id)
        .eq('product_name', sourceItem.product_name)
        .eq('location', transferData.to_location);

      if (targetCheckError) throw targetCheckError;

      // 3. คำนวณหน่วยหลายระดับสำหรับคลังปลายทาง
      const cartonRate = sourceItem.unit_level1_rate || 1;
      const boxRate = sourceItem.unit_level2_rate || 1;

      // คำนวณจำนวนในแต่ละหน่วยที่ต้องการย้าย
      const transferCarton = transferData.transfer_carton || 0;
      const transferBox = transferData.transfer_box || 0;
      const transferPieces = transferData.transfer_pieces || 0;

      // 4. อัปเดตหรือสร้าง inventory ที่คลังปลายทาง
      let targetItemId: string | null = null;
      let targetPreviousQuantity = 0;
      let targetPreviousCarton = 0;
      let targetPreviousBox = 0;
      let targetPreviousPieces = 0;

      if (targetItems && targetItems.length > 0) {
        // มีสินค้าอยู่แล้ว -> เพิ่มจำนวน
        const targetItem = targetItems[0];
        targetItemId = targetItem.id;
        targetPreviousQuantity = targetItem.quantity_pieces || 0;
        targetPreviousCarton = targetItem.unit_level1_quantity || 0;
        targetPreviousBox = targetItem.unit_level2_quantity || 0;
        targetPreviousPieces = targetItem.unit_level3_quantity || 0;

        const newQuantity = targetPreviousQuantity + transferData.quantity_to_transfer;
        const newCarton = targetPreviousCarton + transferCarton;
        const newBox = targetPreviousBox + transferBox;
        const newPieces = targetPreviousPieces + transferPieces;

        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({
            quantity_pieces: newQuantity,
            unit_level1_quantity: newCarton,
            unit_level2_quantity: newBox,
            unit_level3_quantity: newPieces,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetItem.id);

        if (updateError) throw updateError;
      } else {
        // ไม่มีสินค้า -> สร้างใหม่
        const { data: newItem, error: insertError } = await supabase
          .from('inventory_items')
          .insert({
            warehouse_id: transferData.to_warehouse_id,
            product_name: sourceItem.product_name,
            sku: sourceItem.sku,
            location: transferData.to_location,
            quantity_pieces: transferData.quantity_to_transfer,
            unit_level1_quantity: transferCarton,
            unit_level2_quantity: transferBox,
            unit_level3_quantity: transferPieces,
            unit: sourceItem.unit,
            unit_level1_name: sourceItem.unit_level1_name,
            unit_level2_name: sourceItem.unit_level2_name,
            unit_level3_name: sourceItem.unit_level3_name,
            unit_level1_rate: sourceItem.unit_level1_rate,
            unit_level2_rate: sourceItem.unit_level2_rate,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        if (newItem) {
          targetItemId = newItem.id;
          targetPreviousQuantity = 0;
        }
      }

      // 5. ลดจำนวนสินค้าที่คลังต้นทาง
      const newSourceQuantity =
        (sourceItem.quantity_pieces || 0) - transferData.quantity_to_transfer;

      const sourceCarton = (sourceItem.unit_level1_quantity || 0) - transferCarton;
      const sourceBox = (sourceItem.unit_level2_quantity || 0) - transferBox;
      const sourcePieces = (sourceItem.unit_level3_quantity || 0) - transferPieces;

      if (newSourceQuantity === 0) {
        // ถ้าหมด ให้ลบรายการ
        const { error: deleteError } = await supabase
          .from('inventory_items')
          .delete()
          .eq('id', transferData.inventory_item_id);

        if (deleteError) throw deleteError;
      } else {
        // ยังเหลือ ให้อัปเดตจำนวน
        const { error: updateError } = await supabase
          .from('inventory_items')
          .update({
            quantity_pieces: newSourceQuantity,
            unit_level1_quantity: Math.max(0, sourceCarton),
            unit_level2_quantity: Math.max(0, sourceBox),
            unit_level3_quantity: Math.max(0, sourcePieces),
            updated_at: new Date().toISOString(),
          })
          .eq('id', transferData.inventory_item_id);

        if (updateError) throw updateError;
      }

      // 5. บันทึก inventory movement (ออกจากคลังต้นทาง)
      const { error: movementOutError } = await supabase
        .from('inventory_movements')
        .insert({
          inventory_item_id: transferData.inventory_item_id,
          movement_type: 'transfer_out',
          quantity_change: -transferData.quantity_to_transfer,
          quantity_after: newSourceQuantity,
          location_from: transferData.from_location,
          location_to: transferData.to_location,
          notes: `ย้ายไปคลังปลายทาง: ${transferData.notes || ''}`,
          warehouse_id: transferData.from_warehouse_id,
        });

      if (movementOutError) {
        console.error('Error logging movement out:', movementOutError);
      }

      // 6. บันทึก inventory movement (เข้าคลังปลายทาง)
      if (targetItemId) {
        const { error: movementInError } = await supabase
          .from('inventory_movements')
          .insert({
            inventory_item_id: targetItemId,
            movement_type: 'transfer_in',
            quantity_change: transferData.quantity_to_transfer,
            quantity_after: targetPreviousQuantity + transferData.quantity_to_transfer,
            location_from: transferData.from_location,
            location_to: transferData.to_location,
            notes: `รับย้ายจากคลังต้นทาง: ${transferData.notes || ''}`,
            warehouse_id: transferData.to_warehouse_id,
          });

        if (movementInError) {
          console.error('Error logging movement in:', movementInError);
        }
      }

      // 7. บันทึก system event
      const { error: eventError } = await supabase
        .from('system_events')
        .insert({
          event_type: 'inter_warehouse_transfer',
          event_category: 'inventory',
          severity: 'info',
          message: `ย้ายสินค้า ${sourceItem.product_name} จำนวน ${transferData.quantity_to_transfer} ชิ้น`,
          details: {
            from_warehouse_id: transferData.from_warehouse_id,
            to_warehouse_id: transferData.to_warehouse_id,
            product_name: transferData.product_name,
            product_code: transferData.product_code,
            quantity: transferData.quantity_to_transfer,
            from_location: transferData.from_location,
            to_location: transferData.to_location,
            notes: transferData.notes,
            source_item_id: transferData.inventory_item_id,
            previous_quantity: sourceItem.quantity_pieces,
            new_quantity: newSourceQuantity,
          },
        });

      if (eventError) {
        console.error('Error logging event:', eventError);
      }

      console.log('Transfer completed successfully');
    } catch (error) {
      console.error('Error transferring between warehouses:', error);
      throw error;
    }
  }

  /**
   * ดึงรายการสินค้าในคลัง พร้อม product_type จาก products table
   * ใช้ Manual JOIN เพราะไม่มี Foreign Key
   */
  static async getWarehouseInventory(warehouseId: string) {
    try {
      console.log('🔍 [getWarehouseInventory] Starting manual JOIN for warehouse:', warehouseId);

      // Step 1: Get inventory items
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .order('product_name');

      if (itemsError) throw itemsError;
      if (!items || items.length === 0) {
        console.log('🔍 [getWarehouseInventory] No items found');
        return [];
      }

      console.log('🔍 [getWarehouseInventory] Found', items.length, 'inventory items');

      // Step 2: Get unique SKUs
      const uniqueSkus = [...new Set(items.map(item => item.sku))];
      console.log('🔍 [getWarehouseInventory] Unique SKUs:', uniqueSkus.length);

      // Step 3: Fetch products for these SKUs
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('sku_code, product_type')
        .in('sku_code', uniqueSkus);

      if (productsError) {
        console.warn('⚠️ [getWarehouseInventory] Warning fetching products:', productsError);
        // Continue without product_type if products fetch fails
        return items.map(item => ({ ...item, product_type: null }));
      }

      console.log('🔍 [getWarehouseInventory] Found', products?.length || 0, 'products');

      // Step 4: Create SKU -> product_type map
      const skuTypeMap: Record<string, string> = {};
      (products || []).forEach(p => {
        skuTypeMap[p.sku_code] = p.product_type;
      });

      console.log('🔍 [getWarehouseInventory] Created SKU type map with', Object.keys(skuTypeMap).length, 'entries');

      // Step 5: Merge data
      const enrichedItems = items.map(item => ({
        ...item,
        product_type: skuTypeMap[item.sku] || null,
      }));

      // Count by type
      const typeCounts = enrichedItems.reduce((acc, item) => {
        const type = item.product_type || 'UNKNOWN';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('✅ [getWarehouseInventory] Product type distribution:', typeCounts);

      return enrichedItems;
    } catch (error) {
      console.error('Error fetching warehouse inventory:', error);
      throw error;
    }
  }
}
