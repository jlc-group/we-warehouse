import { supabase } from '@/integrations/supabase/client';

export interface DatabaseServiceResult<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface TableInfo {
  table_name: string;
  table_schema?: string;
}

export interface InventoryAnalysis {
  total: number;
  unique: number;
  samples: string[];
  format: string;
}

export interface MovementAnalysis {
  total: number;
  types: string[];
  typeCounts: Array<{ type: string; count: number }>;
}

export class DatabaseService {
  /**
   * ดึงข้อมูล inventory items สำหรับการวิเคราะห์
   */
  static async getInventoryItemsSample(limit: number = 20): Promise<DatabaseServiceResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .limit(limit);

      if (error) {
        console.error('Error fetching inventory items:', error);
        return {
          data: null,
          error: `ไม่สามารถโหลดข้อมูล inventory items ได้: ${error.message}`,
          success: false
        };
      }

      return {
        data: data || [],
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error fetching inventory items:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ดึงข้อมูล inventory movements สำหรับการวิเคราะห์
   */
  static async getInventoryMovementsSample(limit: number = 20): Promise<DatabaseServiceResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('inventory_movements')
        .select('*')
        .limit(limit);

      if (error) {
        console.error('Error fetching inventory movements:', error);
        return {
          data: null,
          error: `ไม่สามารถโหลดข้อมูล inventory movements ได้: ${error.message}`,
          success: false
        };
      }

      return {
        data: data || [],
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error fetching inventory movements:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ดึงข้อมูล products สำหรับการวิเคราะห์
   */
  static async getProductsSample(limit: number = 10): Promise<DatabaseServiceResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(limit);

      if (error) {
        console.error('Error fetching products:', error);
        return {
          data: null,
          error: `ไม่สามารถโหลดข้อมูล products ได้: ${error.message}`,
          success: false
        };
      }

      return {
        data: data || [],
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error fetching products:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ดึงรายชื่อตารางในระบบ (แทน RPC get_table_names)
   */
  static async getTableNames(): Promise<DatabaseServiceResult<string[]>> {
    try {
      // ใช้วิธีการ query จาก information_schema
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (error) {
        console.warn('Could not fetch table names from information_schema:', error);

        // Fallback: ใช้รายชื่อตารางที่รู้จัก
        const knownTables = [
          'inventory_items',
          'inventory_movements',
          'products',
          'product_conversion_rates',
          'profiles',
          'events',
          'bookings',
          'warehouse_locations',
          'location_qr_codes',
          'customers',
          'customer_orders',
          'order_items',
          'warehouses'
        ];

        return {
          data: knownTables,
          error: null,
          success: true
        };
      }

      const tableNames = data?.map(row => row.table_name) || [];

      return {
        data: tableNames,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error getting table names:', error);

      // Fallback: ใช้รายชื่อตารางที่รู้จัก
      const knownTables = [
        'inventory_items',
        'inventory_movements',
        'products',
        'product_conversion_rates',
        'profiles',
        'events',
        'bookings',
        'warehouse_locations',
        'location_qr_codes'
      ];

      return {
        data: knownTables,
        error: null,
        success: true
      };
    }
  }

  /**
   * วิเคราะห์ location patterns จากข้อมูล inventory
   */
  static analyzeLocations(inventoryItems: any[]): InventoryAnalysis {
    const locations = inventoryItems.map(item => item.location).filter(Boolean);
    const uniqueLocations = [...new Set(locations)];
    const locationPattern = uniqueLocations.slice(0, 10);

    return {
      total: locations.length,
      unique: uniqueLocations.length,
      samples: locationPattern,
      format: locationPattern[0] ? this.getLocationFormat(locationPattern[0]) : 'ไม่ทราบ'
    };
  }

  /**
   * วิเคราะห์ movement types จากข้อมูล movements
   */
  static analyzeMovements(inventoryMovements: any[]): MovementAnalysis {
    const movementTypes = inventoryMovements.map(m => m.movement_type).filter(Boolean);
    const uniqueTypes = [...new Set(movementTypes)];

    return {
      total: movementTypes.length,
      types: uniqueTypes,
      typeCounts: uniqueTypes.map(type => ({
        type,
        count: movementTypes.filter(t => t === type).length
      }))
    };
  }

  /**
   * กำหนดรูปแบบของ location
   */
  static getLocationFormat(location: string): string {
    if (/^[A-Z]\d+\/\d+$/.test(location)) return 'Letter+Number/Number (เช่น A1/1)';
    if (/^[A-Z]\d+$/.test(location)) return 'Letter+Number (เช่น A1)';
    return 'รูปแบบอื่น';
  }

  /**
   * ดึงข้อมูลสำหรับการวิเคราะห์ครบชุด
   */
  static async getAnalysisData(): Promise<DatabaseServiceResult<{
    inventoryItems: any[];
    inventoryMovements: any[];
    products: any[];
    tablesList: string[];
    locationAnalysis: InventoryAnalysis;
    movementAnalysis: MovementAnalysis;
  }>> {
    try {
      // ดึงข้อมูลทั้งหมดพร้อมกัน
      const [
        inventoryResult,
        movementsResult,
        productsResult,
        tablesResult
      ] = await Promise.all([
        this.getInventoryItemsSample(20),
        this.getInventoryMovementsSample(20),
        this.getProductsSample(10),
        this.getTableNames()
      ]);

      // ตรวจสอบ errors
      if (!inventoryResult.success) throw new Error(inventoryResult.error || 'Failed to fetch inventory');
      if (!movementsResult.success) throw new Error(movementsResult.error || 'Failed to fetch movements');
      if (!productsResult.success) throw new Error(productsResult.error || 'Failed to fetch products');
      if (!tablesResult.success) throw new Error(tablesResult.error || 'Failed to fetch tables');

      const inventoryItems = inventoryResult.data || [];
      const inventoryMovements = movementsResult.data || [];
      const products = productsResult.data || [];
      const tablesList = tablesResult.data || [];

      // วิเคราะห์ข้อมูล
      const locationAnalysis = this.analyzeLocations(inventoryItems);
      const movementAnalysis = this.analyzeMovements(inventoryMovements);

      return {
        data: {
          inventoryItems,
          inventoryMovements,
          products,
          tablesList,
          locationAnalysis,
          movementAnalysis
        },
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error getting analysis data:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ตรวจสอบการเชื่อมต่อ database
   */
  static async testConnection(): Promise<DatabaseServiceResult<boolean>> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id')
        .limit(1);

      if (error) {
        return {
          data: false,
          error: `การเชื่อมต่อ database ล้มเหลว: ${error.message}`,
          success: false
        };
      }

      return {
        data: true,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Database connection test failed:', error);
      return {
        data: false,
        error: 'เกิดข้อผิดพลาดในการทดสอบการเชื่อมต่อ',
        success: false
      };
    }
  }

  /**
   * ดึงข้อมูลโครงสร้างของตาราง
   */
  static async getTableStructure(tableName: string): Promise<DatabaseServiceResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', tableName)
        .eq('table_schema', 'public')
        .order('ordinal_position');

      if (error) {
        console.error(`Error fetching table structure for ${tableName}:`, error);
        return {
          data: null,
          error: `ไม่สามารถโหลดโครงสร้างตาราง ${tableName} ได้: ${error.message}`,
          success: false
        };
      }

      return {
        data: data || [],
        error: null,
        success: true
      };
    } catch (error) {
      console.error(`Unexpected error fetching table structure for ${tableName}:`, error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }
}

// สำหรับการใช้งานแบบ helper functions
export const databaseService = DatabaseService;

export type { TableInfo, InventoryAnalysis, MovementAnalysis };