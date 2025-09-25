import { toast } from '@/hooks/use-toast';
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

// Mock QR Code type with all required properties
export interface LocationQRCodeMock {
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
   * ดึงข้อมูล QR codes ทั้งหมด (Mock)
   */
  static async getAllQRCodes(): Promise<LocationQRServiceResult<LocationQRCodeMock[]>> {
    try {
      // Mock data
      const mockData: LocationQRCodeMock[] = [];
      
      return {
        data: mockData,
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
   * สร้าง QR Code สำหรับ location (Mock)
   */
  static async generateQRForLocation(
    location: string
  ): Promise<LocationQRServiceResult<LocationQRCodeMock>> {
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

      // Mock response
      const mockQRCode: LocationQRCodeMock = {
        id: 'mock-' + Date.now(),
        location: normalizedLocation,
        qr_code_data: qrUrl,
        qr_image_url: qrImageDataURL,
        inventory_snapshot: locationData,
        generated_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        is_active: true,
        user_id: '00000000-0000-0000-0000-000000000000',
        created_at: new Date().toISOString(),
        url: qrUrl,
        description: `QR Code for location ${normalizedLocation}`
      };

      return {
        data: mockQRCode,
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
   * ลบ QR Code (Mock)
   */
  static async deleteQRCode(id: string): Promise<LocationQRServiceResult<boolean>> {
    try {
      // Mock success
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
   * ลบ QR Code ทั้งหมด (Mock)
   */
  static async deleteAllQRCodes(): Promise<LocationQRServiceResult<boolean>> {
    try {
      // Mock success
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
   * อัปเดต QR Code (Mock)
   */
  static async updateQRCode(id: string, updates: any): Promise<LocationQRServiceResult<LocationQRCodeMock>> {
    try {
      // Mock success
      const mockUpdated: LocationQRCodeMock = {
        id,
        location: updates.location || 'A/1/01',
        qr_code_data: updates.qr_code_data || '',
        generated_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        is_active: true,
        user_id: '00000000-0000-0000-0000-000000000000',
        created_at: new Date().toISOString(),
        url: updates.qr_code_data || '',
        description: `Updated QR Code`
      };
      
      return {
        data: mockUpdated,
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
   * ค้นหา QR Code ตาม location (Mock)
   */
  static async getQRByLocation(location: string): Promise<LocationQRServiceResult<LocationQRCodeMock>> {
    try {
      // Mock - return null (not found)
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
   * Bulk generate QR codes สำหรับหลาย locations (Mock)
   */
  static async bulkGenerateQR(locations: string[]): Promise<LocationQRServiceResult<{ successCount: number; failedCount: number }>> {
    try {
      // Mock success for all
      return {
        data: { successCount: locations.length, failedCount: 0 },
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

// Export types with different names to avoid conflicts
export type { LocationQRCodeMock as LocationQRCode };