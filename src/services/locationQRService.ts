import { supabase } from '@/integrations/supabase/client';
import QRCodeLib from 'qrcode';
import { normalizeLocation } from '@/utils/locationUtils';

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

export interface LocationQRCode {
  id: string;
  location: string;
  qr_code_data: string;
  qr_image_url?: string;
  inventory_snapshot?: any;
  generated_at: string;
  last_updated: string;
  is_active: boolean;
  user_id: string;
  created_at: string;
  url?: string;
  description?: string;
}

export class LocationQRService {
  /**
   * ดึงข้อมูล QR codes ทั้งหมด
   */
  static async getAllQRCodes(): Promise<LocationQRServiceResult<LocationQRCode[]>> {
    try {
      // Add retry logic for network issues
      let data, error;
      let retries = 3;

      while (retries > 0) {
        try {
          // Add timeout to individual query
          const queryPromise = supabase
            .from('location_qr_codes')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Query timeout after 60 seconds')), 60000)
          );

          const result = await Promise.race([queryPromise, timeoutPromise]);
          data = result.data;
          error = result.error;
          break; // Success, exit retry loop
        } catch (networkError: any) {
          console.warn(`Network error (${4 - retries}/3):`, networkError.message);
          retries--;
          if (retries === 0) {
            throw networkError;
          }
          // Wait before retry (progressive backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
        }
      }

      if (error) {
        console.error('Error fetching QR codes:', error);
        return {
          data: null,
          error: `ไม่สามารถดึงข้อมูล QR Code ได้: ${error.message}`,
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

      // Create minimal location reference data
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

      // Save to database
      const { data, error } = await supabase
        .from('location_qr_codes')
        .insert({
          location: normalizedLocation,
          qr_code_data: qrUrl,
          qr_image_url: qrImageDataURL,
          inventory_snapshot: locationData,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating QR code:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      return {
        data: data as LocationQRCode,
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
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting QR code:', error);
        return {
          data: null,
          error: error.message,
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
        .update({ is_active: false })
        .eq('is_active', true);

      if (error) {
        console.error('Error deleting all QR codes:', error);
        return {
          data: null,
          error: error.message,
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
  static async updateQRCode(id: string, updates: any): Promise<LocationQRServiceResult<LocationQRCode>> {
    try {
      const { data, error } = await supabase
        .from('location_qr_codes')
        .update({
          ...updates,
          last_updated: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating QR code:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      return {
        data: data as LocationQRCode,
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
      const normalizedLocation = normalizeLocation(location);

      const { data, error } = await supabase
        .from('location_qr_codes')
        .select('*')
        .eq('location', normalizedLocation)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error getting QR by location:', error);
        return {
          data: null,
          error: error.message,
          success: false
        };
      }

      return {
        data: data as LocationQRCode || null,
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