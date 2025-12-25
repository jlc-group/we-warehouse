/**
 * AI Data Provider - ให้ AI เข้าถึงข้อมูลทั้งหมดได้
 * 
 * Features:
 * - Query inventory data
 * - Query sales data
 * - Query customer data
 * - Query product data
 * - Aggregations & Analytics
 */

import { supabase } from '@/integrations/supabase/client';
import { SCHEMA_METADATA, TableMeta } from './aiSchemaMetadata';

const SALES_API_BASE = import.meta.env.VITE_SALES_API_URL || '/api';

// ========== TYPES ==========

export interface AIQueryResult<T = any> {
  success: boolean;
  data: T | null;
  error?: string;
  source: string;
  timestamp: Date;
}

export interface ProductInfo {
  sku: string;
  productName: string;
  totalStock: number;
  locations: Array<{
    location: string;
    quantity: number;
  }>;
  lastMovement?: Date;
}

export interface CustomerInfo {
  arcode: string;
  arname: string;
  totalPurchases: number;
  orderCount: number;
  lastPurchase?: string;
  topProducts: Array<{
    productCode: string;
    productName: string;
    quantity: number;
    amount: number;
  }>;
}

export interface InventorySummary {
  totalItems: number;
  totalLocations: number;
  totalValue: number;
  byProductType: Record<string, number>;
  lowStockItems: Array<{
    sku: string;
    productName: string;
    quantity: number;
    location: string;
  }>;
}

export interface SalesSummary {
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  topProducts: Array<{
    productCode: string;
    productName: string;
    totalSales: number;
    quantity: number;
  }>;
  topCustomers: Array<{
    arcode: string;
    arname: string;
    totalPurchases: number;
  }>;
  dailyTrend: Array<{
    date: string;
    amount: number;
  }>;
}

export interface ProductTrend {
  productCode: string;
  productName: string;
  currentSales: number;
  previousSales: number;
  growth: number;
  growthPercent: number;
}

export interface CustomerTrend {
  arcode: string;
  arname: string;
  currentPurchases: number;
  previousPurchases: number;
  growth: number;
  growthPercent: number;
}

export interface TrendPeriodInfo {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
}

export interface TopDroppingProductsResult {
  period: TrendPeriodInfo;
  products: ProductTrend[];
}

export interface TopDroppingCustomersResult {
  period: TrendPeriodInfo;
  customers: CustomerTrend[];
}

export interface RecommendedStockResult {
  sku: string;
  productName: string;
  currentStock: number;
  averageDailySales: number;
  coverageDays: number;
  safetyDays: number;
  safetyStock: number;
  recommendedStock: number;
  suggestedOrderQty: number;
  totalSold: number;
  periodStart: string;
  periodEnd: string;
  samplesDays: number;
}

export interface MovementHistory {
  id: string;
  action: string;
  productName: string;
  sku: string;
  quantity: number;
  location: string;
  timestamp: Date;
  user?: string;
}

export interface WarehouseStat {
  warehouseId: string;
  warehouseName: string;
  warehouseCode?: string;
  isActive?: boolean;
  totalItems: number;
  totalQuantity: number;
  uniqueSkus: number;
  usedLocations: number;
}

export interface WarehouseOverview {
  totalWarehouses: number;
  activeWarehouses: number;
  totalItems: number;
  totalQuantity: number;
  topWarehousesByQuantity: WarehouseStat[];
}

export interface TableSampleResult {
  table: string;
  rowCount: number;
  rows: any[];
}

// ========== AI DATA TOOLS ==========

/**
 * Tool definitions สำหรับ AI
 */
