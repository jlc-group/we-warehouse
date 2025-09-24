import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ConversionRateData {
  sku: string;
  product_name: string;
  unit_level1_name: string | null;
  unit_level1_rate: number | null;
  unit_level2_name: string | null;
  unit_level2_rate: number | null;
  unit_level3_name: string | null;
}

export interface ConversionRateInput {
  sku: string;
  product_name: string;
  unit_level1_name?: string;
  unit_level1_rate?: number;
  unit_level2_name?: string;
  unit_level2_rate?: number;
  unit_level3_name?: string;
}

export interface ConversionRateServiceResult<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export class ConversionRateService {
  /**
   * รับข้อมูล conversion rate ทั้งหมด
   */
  static async getAllConversionRates(): Promise<ConversionRateServiceResult<ConversionRateData[]>> {
    try {
      const { data, error } = await supabase
        .from('product_conversion_rates')
        .select('sku, product_name, unit_level1_name, unit_level1_rate, unit_level2_name, unit_level2_rate, unit_level3_name')
        .order('sku');

      if (error) {
        console.error('Error fetching conversion rates:', error);
        return {
          data: null,
          error: `ไม่สามารถโหลดข้อมูลการแปลงหน่วยได้: ${error.message}`,
          success: false
        };
      }

      return {
        data: data || [],
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error fetching conversion rates:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * รับข้อมูล conversion rate สำหรับ SKU เฉพาะ
   */
  static async getConversionRate(sku: string): Promise<ConversionRateServiceResult<ConversionRateData>> {
    try {
      if (!sku?.trim()) {
        return {
          data: null,
          error: 'SKU ไม่สามารถเป็นค่าว่างได้',
          success: false
        };
      }

      const { data, error } = await supabase
        .from('product_conversion_rates')
        .select('sku, product_name, unit_level1_name, unit_level1_rate, unit_level2_name, unit_level2_rate, unit_level3_name')
        .eq('sku', sku.trim())
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - return default values
          return {
            data: {
              sku: sku.trim(),
              product_name: 'ไม่ระบุ',
              unit_level1_name: 'ลัง',
              unit_level1_rate: 1,
              unit_level2_name: 'กล่อง',
              unit_level2_rate: 1,
              unit_level3_name: 'ชิ้น'
            },
            error: null,
            success: true
          };
        }

        console.error('Error fetching conversion rate:', error);
        return {
          data: null,
          error: `ไม่สามารถโหลดข้อมูลการแปลงหน่วยสำหรับ ${sku} ได้: ${error.message}`,
          success: false
        };
      }

      return {
        data,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error fetching conversion rate:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * สร้าง conversion rate ใหม่
   */
  static async createConversionRate(input: ConversionRateInput): Promise<ConversionRateServiceResult<ConversionRateData>> {
    try {
      // Validation
      const validationResult = this.validateConversionRateInput(input);
      if (!validationResult.success) {
        return validationResult;
      }

      const { data, error } = await supabase
        .from('product_conversion_rates')
        .insert({
          sku: input.sku.trim(),
          product_name: input.product_name.trim(),
          unit_level1_name: input.unit_level1_name || 'ลัง',
          unit_level1_rate: input.unit_level1_rate || 1,
          unit_level2_name: input.unit_level2_name || 'กล่อง',
          unit_level2_rate: input.unit_level2_rate || 1,
          unit_level3_name: input.unit_level3_name || 'ชิ้น'
        })
        .select('sku, product_name, unit_level1_name, unit_level1_rate, unit_level2_name, unit_level2_rate, unit_level3_name')
        .single();

      if (error) {
        console.error('Error creating conversion rate:', error);

        if (error.code === '23505') {
          return {
            data: null,
            error: `SKU ${input.sku} มีการตั้งค่าแปลงหน่วยแล้ว`,
            success: false
          };
        }

        return {
          data: null,
          error: `ไม่สามารถสร้างการตั้งค่าแปลงหน่วยได้: ${error.message}`,
          success: false
        };
      }

      return {
        data,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error creating conversion rate:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * อัปเดต conversion rate
   */
  static async updateConversionRate(sku: string, input: ConversionRateInput): Promise<ConversionRateServiceResult<ConversionRateData>> {
    try {
      if (!sku?.trim()) {
        return {
          data: null,
          error: 'SKU ไม่สามารถเป็นค่าว่างได้',
          success: false
        };
      }

      // Validation
      const validationResult = this.validateConversionRateInput(input);
      if (!validationResult.success) {
        return validationResult;
      }

      const { data, error } = await supabase
        .from('product_conversion_rates')
        .update({
          product_name: input.product_name.trim(),
          unit_level1_name: input.unit_level1_name || 'ลัง',
          unit_level1_rate: input.unit_level1_rate || 1,
          unit_level2_name: input.unit_level2_name || 'กล่อง',
          unit_level2_rate: input.unit_level2_rate || 1,
          unit_level3_name: input.unit_level3_name || 'ชิ้น'
        })
        .eq('sku', sku.trim())
        .select('sku, product_name, unit_level1_name, unit_level1_rate, unit_level2_name, unit_level2_rate, unit_level3_name')
        .single();

      if (error) {
        console.error('Error updating conversion rate:', error);
        return {
          data: null,
          error: `ไม่สามารถอัปเดตการตั้งค่าแปลงหน่วยได้: ${error.message}`,
          success: false
        };
      }

      return {
        data,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error updating conversion rate:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ลบ conversion rate
   */
  static async deleteConversionRate(sku: string): Promise<ConversionRateServiceResult<boolean>> {
    try {
      if (!sku?.trim()) {
        return {
          data: null,
          error: 'SKU ไม่สามารถเป็นค่าว่างได้',
          success: false
        };
      }

      const { error } = await supabase
        .from('product_conversion_rates')
        .delete()
        .eq('sku', sku.trim());

      if (error) {
        console.error('Error deleting conversion rate:', error);
        return {
          data: null,
          error: `ไม่สามารถลบการตั้งค่าแปลงหน่วยได้: ${error.message}`,
          success: false
        };
      }

      return {
        data: true,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error deleting conversion rate:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ซิงค์ข้อมูล conversion rate กับ inventory items
   */
  static async syncInventoryItems(sku: string, conversionData: ConversionRateData): Promise<ConversionRateServiceResult<{ affectedItems: number }>> {
    try {
      if (!sku?.trim()) {
        return {
          data: null,
          error: 'SKU ไม่สามารถเป็นค่าว่างได้',
          success: false
        };
      }

      // นับจำนวน inventory items ที่จะได้รับผลกระทบ
      const { count } = await supabase
        .from('inventory_items')
        .select('*', { count: 'exact', head: true })
        .eq('sku', sku.trim());

      if (!count || count === 0) {
        return {
          data: { affectedItems: 0 },
          error: null,
          success: true
        };
      }

      // อัปเดต inventory items
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          unit_level1_name: conversionData.unit_level1_name,
          unit_level2_name: conversionData.unit_level2_name,
          unit_level3_name: conversionData.unit_level3_name,
          unit_level1_rate: conversionData.unit_level1_rate,
          unit_level2_rate: conversionData.unit_level2_rate,
        })
        .eq('sku', sku.trim())
        .select('id');

      if (error) {
        console.error('Error syncing inventory items:', error);
        return {
          data: null,
          error: `ไม่สามารถซิงค์ข้อมูล inventory items ได้: ${error.message}`,
          success: false
        };
      }

      return {
        data: { affectedItems: data?.length || 0 },
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error syncing inventory items:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * Validate conversion rate input
   */
  private static validateConversionRateInput(input: ConversionRateInput): ConversionRateServiceResult<null> {
    if (!input.sku?.trim()) {
      return {
        data: null,
        error: 'SKU ไม่สามารถเป็นค่าว่างได้',
        success: false
      };
    }

    if (!input.product_name?.trim()) {
      return {
        data: null,
        error: 'ชื่อสินค้าไม่สามารถเป็นค่าว่างได้',
        success: false
      };
    }

    if (input.unit_level1_rate && input.unit_level1_rate <= 0) {
      return {
        data: null,
        error: 'อัตราแปลงหน่วยระดับ 1 ต้องมากกว่า 0',
        success: false
      };
    }

    if (input.unit_level2_rate && input.unit_level2_rate <= 0) {
      return {
        data: null,
        error: 'อัตราแปลงหน่วยระดับ 2 ต้องมากกว่า 0',
        success: false
      };
    }

    return {
      data: null,
      error: null,
      success: true
    };
  }

  /**
   * ตรวจสอบว่า conversion rate มี validation ที่ถูกต้องหรือไม่
   */
  static hasValidConversion(conversionData: ConversionRateData): boolean {
    return !!(
      conversionData.unit_level1_name &&
      conversionData.unit_level2_name &&
      conversionData.unit_level1_rate &&
      conversionData.unit_level1_rate > 0
    );
  }

  /**
   * คำนวณการแปลงหน่วย
   */
  static calculateConversion(
    conversionData: ConversionRateData,
    baseValue: number,
    fromLevel: 1 | 2 | 3,
    toLevel: 1 | 2 | 3
  ): number {
    if (fromLevel === toLevel) return baseValue;

    let result = baseValue;

    if (fromLevel === 1 && toLevel === 2) {
      result = baseValue * (conversionData.unit_level1_rate || 1);
    } else if (fromLevel === 1 && toLevel === 3) {
      result = baseValue * (conversionData.unit_level1_rate || 1) * (conversionData.unit_level2_rate || 1);
    } else if (fromLevel === 2 && toLevel === 3) {
      result = baseValue * (conversionData.unit_level2_rate || 1);
    } else if (fromLevel === 2 && toLevel === 1) {
      result = baseValue / (conversionData.unit_level1_rate || 1);
    } else if (fromLevel === 3 && toLevel === 1) {
      result = baseValue / ((conversionData.unit_level1_rate || 1) * (conversionData.unit_level2_rate || 1));
    } else if (fromLevel === 3 && toLevel === 2) {
      result = baseValue / (conversionData.unit_level2_rate || 1);
    }

    return result;
  }
}

// สำหรับการใช้งานแบบ helper functions
export const conversionRateService = ConversionRateService;