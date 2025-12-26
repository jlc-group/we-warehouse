import { supabase } from '@/integrations/supabase/client';

export type ActivityType = 'MOVE_IN' | 'MOVE_OUT' | 'TRANSFER' | 'ADJUST' | 'SCAN';

export interface LocationActivity {
  id: string;
  location: string;
  activity_type: ActivityType;
  product_sku?: string;
  product_name?: string;
  quantity?: number;
  unit?: string;
  from_location?: string;
  to_location?: string;
  user_id?: string;
  user_name?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface LogActivityParams {
  location: string;
  activityType: ActivityType;
  productSku?: string;
  productName?: string;
  quantity?: number;
  unit?: string;
  fromLocation?: string;
  toLocation?: string;
  userName?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface LocationInventorySummary {
  location: string;
  products: Array<{
    sku: string;
    product_name: string;
    quantity: number;
    unit: string;
    lot?: string;
    mfd?: string;
  }>;
  totalItems: number;
  lastActivity?: string;
}

export class LocationActivityService {
  /**
   * บันทึก activity
   */
  static async logActivity(params: LogActivityParams): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('location_activity_logs')
        .insert({
          location: params.location,
          activity_type: params.activityType,
          product_sku: params.productSku,
          product_name: params.productName,
          quantity: params.quantity,
          unit: params.unit,
          from_location: params.fromLocation,
          to_location: params.toLocation,
          user_name: params.userName || 'Anonymous',
          notes: params.notes,
          metadata: params.metadata
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging activity:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error:', error);
      return { success: false, error: 'เกิดข้อผิดพลาด' };
    }
  }

  /**
   * ดึงประวัติ activity ของ location
   */
  static async getLocationHistory(
    location: string,
    limit: number = 50
  ): Promise<{ data: LocationActivity[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('location_activity_logs')
        .select('*')
        .eq('location', location)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching history:', error);
        return { data: [], error: error.message };
      }

      return { data: data || [] };
    } catch (error) {
      console.error('Unexpected error:', error);
      return { data: [], error: 'เกิดข้อผิดพลาด' };
    }
  }

  /**
   * ดึงสินค้าปัจจุบันใน location (Real-time)
   */
  static async getLocationInventory(location: string): Promise<LocationInventorySummary> {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('sku, product_name, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity, unit_level1_name, lot, mfd')
        .eq('location', location);

      if (error) {
        console.error('Error fetching inventory:', error);
        return {
          location,
          products: [],
          totalItems: 0
        };
      }

      // กรองเฉพาะที่มีสต็อก และแปลงเป็น format ที่ใช้งานง่าย
      const products = (data || [])
        .filter(item =>
          (item.unit_level1_quantity && item.unit_level1_quantity > 0) ||
          (item.unit_level2_quantity && item.unit_level2_quantity > 0) ||
          (item.unit_level3_quantity && item.unit_level3_quantity > 0)
        )
        .map(item => ({
          sku: item.sku || '',
          product_name: item.product_name || '',
          quantity: (item.unit_level1_quantity || 0) + (item.unit_level2_quantity || 0) + (item.unit_level3_quantity || 0),
          unit: item.unit_level1_name || 'ชิ้น',
          lot: item.lot || undefined,
          mfd: item.mfd || undefined
        }));

      // ดึง last activity
      const { data: lastActivity } = await supabase
        .from('location_activity_logs')
        .select('created_at')
        .eq('location', location)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        location,
        products,
        totalItems: products.length,
        lastActivity: lastActivity?.created_at
      };
    } catch (error) {
      console.error('Unexpected error:', error);
      return {
        location,
        products: [],
        totalItems: 0
      };
    }
  }

  /**
   * ดึงสถิติ location
   */
  static async getLocationStats(location: string) {
    try {
      const { data, error } = await supabase
        .from('location_activity_summary')
        .select('*')
        .eq('location', location)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Unexpected error:', error);
      return null;
    }
  }

  /**
   * บันทึก SCAN activity
   */
  static async logScan(location: string, userName?: string) {
    return this.logActivity({
      location,
      activityType: 'SCAN',
      userName,
      notes: 'QR Code scanned'
    });
  }

  /**
   * บันทึก MOVE_IN activity
   */
  static async logMoveIn(params: {
    location: string;
    productSku: string;
    productName: string;
    quantity: number;
    unit?: string;
    userName?: string;
    notes?: string;
  }) {
    return this.logActivity({
      location: params.location,
      activityType: 'MOVE_IN',
      productSku: params.productSku,
      productName: params.productName,
      quantity: params.quantity,
      unit: params.unit,
      userName: params.userName,
      notes: params.notes
    });
  }

  /**
   * บันทึก MOVE_OUT activity
   */
  static async logMoveOut(params: {
    location: string;
    productSku: string;
    productName: string;
    quantity: number;
    unit?: string;
    userName?: string;
    notes?: string;
    metadata?: Record<string, any>;
  }) {
    return this.logActivity({
      location: params.location,
      activityType: 'MOVE_OUT',
      productSku: params.productSku,
      productName: params.productName,
      quantity: -Math.abs(params.quantity), // ทำให้เป็นลบ
      unit: params.unit,
      userName: params.userName,
      notes: params.notes,
      metadata: params.metadata
    });
  }

  /**
   * บันทึก TRANSFER activity
   */
  static async logTransfer(params: {
    fromLocation: string;
    toLocation: string;
    productSku: string;
    productName: string;
    quantity: number;
    unit?: string;
    userName?: string;
    notes?: string;
  }) {
    // บันทึก 2 รายการ: ออกจากต้นทาง + เข้าปลายทาง
    await this.logActivity({
      location: params.fromLocation,
      activityType: 'TRANSFER',
      productSku: params.productSku,
      productName: params.productName,
      quantity: -Math.abs(params.quantity),
      unit: params.unit,
      fromLocation: params.fromLocation,
      toLocation: params.toLocation,
      userName: params.userName,
      notes: `ย้ายไป ${params.toLocation}`
    });

    return this.logActivity({
      location: params.toLocation,
      activityType: 'TRANSFER',
      productSku: params.productSku,
      productName: params.productName,
      quantity: params.quantity,
      unit: params.unit,
      fromLocation: params.fromLocation,
      toLocation: params.toLocation,
      userName: params.userName,
      notes: `ย้ายจาก ${params.fromLocation}`
    });
  }
}
