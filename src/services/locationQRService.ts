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
      console.log('🔍 LocationQRService: Fetching QR codes...');

      // Simple query with timeout - no retry to prevent error spam
      const { data, error } = await supabase
        .from('location_qr_codes')
        .select('id, location, qr_code_data, is_active, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(100) // Reduced limit for faster query
        .abortSignal(AbortSignal.timeout(10000)); // 10 second timeout

      if (error) {
        console.warn('⚠️ LocationQRService: Error fetching QR codes (returning empty array):', error.message);
        // Return empty array instead of null to prevent UI errors
        return {
          data: [],
          error: null, // Don't propagate error to UI
          success: true
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

      // Check if QR exists for this location
      const { data: existing } = await supabase
        .from('location_qr_codes')
        .select('id')
        .eq('location', normalizedLocation)
        .eq('is_active', true)
        .single();

      let data, error;
      
      if (existing) {
        // Update existing QR
        const result = await supabase
          .from('location_qr_codes')
          .update({
            qr_code_data: qrUrl,
            qr_image_url: qrImageDataURL,
            inventory_snapshot: locationData,
            last_updated: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        // Create new QR
        const result = await supabase
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
        data = result.data;
        error = result.error;
      }

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