import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import QRCodeLib from 'qrcode';
import { normalizeLocation } from '@/utils/locationUtils';

type LocationQRCode = Database['public']['Tables']['location_qr_codes']['Row'];
type LocationQRCodeInsert = Database['public']['Tables']['location_qr_codes']['Insert'];
type LocationQRCodeUpdate = Database['public']['Tables']['location_qr_codes']['Update'];

export interface LocationQRServiceResult<T = any> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface QRDataLocation {
  type: 'WAREHOUSE_LOCATION';
  location: string;
  timestamp: string;
  note: string;
}

export class LocationQRService {
  /**
   * ดึงข้อมูล QR codes ทั้งหมด
   */
  static async getAllQRCodes(): Promise<LocationQRServiceResult<LocationQRCode[]>> {
    try {
      const { data, error } = await supabase
        .from('location_qr_codes')
        .select('*')
        .eq('is_active', true)
        .order('location');

      if (error) {
        console.error('Error fetching QR codes:', error);
        return {
          data: null,
          error: `ไม่สามารถโหลดข้อมูล QR Code ได้: ${error.message}`,
          success: false
        };
      }

      return {
        data: data || [],
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error fetching QR codes:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * สร้าง QR Code สำหรับ location
   */
  static async generateQRForLocation(
    location: string
  ): Promise<LocationQRServiceResult<LocationQRCode>> {
    try {
      const normalizedLocation = normalizeLocation(location);

      // Create minimal location reference data (no inventory snapshot)
      const locationData: QRDataLocation = {
        type: 'WAREHOUSE_LOCATION',
        location: normalizedLocation,
        timestamp: new Date().toISOString(),
        note: 'QR points to location - inventory fetched real-time'
      };

      // Create URL for QR Code that opens location view
      let baseUrl = '';
      if (typeof window !== 'undefined') {
        baseUrl = window.location.origin;
      }

      const qrUrl = `${baseUrl}?tab=overview&location=${encodeURIComponent(normalizedLocation)}&action=view`;

      // Generate QR code image as data URL
      const qrImageDataURL = await QRCodeLib.toDataURL(qrUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Fixed user ID for all operations
      const fixedUserId = '00000000-0000-0000-0000-000000000000';

      // First, deactivate any existing QR for this location
      await supabase
        .from('location_qr_codes')
        .update({ is_active: false })
        .in('location', [location, normalizedLocation])
        .eq('is_active', true);

      // Insert new QR code record
      const { data, error } = await supabase
        .from('location_qr_codes')
        .insert({
          location: normalizedLocation,
          qr_code_data: qrUrl,
          qr_image_url: qrImageDataURL,
          inventory_snapshot: locationData as any,
          user_id: fixedUserId,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error generating QR code:', error);
        return {
          data: null,
          error: `ไม่สามารถสร้าง QR Code ได้: ${error.message}`,
          success: false
        };
      }

      return {
        data,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error generating QR code:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ลบ QR Code
   */
  static async deleteQRCode(id: string): Promise<LocationQRServiceResult<boolean>> {
    try {
      const { error } = await supabase
        .from('location_qr_codes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting QR code:', error);
        return {
          data: null,
          error: `ไม่สามารถลบ QR Code ได้: ${error.message}`,
          success: false
        };
      }

      return {
        data: true,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error deleting QR code:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ลบ QR Code ทั้งหมด
   */
  static async deleteAllQRCodes(): Promise<LocationQRServiceResult<boolean>> {
    try {
      const { error } = await supabase
        .from('location_qr_codes')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000001'); // Safe condition to match all rows

      if (error) {
        console.error('Error deleting all QR codes:', error);
        return {
          data: null,
          error: `ไม่สามารถลบ QR Code ทั้งหมดได้: ${error.message}`,
          success: false
        };
      }

      return {
        data: true,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error deleting all QR codes:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * อัปเดต QR Code
   */
  static async updateQRCode(
    id: string,
    updates: LocationQRCodeUpdate
  ): Promise<LocationQRServiceResult<LocationQRCode>> {
    try {
      const { data, error } = await supabase
        .from('location_qr_codes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating QR code:', error);
        return {
          data: null,
          error: `ไม่สามารถอัปเดต QR Code ได้: ${error.message}`,
          success: false
        };
      }

      return {
        data,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error updating QR code:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * ค้นหา QR Code ตาม location
   */
  static async getQRByLocation(location: string): Promise<LocationQRServiceResult<LocationQRCode>> {
    try {
      if (!location) {
        return {
          data: null,
          error: 'Location ไม่สามารถเป็นค่าว่างได้',
          success: false
        };
      }

      const normalizedLocation = normalizeLocation(location);

      // Try exact match first
      const { data: exactMatch, error: exactError } = await supabase
        .from('location_qr_codes')
        .select('*')
        .eq('location', location)
        .eq('is_active', true)
        .single();

      if (!exactError && exactMatch) {
        return {
          data: exactMatch,
          error: null,
          success: true
        };
      }

      // Try normalized location match
      const { data: normalizedMatch, error: normalizedError } = await supabase
        .from('location_qr_codes')
        .select('*')
        .eq('location', normalizedLocation)
        .eq('is_active', true)
        .single();

      if (!normalizedError && normalizedMatch) {
        return {
          data: normalizedMatch,
          error: null,
          success: true
        };
      }

      return {
        data: null,
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error getting QR by location:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * สร้างตาราง location_qr_codes ถ้าไม่มี (API-based)
   */
  static async ensureQRTableExists(): Promise<LocationQRServiceResult<boolean>> {
    try {
      // ตรวจสอบว่าตารางมีอยู่แล้วหรือไม่โดยการ query
      const { data: testData, error: testError } = await supabase
        .from('location_qr_codes')
        .select('id')
        .limit(1);

      // ถ้า query สำเร็จ แสดงว่าตารางมีอยู่แล้ว
      if (!testError) {
        return {
          data: true,
          error: null,
          success: true
        };
      }

      // ถ้าตารางไม่มี (error 42P01) ให้แจ้งให้ admin สร้าง
      if (testError.code === '42P01' || testError.message?.includes('does not exist')) {
        return {
          data: false,
          error: 'ตาราง location_qr_codes ยังไม่ได้สร้าง กรุณาให้ admin สร้างผ่าน Supabase Dashboard',
          success: false
        };
      }

      // Error อื่นๆ
      return {
        data: false,
        error: `เกิดข้อผิดพลาดในการตรวจสอบตาราง: ${testError.message}`,
        success: false
      };
    } catch (error) {
      console.error('Unexpected error ensuring QR table exists:', error);
      return {
        data: false,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }

  /**
   * Bulk generate QR codes สำหรับหลาย locations
   */
  static async bulkGenerateQR(locations: string[]): Promise<LocationQRServiceResult<{ successCount: number; failedCount: number }>> {
    try {
      let successCount = 0;
      let failedCount = 0;

      for (const location of locations) {
        const result = await this.generateQRForLocation(location);
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return {
        data: { successCount, failedCount },
        error: null,
        success: true
      };
    } catch (error) {
      console.error('Unexpected error in bulk generate QR:', error);
      return {
        data: null,
        error: 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
        success: false
      };
    }
  }
}

// สำหรับการใช้งานแบบ helper functions
export const locationQRService = LocationQRService;

export type { LocationQRCode, LocationQRCodeInsert, LocationQRCodeUpdate };