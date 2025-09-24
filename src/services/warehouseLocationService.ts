import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { normalizeLocation, isValidLocation, parseLocation } from '@/utils/locationUtils';

// Use existing database types
type InventoryItemRow = Database['public']['Tables']['inventory_items']['Row'];
type WarehouseRow = Database['public']['Tables']['warehouses']['Row'];

// Virtual warehouse location types (generated from inventory_items)
export interface WarehouseLocation {
  id: string;
  location_code: string;
  warehouse_id?: string;
  zone?: string;
  row?: string;
  shelf?: string;
  level?: string;
  position?: string;
  description?: string;
  capacity?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WarehouseLocationInsert {
  location_code: string;
  warehouse_id?: string;
  zone?: string;
  row?: string;
  shelf?: string;
  level?: string;
  position?: string;
  description?: string;
  capacity?: number;
  is_active?: boolean;
}

export interface WarehouseLocationUpdate {
  location_code?: string;
  warehouse_id?: string;
  zone?: string;
  row?: string;
  shelf?: string;
  level?: string;
  position?: string;
  description?: string;
  capacity?: number;
  is_active?: boolean;
}

export interface WarehouseLocationServiceResult<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface LocationWithInventoryCount extends WarehouseLocation {
  inventory_count: number;
  total_boxes: number;
  total_loose: number;
  total_cartons: number;
  total_pieces: number;
  total_sheets: number;
  total_bottles: number;
  total_sachets: number;
  total_quantity_sum: number;
  product_list: string | null;
  detailed_inventory: InventoryItem[] | null;
  utilization_percentage: number;
}

export interface InventoryItem {
  sku_code: string;
  product_name: string;
  unit: string;
  box_quantity: number;
  loose_quantity: number;
  total_quantity: number;
  unit_display: string;
}

export interface LocationStatistics {
  total_locations: number;
  total_with_inventory: number;
  high_utilization_count: number;
  medium_utilization_count: number;
  low_utilization_count: number;
  empty_locations: number;
  average_utilization: number;
}

export class WarehouseLocationService {
  /**
   * ดึงข้อมูล warehouse locations ทั้งหมด (สร้างจาก inventory_items)
   */
  static async getAllLocations(): Promise<WarehouseLocationServiceResult<WarehouseLocation[]>> {
    try {
      // ดึงข้อมูล unique locations จาก inventory_items
      const { data: inventoryItems, error } = await supabase
        .from('inventory_items')
        .select('location, warehouse_id, created_at, updated_at')
        .not('location', 'is', null);

      if (error) {
        console.error('Error fetching inventory locations:', error);
        return {
          data: null,
          error: `ไม่สามารถโหลดข้อมูลตำแหน่งคลังได้: ${error.message}`,
          success: false
        };
      }

      // สร้าง virtual warehouse locations จาก unique locations
      const locationMap = new Map<string, WarehouseLocation>();

      (inventoryItems || []).forEach(item => {
        const locationCode = normalizeLocation(item.location);
        if (!locationMap.has(locationCode)) {
          const parsed = parseLocation(locationCode);
          locationMap.set(locationCode, {
            id: `virtual-${locationCode}`,
            location_code: locationCode,
            warehouse_id: item.warehouse_id || undefined,
            zone: parsed?.zone,
            row: parsed?.row,
            shelf: parsed?.shelf,
            level: parsed?.level,
            position: parsed?.position,
            description: `Virtual location from inventory`,
            capacity: 100,
            is_active: true,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString()
          });
        }
      });

      const locations = Array.from(locationMap.values()).sort((a, b) =>
        a.location_code.localeCompare(b.location_code)
      );

      return {
        data: locations,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error fetching warehouse locations:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ดึงข้อมูล locations พร้อมจำนวน inventory (สร้างจาก inventory_items)
   */
  static async getLocationsWithInventory(
    searchTerm: string = '',
    limitCount: number = 50,
    offsetCount: number = 0
  ): Promise<WarehouseLocationServiceResult<LocationWithInventoryCount[]>> {
    try {
      // ดึงข้อมูล inventory_items ทั้งหมด
      const { data: inventoryItems, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('id, location, product_name, sku, warehouse_id, created_at, updated_at, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity, unit_level1_name, unit_level2_name, unit_level3_name')
        .not('location', 'is', null);

      if (inventoryError) {
        throw inventoryError;
      }

      // สร้าง location map และรวม inventory
      const locationMap = new Map<string, LocationWithInventoryCount>();

      (inventoryItems || []).forEach(item => {
        const locationCode = normalizeLocation(item.location);

        if (!locationMap.has(locationCode)) {
          const parsed = parseLocation(locationCode);
          locationMap.set(locationCode, {
            id: `virtual-${locationCode}`,
            location_code: locationCode,
            warehouse_id: item.warehouse_id || undefined,
            zone: parsed?.zone,
            row: parsed?.row,
            shelf: parsed?.shelf,
            level: parsed?.level,
            position: parsed?.position,
            description: `Virtual location from inventory`,
            capacity: 100,
            is_active: true,
            created_at: item.created_at || new Date().toISOString(),
            updated_at: item.updated_at || new Date().toISOString(),
            inventory_count: 0,
            total_boxes: 0,
            total_loose: 0,
            total_cartons: 0,
            total_pieces: 0,
            total_sheets: 0,
            total_bottles: 0,
            total_sachets: 0,
            total_quantity_sum: 0,
            product_list: null,
            detailed_inventory: [],
            utilization_percentage: 0
          });
        }

        const location = locationMap.get(locationCode)!;
        location.inventory_count++;
        location.total_boxes += item.unit_level1_quantity || 0;
        location.total_loose += item.unit_level3_quantity || 0;
        location.total_cartons += item.unit_level1_quantity || 0;
        location.total_pieces += item.unit_level3_quantity || 0;
        location.total_quantity_sum += (item.unit_level1_quantity || 0) +
                                      (item.unit_level2_quantity || 0) +
                                      (item.unit_level3_quantity || 0);
      });

      // คำนวณ utilization percentage
      Array.from(locationMap.values()).forEach(location => {
        const totalCapacity = location.capacity || 100;
        location.utilization_percentage = Math.min((location.total_quantity_sum / totalCapacity) * 100, 100);
      });

      let locations = Array.from(locationMap.values());

      // เพิ่ม search filter ถ้ามี
      if (searchTerm.trim()) {
        locations = locations.filter(location =>
          location.location_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (location.description && location.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }

      // Sort by location code
      locations.sort((a, b) => a.location_code.localeCompare(b.location_code));

      // เพิ่ม pagination
      const startIndex = offsetCount;
      const endIndex = offsetCount + limitCount;
      const paginatedData = locations.slice(startIndex, endIndex);

      return {
        data: paginatedData,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error fetching locations with inventory:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ดึงสถิติ locations (คำนวณจาก inventory_items)
   */
  static async getLocationStatistics(): Promise<WarehouseLocationServiceResult<LocationStatistics>> {
    try {
      // ดึงข้อมูล inventory counts โดย location
      const { data: inventoryCounts, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('location, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity')
        .not('location', 'is', null);

      if (inventoryError) throw inventoryError;

      // สร้าง virtual locations จาก inventory_items
      const locationMap = new Map<string, number>();

      (inventoryCounts || []).forEach(item => {
        const locationCode = normalizeLocation(item.location);
        const count = locationMap.get(locationCode) || 0;
        locationMap.set(locationCode, count + 1);
      });

      const locations = Array.from(locationMap.entries()).map(([code, count]) => ({
        id: `virtual-${code}`,
        location_code: code,
        capacity: 100
      }));

      // คำนวณสถิติ
      const stats = this.calculateLocationStatistics(locations, inventoryCounts || []);

      return {
        data: stats,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error getting location statistics:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ดึงรายละเอียด inventory ของ location เฉพาะ (แทน RPC get_location_inventory_details)
   */
  static async getLocationInventoryDetails(locationCode: string): Promise<WarehouseLocationServiceResult<InventoryItem[]>> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('sku, product_name, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity, unit_level1_name, unit_level2_name, unit_level3_name')
        .eq('location', locationCode);

      if (error) {
        console.error('Error fetching location inventory details:', error);
        return {
          data: null,
          error: `ไม่สามารถโหลดรายละเอียดสินค้าได้: ${error.message}`,
          success: false
        };
      }

      // แปลงข้อมูลเป็นรูปแบบ InventoryItem
      const inventoryItems: InventoryItem[] = (data || []).map(item => ({
        sku_code: item.sku || '',
        product_name: item.product_name || '',
        unit: item.unit_level3_name || 'ชิ้น',
        box_quantity: item.unit_level1_quantity || 0,
        loose_quantity: item.unit_level3_quantity || 0,
        total_quantity: (item.unit_level1_quantity || 0) + (item.unit_level2_quantity || 0) + (item.unit_level3_quantity || 0),
        unit_display: `${item.unit_level1_quantity || 0} ${item.unit_level1_name || 'ลัง'}, ${item.unit_level2_quantity || 0} ${item.unit_level2_name || 'กล่อง'}, ${item.unit_level3_quantity || 0} ${item.unit_level3_name || 'ชิ้น'}`
      }));

      return {
        data: inventoryItems,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error getting location inventory details:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * สร้าง virtual warehouse location (ไม่สามารถสร้างจริงใน database)
   */
  static async createLocation(locationData: WarehouseLocationInsert): Promise<WarehouseLocationServiceResult<WarehouseLocation>> {
    try {
      // สำหรับ virtual location เราไม่สร้างจริงใน database
      // แต่จะ return virtual location เพื่อให้ hook ทำงานได้
      const normalizedCode = normalizeLocation(locationData.location_code);
      const parsed = parseLocation(normalizedCode);

      const newLocation: WarehouseLocation = {
        id: `virtual-${normalizedCode}`,
        location_code: normalizedCode,
        warehouse_id: locationData.warehouse_id,
        zone: locationData.zone || parsed?.zone,
        row: locationData.row || parsed?.row,
        shelf: locationData.shelf || parsed?.shelf,
        level: locationData.level || parsed?.level,
        position: locationData.position || parsed?.position,
        description: locationData.description || `Virtual location`,
        capacity: locationData.capacity || 100,
        is_active: locationData.is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return {
        data: newLocation,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error creating location:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * อัปเดต virtual warehouse location (ไม่สามารถแก้ไขจริงใน database)
   */
  static async updateLocation(id: string, locationData: WarehouseLocationUpdate): Promise<WarehouseLocationServiceResult<WarehouseLocation>> {
    try {
      // สำหรับ virtual location เราไม่อัปเดตจริงใน database
      // แต่จะ return updated virtual location
      const locationCode = locationData.location_code || id.replace('virtual-', '');
      const parsed = parseLocation(locationCode);

      const updatedLocation: WarehouseLocation = {
        id,
        location_code: locationCode,
        warehouse_id: locationData.warehouse_id,
        zone: locationData.zone || parsed?.zone,
        row: locationData.row || parsed?.row,
        shelf: locationData.shelf || parsed?.shelf,
        level: locationData.level || parsed?.level,
        position: locationData.position || parsed?.position,
        description: locationData.description || `Virtual location`,
        capacity: locationData.capacity || 100,
        is_active: locationData.is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return {
        data: updatedLocation,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error updating location:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ลบ virtual warehouse location (ไม่ลบจริงจาก database)
   */
  static async deleteLocation(id: string): Promise<WarehouseLocationServiceResult<boolean>> {
    try {
      // สำหรับ virtual location เราไม่ลบจริงจาก database
      // แต่จะ return success เพื่อให้ hook ทำงานได้

      // ตรวจสอบว่ามี inventory ใน location นี้หรือไม่
      const locationCode = id.replace('virtual-', '');
      const { data: inventoryItems, error } = await supabase
        .from('inventory_items')
        .select('id')
        .eq('location', locationCode)
        .limit(1);

      if (error) {
        return {
          data: null,
          error: `ไม่สามารถตรวจสอบสินค้าได้: ${error.message}`,
          success: false
        };
      }

      if (inventoryItems && inventoryItems.length > 0) {
        return {
          data: null,
          error: 'ตำแหน่งนี้มีสินค้าคงคลังอยู่ กรุณาย้ายสินค้าก่อนลบ',
          success: false
        };
      }

      return {
        data: true,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error deleting location:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ค้นหา virtual location ตาม code (จาก inventory_items)
   */
  static async getLocationByCode(locationCode: string): Promise<WarehouseLocationServiceResult<WarehouseLocation | null>> {
    try {
      const normalizedCode = normalizeLocation(locationCode);

      // ค้นหาใน inventory_items ว่ามี location นี้หรือไม่
      const { data: inventoryItems, error } = await supabase
        .from('inventory_items')
        .select('location, warehouse_id, created_at, updated_at')
        .eq('location', normalizedCode)
        .limit(1);

      if (error) {
        console.error('Error getting location by code:', error);
        return {
          data: null,
          error: `ไม่สามารถค้นหาตำแหน่งได้: ${error.message}`,
          success: false
        };
      }

      if (!inventoryItems || inventoryItems.length === 0) {
        return {
          data: null,
          error: null,
          success: true
        };
      }

      // สร้าง virtual location จากข้อมูลที่พบ
      const item = inventoryItems[0];
      const parsed = parseLocation(normalizedCode);

      const virtualLocation: WarehouseLocation = {
        id: `virtual-${normalizedCode}`,
        location_code: normalizedCode,
        warehouse_id: item.warehouse_id || undefined,
        zone: parsed?.zone,
        row: parsed?.row,
        shelf: parsed?.shelf,
        level: parsed?.level,
        position: parsed?.position,
        description: `Virtual location from inventory`,
        capacity: 100,
        is_active: true,
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || new Date().toISOString()
      };

      return {
        data: virtualLocation,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error getting location by code:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * สร้าง virtual location อัตโนมัติจากข้อมูล inventory location
   */
  static async autoCreateLocationFromInventory(location: string): Promise<WarehouseLocationServiceResult<WarehouseLocation | null>> {
    try {
      const normalizedLocation = normalizeLocation(location);

      if (!isValidLocation(normalizedLocation)) {
        return {
          data: null,
          error: 'รูปแบบ location ไม่ถูกต้อง',
          success: false
        };
      }

      // ตรวจสอบว่ามี location อยู่แล้วหรือไม่
      const existingResult = await this.getLocationByCode(normalizedLocation);
      if (existingResult.success && existingResult.data) {
        return existingResult;
      }

      // Parse location components
      const parsed = parseLocation(normalizedLocation);
      if (!parsed) {
        return {
          data: null,
          error: 'ไม่สามารถแยกข้อมูล location ได้',
          success: false
        };
      }

      // สร้าง virtual location ใหม่
      const newLocationData: WarehouseLocationInsert = {
        location_code: normalizedLocation,
        row: parsed.row,
        level: parsed.level,
        position: parsed.position,
        description: `Auto-created from inventory (${normalizedLocation})`,
        capacity: 100
      };

      return await this.createLocation(newLocationData);
    } catch (error) {
      console.error('Unexpected error auto-creating location:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ซิงค์ inventory locations เป็น virtual locations (ไม่จัดเก็บจริงใน database)
   */
  static async syncInventoryLocations(): Promise<WarehouseLocationServiceResult<string>> {
    try {
      // ดึง unique locations จาก inventory_items
      const { data: inventoryLocations, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('location')
        .not('location', 'is', null);

      if (inventoryError) throw inventoryError;

      const uniqueLocations = [...new Set(inventoryLocations?.map(item => item.location).filter(Boolean) || [])];
      let syncCount = 0;

      // นับจำนวน virtual locations ที่สามารถสร้างได้
      for (const location of uniqueLocations) {
        const normalizedLocation = normalizeLocation(location);
        if (isValidLocation(normalizedLocation)) {
          syncCount++;
        }
      }

      return {
        data: `Found ${syncCount} valid locations from inventory`,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error syncing inventory locations:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }


  /**
   * Helper function: คำนวณสถิติ locations
   */
  private static calculateLocationStatistics(
    locations: any[],
    inventoryCounts: any[]
  ): LocationStatistics {
    const locationInventoryMap = new Map<string, number>();

    // นับจำนวน inventory แต่ละ location
    inventoryCounts.forEach(item => {
      const location = item.location;
      const count = locationInventoryMap.get(location) || 0;
      locationInventoryMap.set(location, count + 1);
    });

    const totalLocations = locations.length;
    const locationsWithInventory = Array.from(locationInventoryMap.keys()).length;

    // คำนวณ utilization levels (สมมติ)
    let highUtil = 0, mediumUtil = 0, lowUtil = 0;
    locationInventoryMap.forEach(count => {
      if (count >= 10) highUtil++;
      else if (count >= 5) mediumUtil++;
      else lowUtil++;
    });

    return {
      total_locations: totalLocations,
      total_with_inventory: locationsWithInventory,
      high_utilization_count: highUtil,
      medium_utilization_count: mediumUtil,
      low_utilization_count: lowUtil,
      empty_locations: totalLocations - locationsWithInventory,
      average_utilization: locationsWithInventory > 0 ?
        Array.from(locationInventoryMap.values()).reduce((sum, count) => sum + count, 0) / locationsWithInventory : 0
    };
  }
}

// สำหรับการใช้งานแบบ helper functions
export const warehouseLocationService = WarehouseLocationService;

// Export types for external use
export type {
  WarehouseLocation,
  WarehouseLocationInsert,
  WarehouseLocationUpdate,
  LocationWithInventoryCount,
  LocationStatistics,
  InventoryItem
};