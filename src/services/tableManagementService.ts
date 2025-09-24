import { supabase } from '@/integrations/supabase/client';

export interface TableManagementServiceResult<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface TableExistsResult {
  exists: boolean;
  tableName: string;
}

export class TableManagementService {
  /**
   * ตรวจสอบว่าตารางมีอยู่หรือไม่
   */
  static async checkTableExists(tableName: string): Promise<TableManagementServiceResult<TableExistsResult>> {
    try {
      // วิธีการตรวจสอบโดยการ query ตารางดู
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0); // ไม่ต้องการข้อมูล แค่ตรวจสอบว่าตารางมีอยู่

      if (error) {
        // ถ้า error code คือ 42P01 แสดงว่าตารางไม่มี
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return {
            data: { exists: false, tableName },
            error: null,
            success: true
          };
        }

        // Error อื่นๆ
        return {
          data: null,
          error: `เกิดข้อผิดพลาดในการตรวจสอบตาราง ${tableName}: ${error.message}`,
          success: false
        };
      }

      // ถ้าไม่มี error แสดงว่าตารางมีอยู่
      return {
        data: { exists: true, tableName },
        error: null,
        success: true
      };
    } catch (error) {
      console.error(`Unexpected error checking table ${tableName}:`, error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ตรวจสอบว่าตาราง location_qr_codes มีอยู่หรือไม่
   */
  static async ensureLocationQRTableExists(): Promise<TableManagementServiceResult<boolean>> {
    try {
      const checkResult = await this.checkTableExists('location_qr_codes');

      if (!checkResult.success) {
        return checkResult;
      }

      if (checkResult.data?.exists) {
        return {
          data: true,
          error: null,
          success: true
        };
      }

      // ตารางไม่มี - แจ้งให้ admin สร้าง
      return {
        data: false,
        error: 'ตาราง location_qr_codes ยังไม่ได้สร้าง กรุณาให้ administrator สร้างตารางผ่าน Supabase Dashboard หรือใช้ migration scripts',
        success: false
      };
    } catch (error) {
      console.error('Unexpected error ensuring location QR table exists:', error);
      return {
        data: false,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * สร้างตาราง warehouse_locations ถ้าไม่มี
   */
  static async ensureWarehouseLocationsTableExists(): Promise<TableManagementServiceResult<boolean>> {
    try {
      const checkResult = await this.checkTableExists('warehouse_locations');

      if (!checkResult.success) {
        return checkResult;
      }

      if (checkResult.data?.exists) {
        return {
          data: true,
          error: null,
          success: true
        };
      }

      // ตารางไม่มี - แจ้งให้ admin สร้าง
      return {
        data: false,
        error: 'ตาราง warehouse_locations ยังไม่ได้สร้าง กรุณาให้ administrator สร้างตารางผ่าน Supabase Dashboard หรือใช้ migration scripts',
        success: false
      };
    } catch (error) {
      console.error('Unexpected error ensuring warehouse locations table exists:', error);
      return {
        data: false,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * สร้างตาราง product_conversion_rates ถ้าไม่มี
   */
  static async ensureConversionRatesTableExists(): Promise<TableManagementServiceResult<boolean>> {
    try {
      const checkResult = await this.checkTableExists('product_conversion_rates');

      if (!checkResult.success) {
        return checkResult;
      }

      if (checkResult.data?.exists) {
        return {
          data: true,
          error: null,
          success: true
        };
      }

      // ตารางไม่มี - แจ้งให้ admin สร้าง
      return {
        data: false,
        error: 'ตาราง product_conversion_rates ยังไม่ได้สร้าง กรุณาให้ administrator สร้างตารางผ่าน Supabase Dashboard หรือใช้ migration scripts',
        success: false
      };
    } catch (error) {
      console.error('Unexpected error ensuring conversion rates table exists:', error);
      return {
        data: false,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ตรวจสอบตารางทั้งหมดที่จำเป็น
   */
  static async checkAllRequiredTables(): Promise<TableManagementServiceResult<{
    allExists: boolean;
    missingTables: string[];
    existingTables: string[];
  }>> {
    try {
      const requiredTables = [
        'inventory_items',
        'inventory_movements',
        'products',
        'product_conversion_rates',
        'warehouse_locations',
        'location_qr_codes',
        'customers',
        'customer_orders',
        'order_items'
      ];

      const results = await Promise.all(
        requiredTables.map(async (tableName) => {
          const result = await this.checkTableExists(tableName);
          return {
            tableName,
            exists: result.success && result.data?.exists || false
          };
        })
      );

      const existingTables = results.filter(r => r.exists).map(r => r.tableName);
      const missingTables = results.filter(r => !r.exists).map(r => r.tableName);

      return {
        data: {
          allExists: missingTables.length === 0,
          missingTables,
          existingTables
        },
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error checking all required tables:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ดึงข้อมูลโครงสร้างตาราง
   */
  static async getTableSchema(tableName: string): Promise<TableManagementServiceResult<any[]>> {
    try {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', tableName)
        .eq('table_schema', 'public')
        .order('ordinal_position');

      if (error) {
        console.error(`Error fetching schema for ${tableName}:`, error);
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
      console.error(`Unexpected error fetching schema for ${tableName}:`, error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ตรวจสอบ permissions ของตาราง
   */
  static async checkTablePermissions(tableName: string): Promise<TableManagementServiceResult<{
    canSelect: boolean;
    canInsert: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  }>> {
    try {
      const permissions = {
        canSelect: false,
        canInsert: false,
        canUpdate: false,
        canDelete: false
      };

      // ทดสอบ SELECT
      try {
        await supabase.from(tableName).select('*').limit(0);
        permissions.canSelect = true;
      } catch (e) {
        // SELECT ไม่ได้
      }

      // ทดสอบ INSERT (dry run)
      try {
        const { error } = await supabase.from(tableName).insert({}).select().limit(0);
        if (!error || !error.message.includes('permission')) {
          permissions.canInsert = true;
        }
      } catch (e) {
        // INSERT ไม่ได้
      }

      // สำหรับ UPDATE และ DELETE จะยากกว่า เพราะต้องมีข้อมูลจริง
      // ใช้ SELECT permission เป็นตัวบอกคร่าวๆ
      permissions.canUpdate = permissions.canSelect;
      permissions.canDelete = permissions.canSelect;

      return {
        data: permissions,
        error: null,
        success: true
      };
    } catch (error) {
      console.error(`Unexpected error checking permissions for ${tableName}:`, error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * สร้าง migration script template สำหรับ missing tables
   */
  static generateMigrationScript(missingTables: string[]): string {
    const templates: Record<string, string> = {
      'location_qr_codes': `
-- Create location_qr_codes table
CREATE TABLE IF NOT EXISTS public.location_qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location TEXT NOT NULL,
    qr_code_data TEXT NOT NULL,
    qr_image_url TEXT,
    inventory_snapshot JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.location_qr_codes ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY IF NOT EXISTS "Allow full access to location_qr_codes"
ON public.location_qr_codes FOR ALL USING (true);`,

      'warehouse_locations': `
-- Create warehouse_locations table
CREATE TABLE IF NOT EXISTS public.warehouse_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_code TEXT UNIQUE NOT NULL,
    row TEXT,
    level INTEGER,
    position INTEGER,
    location_type TEXT DEFAULT 'shelf',
    capacity_boxes INTEGER DEFAULT 100,
    capacity_loose INTEGER DEFAULT 1000,
    description TEXT,
    user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY IF NOT EXISTS "Allow full access to warehouse_locations"
ON public.warehouse_locations FOR ALL USING (true);`,

      'product_conversion_rates': `
-- Create product_conversion_rates table
CREATE TABLE IF NOT EXISTS public.product_conversion_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    product_name TEXT,
    unit_level1_name TEXT DEFAULT 'ลัง',
    unit_level1_rate INTEGER DEFAULT 1,
    unit_level2_name TEXT DEFAULT 'กล่อง',
    unit_level2_rate INTEGER DEFAULT 1,
    unit_level3_name TEXT DEFAULT 'ชิ้น',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.product_conversion_rates ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY IF NOT EXISTS "Allow full access to product_conversion_rates"
ON public.product_conversion_rates FOR ALL USING (true);`
    };

    let script = '-- Auto-generated migration script\n-- Run this in Supabase Dashboard SQL Editor\n\n';

    missingTables.forEach(tableName => {
      if (templates[tableName]) {
        script += `${templates[tableName]}\n\n`;
      } else {
        script += `-- TODO: Create ${tableName} table\n-- Please add the appropriate CREATE TABLE statement\n\n`;
      }
    });

    return script;
  }
}

// สำหรับการใช้งานแบบ helper functions
export const tableManagementService = TableManagementService;

export type { TableExistsResult };