export const AI_TOOLS = {
  // Inventory Tools
  getInventorySummary: {
    name: 'getInventorySummary',
    description: 'ดึงข้อมูลสรุปสินค้าในคลังทั้งหมด',
    parameters: {}
  },
  getProductInfo: {
    name: 'getProductInfo',
    description: 'ดึงข้อมูลสินค้าตาม SKU หรือชื่อ',
    parameters: {
      query: { type: 'string', description: 'SKU หรือชื่อสินค้า' }
    }
  },
  searchInventory: {
    name: 'searchInventory',
    description: 'ค้นหาสินค้าในคลัง',
    parameters: {
      query: { type: 'string', description: 'คำค้นหา' },
      limit: { type: 'number', description: 'จำนวนผลลัพธ์' }
    }
  },
  getLowStockItems: {
    name: 'getLowStockItems',
    description: 'ดึงรายการสินค้าที่ stock ต่ำ',
    parameters: {
      threshold: { type: 'number', description: 'จำนวน stock ขั้นต่ำ' }
    }
  },
  getLocationInfo: {
    name: 'getLocationInfo',
    description: 'ดึงข้อมูลสินค้าในตำแหน่งที่ระบุ',
    parameters: {
      location: { type: 'string', description: 'รหัสตำแหน่ง เช่น A/1/01' }
    }
  },
  
  // Movement Tools
  getRecentMovements: {
    name: 'getRecentMovements',
    description: 'ดึงประวัติการเคลื่อนไหวล่าสุด',
    parameters: {
      limit: { type: 'number', description: 'จำนวนรายการ' }
    }
  },
  getProductMovements: {
    name: 'getProductMovements',
    description: 'ดึงประวัติการเคลื่อนไหวของสินค้า',
    parameters: {
      sku: { type: 'string', description: 'รหัสสินค้า' }
    }
  },
  
  // Analytics Tools
  getInventoryAnalytics: {
    name: 'getInventoryAnalytics',
    description: 'วิเคราะห์ข้อมูลสินค้าในคลัง',
    parameters: {}
  },
  getSchemaOverview: {
    name: 'getSchemaOverview',
    description: 'อธิบายตารางสำคัญในฐานข้อมูลสำหรับ AI (schema overview)',
    parameters: {}
  },
  getTableSchema: {
    name: 'getTableSchema',
    description: 'ดึงรายละเอียดโครงสร้างตาราง (columns) ตามชื่อที่ระบุ',
    parameters: {
      tableName: { type: 'string', description: 'ชื่อตาราง เช่น inventory_items' }
    }
  },
  getTableSampleRows: {
    name: 'getTableSampleRows',
    description: 'ดึงตัวอย่างข้อมูลจากตารางที่ระบุ เพื่อให้ AI เห็นรูปแบบข้อมูลจริง',
    parameters: {
      tableName: { type: 'string', description: 'ชื่อตาราง เช่น inventory_items' },
      limit: { type: 'number', description: 'จำนวนแถวตัวอย่าง (default 5)' }
    }
  },
  getRecommendedStock: {
    name: 'getRecommendedStock',
    description: 'คำนวณสต็อกที่ควรมีตามยอดขายย้อนหลังและสต็อกปัจจุบัน (โหมดเน้นไม่ให้ของขาด)',
    parameters: {
      sku: { type: 'string', description: 'รหัสสินค้า (SKU หรือรหัสขาย)' },
      coverageDays: { type: 'number', description: 'จำนวนวันเผื่อสต็อกข้างหน้า เช่น 45' },
      startDate: { type: 'string', description: 'วันที่เริ่มต้นดูยอดขายย้อนหลัง (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'วันที่สิ้นสุดดูยอดขายย้อนหลัง (YYYY-MM-DD)' }
    }
  },
  
  // Warehouse Tools
  getWarehouseStats: {
    name: 'getWarehouseStats',
    description: 'ดึงสถิติสินค้าแยกตามคลัง',
    parameters: {}
  },
  getWarehouseOverview: {
    name: 'getWarehouseOverview',
    description: 'ดึงภาพรวมคลังสินค้าและการใช้งาน',
    parameters: {}
  },

  // Sales & Finance Tools
  getSalesOverview: {
    name: 'getSalesOverview',
    description: 'ดึงภาพรวมยอดขายและลูกค้า (Sales & Finance Overview)',
    parameters: {
      startDate: { type: 'string', description: 'วันที่เริ่มต้น (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'วันที่สิ้นสุด (YYYY-MM-DD)' }
    }
  },
  getTopDroppingProducts: {
    name: 'getTopDroppingProducts',
    description: 'ดึงรายการสินค้าที่มียอดขายลดลงมากที่สุดเมื่อเทียบกับช่วงก่อนหน้า',
    parameters: {
      startDate: { type: 'string', description: 'วันที่เริ่มต้นช่วงปัจจุบัน (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'วันที่สิ้นสุดช่วงปัจจุบัน (YYYY-MM-DD)' },
      limit: { type: 'number', description: 'จำนวนสินค้าที่ต้องการ (default 5)' }
    }
  },
  getTopDroppingCustomers: {
    name: 'getTopDroppingCustomers',
    description: 'ดึงรายการลูกค้าที่มียอดซื้อลดลงมากที่สุดเมื่อเทียบกับช่วงก่อนหน้า',
    parameters: {
      startDate: { type: 'string', description: 'วันที่เริ่มต้นช่วงปัจจุบัน (YYYY-MM-DD)' },
      endDate: { type: 'string', description: 'วันที่สิ้นสุดช่วงปัจจุบัน (YYYY-MM-DD)' },
      limit: { type: 'number', description: 'จำนวนลูกค้าที่ต้องการ (default 5)' }
    }
  }
};

// ========== DATA PROVIDER CLASS ==========

export class AIDataProvider {
  private static instance: AIDataProvider;
  
  private constructor() {}
  
  static getInstance(): AIDataProvider {
    if (!AIDataProvider.instance) {
      AIDataProvider.instance = new AIDataProvider();
    }
    return AIDataProvider.instance;
  }
  
  // ========== INVENTORY QUERIES ==========
  
  /**
   * ดึงข้อมูลสรุป Inventory ทั้งหมด
   */
  async getInventorySummary(): Promise<AIQueryResult<InventorySummary>> {
    try {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('*');
      
      if (error) throw error;
      
      const totalItems = items?.length || 0;
      const locations = new Set(items?.map(i => i.location) || []);
      
      // Group by product type (from SKU prefix)
      const byProductType: Record<string, number> = {};
      items?.forEach(item => {
        const type = item.sku?.startsWith('FG') ? 'FG' : 
                     item.sku?.startsWith('PK') ? 'PK' : 
                     item.sku?.startsWith('RM') ? 'RM' : 'Other';
        byProductType[type] = (byProductType[type] || 0) + 1;
      });
      
      // Find low stock items (less than 10)
      const lowStockItems = items
        ?.filter(i => (i.unit_level3_quantity || 0) < 10)
        .slice(0, 10)
        .map(i => ({
          sku: i.sku || '',
          productName: i.product_name || '',
          quantity: i.unit_level3_quantity || 0,
          location: i.location || ''
        })) || [];
      
      return {
        success: true,
        data: {
          totalItems,
          totalLocations: locations.size,
          totalValue: 0, // TODO: Calculate if price data available
          byProductType,
          lowStockItems
        },
        source: 'inventory_items',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'inventory_items',
        timestamp: new Date()
      };
    }
  }
  
  // ========== WAREHOUSE QUERIES ==========

  async getWarehouseStats(): Promise<AIQueryResult<WarehouseStat[]>> {
    try {
      const { data: warehouses, error: warehousesError } = await supabase
        .from('warehouses')
        .select('id, name, code, is_active');

      if (warehousesError) throw warehousesError;

      const { data: inventoryItems, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('warehouse_id, sku, product_name, location, quantity_pieces, unit_level3_quantity');

      if (inventoryError) throw inventoryError;

      const stats: WarehouseStat[] = (warehouses || []).map((warehouse: any) => {
        const items = (inventoryItems || []).filter((item: any) => item.warehouse_id === warehouse.id);

        const totalQuantity = items.reduce((sum: number, item: any) => {
          const qty = (item.quantity_pieces ?? item.unit_level3_quantity ?? 0) as number;
          return sum + qty;
        }, 0);

        const uniqueSkus = new Set(items.map((item: any) => item.sku)).size;
        const usedLocations = new Set(items.map((item: any) => item.location)).size;

        return {
          warehouseId: warehouse.id,
          warehouseName: warehouse.name,
          warehouseCode: warehouse.code,
          isActive: warehouse.is_active,
          totalItems: items.length,
          totalQuantity,
          uniqueSkus,
          usedLocations
        };
      });

      return {
        success: true,
        data: stats,
        source: 'warehouses_stats',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'warehouses_stats',
        timestamp: new Date()
      };
    }
  }

  async getWarehouseOverview(): Promise<AIQueryResult<WarehouseOverview>> {
    try {
      const statsResult = await this.getWarehouseStats();

      if (!statsResult.success || !statsResult.data) {
        return {
          success: false,
          data: null,
          error: statsResult.error || 'Failed to load warehouse stats',
          source: 'warehouses_overview',
          timestamp: new Date()
        };
      }

      const stats = statsResult.data;
      const totalWarehouses = stats.length;
      const activeWarehouses = stats.filter(w => w.isActive).length;
      const totalItems = stats.reduce((sum, w) => sum + w.totalItems, 0);
      const totalQuantity = stats.reduce((sum, w) => sum + w.totalQuantity, 0);

      const topWarehousesByQuantity = [...stats]
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5);

      return {
        success: true,
        data: {
          totalWarehouses,
          activeWarehouses,
          totalItems,
          totalQuantity,
          topWarehousesByQuantity
        },
        source: 'warehouses_overview',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'warehouses_overview',
        timestamp: new Date()
      };
    }
  }
  
  /**
   * ค้นหาสินค้าตาม SKU หรือชื่อ
   */
  async getProductInfo(query: string): Promise<AIQueryResult<ProductInfo[]>> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .or(`sku.ilike.%${query}%,product_name.ilike.%${query}%`)
        .limit(20);
      
      if (error) throw error;
      
      // Group by SKU
      const productMap = new Map<string, ProductInfo>();
      
      data?.forEach(item => {
        const sku = item.sku || 'unknown';
        const existing = productMap.get(sku);
        
        if (existing) {
          existing.totalStock += item.unit_level3_quantity || 0;
          existing.locations.push({
            location: item.location || '',
            quantity: item.unit_level3_quantity || 0
          });
        } else {
          productMap.set(sku, {
            sku,
            productName: item.product_name || '',
            totalStock: item.unit_level3_quantity || 0,
            locations: [{
              location: item.location || '',
              quantity: item.unit_level3_quantity || 0
            }]
          });
        }
      });
      
      return {
        success: true,
        data: Array.from(productMap.values()),
        source: 'inventory_items',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'inventory_items',
        timestamp: new Date()
      };
    }
  }
  
  /**
   * ค้นหาสินค้าในคลัง
   */
  async searchInventory(query: string, limit: number = 10): Promise<AIQueryResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, sku, product_name, location, unit_level3_quantity, lot, mfd, exp')
        .or(`sku.ilike.%${query}%,product_name.ilike.%${query}%,location.ilike.%${query}%`)
        .limit(limit);
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || [],
        source: 'inventory_items',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'inventory_items',
        timestamp: new Date()
      };
    }
  }
  
  /**
   * ดึงสินค้า stock ต่ำ
   */
  async getLowStockItems(threshold: number = 10): Promise<AIQueryResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('sku, product_name, location, unit_level3_quantity')
        .lt('unit_level3_quantity', threshold)
        .gt('unit_level3_quantity', 0)
        .order('unit_level3_quantity', { ascending: true })
        .limit(20);
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || [],
        source: 'inventory_items',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'inventory_items',
        timestamp: new Date()
      };
    }
  }
  
  /**
   * ดึงข้อมูลตำแหน่ง
   */
  async getLocationInfo(location: string): Promise<AIQueryResult<any[]>> {
    try {
      // Normalize location format
      const normalizedLocation = location.replace(/\//g, '/').toUpperCase();
      
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .ilike('location', `%${normalizedLocation}%`);
      
      if (error) throw error;
      
      return {
        success: true,
        data: data || [],
        source: 'inventory_items',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'inventory_items',
        timestamp: new Date()
      };
    }
  }
  
  // ========== MOVEMENT QUERIES ==========
  
  /**
   * ดึงประวัติการเคลื่อนไหวล่าสุด
   */
  async getRecentMovements(limit: number = 20): Promise<AIQueryResult<MovementHistory[]>> {
    try {
      const { data, error } = await supabase
        .from('inventory_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      const movements: MovementHistory[] = (data || []).map(item => ({
        id: item.id,
        action: item.action || '',
        productName: item.product_name || '',
        sku: item.sku || '',
        quantity: item.quantity_change || 0,
        location: item.location || '',
        timestamp: new Date(item.created_at),
        user: item.user_id
      }));
      
      return {
        success: true,
        data: movements,
        source: 'inventory_history',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'inventory_history',
        timestamp: new Date()
      };
    }
  }
  
  /**
   * ดึงประวัติการเคลื่อนไหวของสินค้า
   */
  async getProductMovements(sku: string): Promise<AIQueryResult<MovementHistory[]>> {
    try {
      const { data, error } = await supabase
        .from('inventory_history')
        .select('*')
        .ilike('sku', `%${sku}%`)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      const movements: MovementHistory[] = (data || []).map(item => ({
        id: item.id,
        action: item.action || '',
        productName: item.product_name || '',
        sku: item.sku || '',
        quantity: item.quantity_change || 0,
        location: item.location || '',
        timestamp: new Date(item.created_at),
        user: item.user_id
      }));
      
      return {
        success: true,
        data: movements,
        source: 'inventory_history',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'inventory_history',
        timestamp: new Date()
      };
    }
  }
  
  // ========== ANALYTICS QUERIES ==========
  
  /**
   * วิเคราะห์ข้อมูล Inventory
   */
  async getInventoryAnalytics(): Promise<AIQueryResult<any>> {
    try {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select('*');
      
      if (error) throw error;
      
      // Calculate analytics
      const totalItems = items?.length || 0;
      const uniqueSkus = new Set(items?.map(i => i.sku) || []).size;
      const uniqueLocations = new Set(items?.map(i => i.location) || []).size;
      
      // Top products by quantity
      const skuQuantities = new Map<string, { sku: string; name: string; total: number }>();
      items?.forEach(item => {
        const existing = skuQuantities.get(item.sku || '');
        if (existing) {
          existing.total += item.unit_level3_quantity || 0;
        } else {
          skuQuantities.set(item.sku || '', {
            sku: item.sku || '',
            name: item.product_name || '',
            total: item.unit_level3_quantity || 0
          });
        }
      });
      
      const topByQuantity = Array.from(skuQuantities.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
      
      // Empty locations
      const occupiedLocations = new Set(items?.map(i => i.location) || []);
      
      return {
        success: true,
        data: {
          totalItems,
          uniqueSkus,
          uniqueLocations,
          occupiedLocations: occupiedLocations.size,
          topProductsByQuantity: topByQuantity,
          summary: {
            averageItemsPerLocation: totalItems / (uniqueLocations || 1),
            skuDiversity: uniqueSkus
          }
        },
        source: 'analytics',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'analytics',
        timestamp: new Date()
      };
    }
  }
  
  async getSchemaOverview(): Promise<AIQueryResult<TableMeta[]>> {
    try {
      const tables = Object.values(SCHEMA_METADATA);
      return {
        success: true,
        data: tables,
        source: 'schema_overview',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'schema_overview',
        timestamp: new Date()
      };
    }
  }

  async getTableSchema(tableName: string): Promise<AIQueryResult<TableMeta>> {
    try {
      const normalized = tableName.trim();
      const meta = SCHEMA_METADATA[normalized as keyof typeof SCHEMA_METADATA];

      if (!meta) {
        throw new Error(`ไม่พบ schema สำหรับตาราง ${normalized}`);
      }

      return {
        success: true,
        data: meta,
        source: `schema_${normalized}`,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'schema_table',
        timestamp: new Date()
      };
    }
  }

  async getTableSampleRows(tableName: string, limit: number = 5): Promise<AIQueryResult<TableSampleResult>> {
    try {
      const normalized = tableName.trim();
      if (!normalized) {
        throw new Error('ต้องระบุชื่อตารางเพื่อดึงตัวอย่างข้อมูล');
      }

      if (!SCHEMA_METADATA[normalized as keyof typeof SCHEMA_METADATA]) {
        throw new Error(`ตาราง ${normalized} ยังไม่ได้เปิดให้ AI ใช้งานในโหมดตัวอย่างข้อมูล`);
      }

      const { data, error } = await supabase
        .from(normalized)
        .select('*')
        .limit(limit);

      if (error) throw error;

      const rows = data || [];

      const result: TableSampleResult = {
        table: normalized,
        rowCount: rows.length,
        rows
      };

      return {
        success: true,
        data: result,
        source: `samples_${normalized}`,
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'schema_samples',
        timestamp: new Date()
      };
    }
  }
  
  async getRecommendedStock(params: {
    sku: string;
    coverageDays?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<AIQueryResult<RecommendedStockResult>> {
    try {
      const rawSku = (params.sku || '').trim();
      if (!rawSku) {
        throw new Error('ต้องระบุรหัสสินค้า (SKU) เพื่อคำนวณสต็อกที่แนะนำ');
      }

      const skuUpper = rawSku.toUpperCase();

      const { data: items, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('sku, product_name, unit_level3_quantity')
        .ilike('sku', `%${skuUpper}%`);

      if (inventoryError) throw inventoryError;

      let currentStock = 0;
      let productName = '';

      (items || []).forEach((item: any) => {
        const qty = (item.unit_level3_quantity ?? 0) as number;
        currentStock += qty;
        if (!productName && item.product_name) {
          productName = item.product_name;
        }
      });

      const now = new Date();
      const effectiveEnd = params.endDate || now.toISOString().split('T')[0];
      let effectiveStart: string;

      if (params.startDate) {
        effectiveStart = params.startDate;
      } else {
        const startObj = params.endDate ? new Date(params.endDate) : new Date(now);
        startObj.setDate(startObj.getDate() - 120);
        effectiveStart = startObj.toISOString().split('T')[0];
      }

      const searchParams = new URLSearchParams();
      searchParams.append('startDate', effectiveStart);
      searchParams.append('endDate', effectiveEnd);
      searchParams.append('limit', '5000');

      const productsUrl = `${SALES_API_BASE}/analytics/products?${searchParams.toString()}`;
      const productsRes = await fetch(productsUrl);

      if (!productsRes.ok) {
        throw new Error(`Failed to fetch product analytics: ${productsRes.statusText}`);
      }

      const productsJson = await productsRes.json();

      if (!productsJson.success) {
        throw new Error(productsJson.error || 'Failed to fetch product analytics');
      }

      const productList = productsJson.data as any[];
      const skuLower = skuUpper.toLowerCase();

      let productRow = productList.find((p: any) => {
        const code = (p.productCode || p.productcode || p.code || p.sku || '').toString().toLowerCase();
        return code === skuLower;
      });

      if (!productRow) {
        productRow = productList.find((p: any) => {
          const code = (p.productCode || p.productcode || p.code || p.sku || '').toString().toLowerCase();
          return code.includes(skuLower);
        });
      }

      const totalSold = productRow
        ? Number(productRow.totalQuantity ?? productRow.quantity ?? 0)
        : 0;

      const startDateObj = new Date(effectiveStart);
      const endDateObj = new Date(effectiveEnd);
      const diffMs = endDateObj.getTime() - startDateObj.getTime();
      const samplesDays = diffMs >= 0
        ? Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1)
        : 1;

      const coverageDays = Math.max(1, Number.isFinite(params.coverageDays as number) && params.coverageDays
        ? Number(params.coverageDays)
        : 45);

      let averageDailySales = 0;
      let safetyDays = Math.max(7, Math.round(coverageDays * 0.3));
      let safetyStock = 0;
      let recommendedStock = currentStock;
      let suggestedOrderQty = 0;

      if (totalSold > 0 && samplesDays > 0) {
        averageDailySales = totalSold / samplesDays;
        safetyStock = averageDailySales * safetyDays;
        recommendedStock = averageDailySales * coverageDays + safetyStock;
        suggestedOrderQty = recommendedStock > 0
          ? Math.max(0, Math.round(recommendedStock - currentStock))
          : 0;
      } else {
        averageDailySales = 0;
        safetyDays = 0;
        safetyStock = 0;
        recommendedStock = currentStock;
        suggestedOrderQty = 0;
      }

      const result: RecommendedStockResult = {
        sku: rawSku,
        productName,
        currentStock: Math.round(currentStock),
        averageDailySales,
        coverageDays,
        safetyDays,
        safetyStock,
        recommendedStock,
        suggestedOrderQty,
        totalSold,
        periodStart: effectiveStart,
        periodEnd: effectiveEnd,
        samplesDays
      };

      return {
        success: true,
        data: result,
        source: 'recommended_stock',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'recommended_stock',
        timestamp: new Date()
      };
    }
  }
  
  /**
   * ดึงภาพรวมยอดขายและลูกค้า (Sales & Finance Overview)
   */
  async getSalesOverview(startDate?: string, endDate?: string): Promise<AIQueryResult<SalesSummary>> {
    try {
      const now = new Date();
      const effectiveEnd = endDate || now.toISOString().split('T')[0];
      const startObj = startDate ? new Date(startDate) : new Date(now);
      if (!startDate) {
        startObj.setDate(startObj.getDate() - 30);
      }
      const effectiveStart = startDate || startObj.toISOString().split('T')[0];

      const params = new URLSearchParams();
      params.append('startDate', effectiveStart);
      params.append('endDate', effectiveEnd);
      params.append('limit', '5000');

      const salesUrl = `${SALES_API_BASE}/sales?${params.toString()}`;
      const productsUrl = `${SALES_API_BASE}/analytics/products?${params.toString()}`;
      const customersUrl = `${SALES_API_BASE}/analytics/customers?${params.toString()}`;

      const [salesRes, productsRes, customersRes] = await Promise.all([
        fetch(salesUrl),
        fetch(productsUrl),
        fetch(customersUrl)
      ]);

      if (!salesRes.ok) {
        throw new Error(`Failed to fetch sales orders: ${salesRes.statusText}`);
      }
      if (!productsRes.ok) {
        throw new Error(`Failed to fetch product list: ${productsRes.statusText}`);
      }
      if (!customersRes.ok) {
        throw new Error(`Failed to fetch customer list: ${customersRes.statusText}`);
      }

      const salesJson = await salesRes.json();
      const productsJson = await productsRes.json();
      const customersJson = await customersRes.json();

      if (!salesJson.success) {
        throw new Error(salesJson.error || 'Failed to fetch sales orders');
      }
      if (!productsJson.success) {
        throw new Error(productsJson.error || 'Failed to fetch product list');
      }
      if (!customersJson.success) {
        throw new Error(customersJson.error || 'Failed to fetch customer list');
      }

      const sales = salesJson.data as any[];
      const productList = productsJson.data as any[];
      const customerList = customersJson.data as any[];

      const orderCount = sales.length;
      const totalSales = sales.reduce((sum: number, order: any) => sum + (order.totalamount || 0), 0);
      const avgOrderValue = orderCount > 0 ? totalSales / orderCount : 0;

      const dailyMap = new Map<string, number>();
      sales.forEach((order: any) => {
        if (!order.docdate) return;
        const date = String(order.docdate).split('T')[0];
        const amount = order.totalamount || 0;
        dailyMap.set(date, (dailyMap.get(date) || 0) + amount);
      });

      const dailyTrend = Array.from(dailyMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const topProducts = (productList || []).slice(0, 10).map((p: any) => ({
        productCode: p.productCode || p.productcode || p.code || '',
        productName: p.productName || p.productname || p.name || '',
        totalSales: (p.totalSales ?? p.amount ?? 0) as number,
        quantity: (p.totalQuantity ?? p.quantity ?? 0) as number
      }));

      const topCustomers = (customerList || []).slice(0, 10).map((c: any) => ({
        arcode: c.arcode,
        arname: c.arname,
        totalPurchases: (c.totalPurchases ?? c.totalAmount ?? 0) as number
      }));

      const summary: SalesSummary = {
        totalSales,
        orderCount,
        avgOrderValue,
        topProducts,
        topCustomers,
        dailyTrend
      };

      return {
        success: true,
        data: summary,
        source: 'sales_api',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'sales_api',
        timestamp: new Date()
      };
    }
  }

  async getTopDroppingProducts(params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AIQueryResult<TopDroppingProductsResult>> {
    try {
      const now = new Date();
      const effectiveEnd = params.endDate || now.toISOString().split('T')[0];
      const startObj = params.startDate ? new Date(params.startDate) : new Date(now);
      if (!params.startDate) {
        startObj.setDate(startObj.getDate() - 30);
      }
      const effectiveStart = params.startDate || startObj.toISOString().split('T')[0];

      const startDateObj = new Date(effectiveStart);
      const endDateObj = new Date(effectiveEnd);
      const diffMs = endDateObj.getTime() - startDateObj.getTime();
      const oneDayMs = 1000 * 60 * 60 * 24;
      const periodDays = diffMs >= 0
        ? Math.max(1, Math.round(diffMs / oneDayMs) + 1)
        : 1;

      const prevEndObj = new Date(startDateObj);
      prevEndObj.setDate(prevEndObj.getDate() - 1);
      const previousEnd = prevEndObj.toISOString().split('T')[0];
      const prevStartObj = new Date(prevEndObj);
      prevStartObj.setDate(prevStartObj.getDate() - (periodDays - 1));
      const previousStart = prevStartObj.toISOString().split('T')[0];

      const buildParams = (start: string, end: string) => {
        const searchParams = new URLSearchParams();
        searchParams.append('startDate', start);
        searchParams.append('endDate', end);
        searchParams.append('limit', '5000');
        return searchParams.toString();
      };

      const currentUrl = `${SALES_API_BASE}/analytics/products?${buildParams(effectiveStart, effectiveEnd)}`;
      const previousUrl = `${SALES_API_BASE}/analytics/products?${buildParams(previousStart, previousEnd)}`;

      const [currentRes, previousRes] = await Promise.all([
        fetch(currentUrl),
        fetch(previousUrl)
      ]);

      if (!currentRes.ok) {
        throw new Error(`Failed to fetch current product analytics: ${currentRes.statusText}`);
      }
      if (!previousRes.ok) {
        throw new Error(`Failed to fetch previous product analytics: ${previousRes.statusText}`);
      }

      const currentJson = await currentRes.json();
      const previousJson = await previousRes.json();

      if (!currentJson.success) {
        throw new Error(currentJson.error || 'Failed to fetch current product analytics');
      }
      if (!previousJson.success) {
        throw new Error(previousJson.error || 'Failed to fetch previous product analytics');
      }

      const currentList = (currentJson.data || []) as any[];
      const previousList = (previousJson.data || []) as any[];

      const currentMap = new Map<string, any>();
      const previousMap = new Map<string, any>();

      currentList.forEach((p: any) => {
        const code = (p.productCode || p.productcode || p.code || '').toString();
        if (code) {
          currentMap.set(code, p);
        }
      });

      previousList.forEach((p: any) => {
        const code = (p.productCode || p.productcode || p.code || '').toString();
        if (code) {
          previousMap.set(code, p);
        }
      });

      const codes = new Set<string>();
      currentMap.forEach((_, key) => codes.add(key));
      previousMap.forEach((_, key) => codes.add(key));

      const trends: ProductTrend[] = [];

      codes.forEach((code) => {
        const current = currentMap.get(code);
        const previous = previousMap.get(code);

        const currentSales = Number(current?.totalSales ?? current?.amount ?? 0);
        const previousSales = Number(previous?.totalSales ?? previous?.amount ?? 0);
        const growth = currentSales - previousSales;

        const growthPercent = previousSales === 0
          ? (currentSales > 0 ? 100 : 0)
          : (growth / previousSales) * 100;

        const productName =
          current?.productName ||
          current?.productname ||
          current?.name ||
          previous?.productName ||
          previous?.productname ||
          previous?.name ||
          code;

        trends.push({
          productCode: code,
          productName,
          currentSales,
          previousSales,
          growth,
          growthPercent
        });
      });

      const dropping = trends
        .filter(t => t.growth < 0)
        .sort((a, b) => a.growthPercent - b.growthPercent);

      const limit = Number.isFinite(params.limit as number) && params.limit
        ? Math.max(1, Number(params.limit))
        : 5;

      const result: TopDroppingProductsResult = {
        period: {
          currentStart: effectiveStart,
          currentEnd: effectiveEnd,
          previousStart,
          previousEnd
        },
        products: dropping.slice(0, limit)
      };

      return {
        success: true,
        data: result,
        source: 'sales_api',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'sales_api',
        timestamp: new Date()
      };
    }
  }

  async getTopDroppingCustomers(params: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AIQueryResult<TopDroppingCustomersResult>> {
    try {
      const now = new Date();
      const effectiveEnd = params.endDate || now.toISOString().split('T')[0];
      const startObj = params.startDate ? new Date(params.startDate) : new Date(now);
      if (!params.startDate) {
        startObj.setDate(startObj.getDate() - 30);
      }
      const effectiveStart = params.startDate || startObj.toISOString().split('T')[0];

      const startDateObj = new Date(effectiveStart);
      const endDateObj = new Date(effectiveEnd);
      const diffMs = endDateObj.getTime() - startDateObj.getTime();
      const oneDayMs = 1000 * 60 * 60 * 24;
      const periodDays = diffMs >= 0
        ? Math.max(1, Math.round(diffMs / oneDayMs) + 1)
        : 1;

      const prevEndObj = new Date(startDateObj);
      prevEndObj.setDate(prevEndObj.getDate() - 1);
      const previousEnd = prevEndObj.toISOString().split('T')[0];
      const prevStartObj = new Date(prevEndObj);
      prevStartObj.setDate(prevStartObj.getDate() - (periodDays - 1));
      const previousStart = prevStartObj.toISOString().split('T')[0];

      const buildParams = (start: string, end: string) => {
        const searchParams = new URLSearchParams();
        searchParams.append('startDate', start);
        searchParams.append('endDate', end);
        searchParams.append('limit', '5000');
        return searchParams.toString();
      };

      const currentUrl = `${SALES_API_BASE}/analytics/customers?${buildParams(effectiveStart, effectiveEnd)}`;
      const previousUrl = `${SALES_API_BASE}/analytics/customers?${buildParams(previousStart, previousEnd)}`;

      const [currentRes, previousRes] = await Promise.all([
        fetch(currentUrl),
        fetch(previousUrl)
      ]);

      if (!currentRes.ok) {
        throw new Error(`Failed to fetch current customer analytics: ${currentRes.statusText}`);
      }
      if (!previousRes.ok) {
        throw new Error(`Failed to fetch previous customer analytics: ${previousRes.statusText}`);
      }

      const currentJson = await currentRes.json();
      const previousJson = await previousRes.json();

      if (!currentJson.success) {
        throw new Error(currentJson.error || 'Failed to fetch current customer analytics');
      }
      if (!previousJson.success) {
        throw new Error(previousJson.error || 'Failed to fetch previous customer analytics');
      }

      const currentList = (currentJson.data || []) as any[];
      const previousList = (previousJson.data || []) as any[];

      const currentMap = new Map<string, any>();
      const previousMap = new Map<string, any>();

      currentList.forEach((c: any) => {
        const code = (c.arcode || c.code || '').toString();
        if (code) {
          currentMap.set(code, c);
        }
      });

      previousList.forEach((c: any) => {
        const code = (c.arcode || c.code || '').toString();
        if (code) {
          previousMap.set(code, c);
        }
      });

      const codes = new Set<string>();
      currentMap.forEach((_, key) => codes.add(key));
      previousMap.forEach((_, key) => codes.add(key));

      const trends: CustomerTrend[] = [];

      codes.forEach((code) => {
        const current = currentMap.get(code);
        const previous = previousMap.get(code);

        const currentPurchases = Number(
          current?.totalPurchases ??
          current?.totalAmount ??
          current?.amount ??
          0
        );

        const previousPurchases = Number(
          previous?.totalPurchases ??
          previous?.totalAmount ??
          previous?.amount ??
          0
        );

        const growth = currentPurchases - previousPurchases;

        const growthPercent = previousPurchases === 0
          ? (currentPurchases > 0 ? 100 : 0)
          : (growth / previousPurchases) * 100;

        const arname =
          current?.arname ||
          previous?.arname ||
          code;

        trends.push({
          arcode: code,
          arname,
          currentPurchases,
          previousPurchases,
          growth,
          growthPercent
        });
      });

      const dropping = trends
        .filter(t => t.growth < 0)
        .sort((a, b) => a.growthPercent - b.growthPercent);

      const limit = Number.isFinite(params.limit as number) && params.limit
        ? Math.max(1, Number(params.limit))
        : 5;

      const result: TopDroppingCustomersResult = {
        period: {
          currentStart: effectiveStart,
          currentEnd: effectiveEnd,
          previousStart,
          previousEnd
        },
        customers: dropping.slice(0, limit)
      };

      return {
        success: true,
        data: result,
        source: 'sales_api',
        timestamp: new Date()
      };
    } catch (error: any) {
      return {
        success: false,
        data: null,
        error: error.message,
        source: 'sales_api',
        timestamp: new Date()
      };
    }
  }
  
  // ========== EXECUTE TOOL ==========
  
  /**
   * Execute AI Tool by name
   */
  async executeTool(toolName: string, params: Record<string, any> = {}): Promise<AIQueryResult<any>> {
    switch (toolName) {
      case 'getInventorySummary':
        return this.getInventorySummary();
      
      case 'getProductInfo':
        return this.getProductInfo(params.query || '');
      
      case 'searchInventory':
        return this.searchInventory(params.query || '', params.limit || 10);
      
      case 'getLowStockItems':
        return this.getLowStockItems(params.threshold || 10);
      
      case 'getLocationInfo':
        return this.getLocationInfo(params.location || '');
      
      case 'getRecentMovements':
        return this.getRecentMovements(params.limit || 20);
      
      case 'getProductMovements':
        return this.getProductMovements(params.sku || '');
      
      case 'getInventoryAnalytics':
        return this.getInventoryAnalytics();
      
      case 'getSchemaOverview':
        return this.getSchemaOverview();

      case 'getTableSchema':
        return this.getTableSchema(params.tableName || params.table || '');

      case 'getTableSampleRows':
        return this.getTableSampleRows(params.tableName || params.table || '', params.limit || 5);
      
      case 'getRecommendedStock':
        return this.getRecommendedStock({
          sku: params.sku || params.query || '',
          coverageDays: params.coverageDays,
          startDate: params.startDate,
          endDate: params.endDate
        });
      
      case 'getWarehouseStats':
        return this.getWarehouseStats();

      case 'getWarehouseOverview':
        return this.getWarehouseOverview();

      case 'getSalesOverview':
        return this.getSalesOverview(params.startDate, params.endDate);

      case 'getTopDroppingProducts':
        return this.getTopDroppingProducts({
          startDate: params.startDate,
          endDate: params.endDate,
          limit: params.limit
        });

      case 'getTopDroppingCustomers':
        return this.getTopDroppingCustomers({
          startDate: params.startDate,
          endDate: params.endDate,
          limit: params.limit
        });
      
      default:
        return {
          success: false,
          data: null,
          error: `Unknown tool: ${toolName}`,
          source: 'ai_data_provider',
          timestamp: new Date()
        };
    }
  }
}

// Export singleton instance
export const aiDataProvider = AIDataProvider.getInstance();




