import { TableManagementService } from '@/services/tableManagementService';

/**
 * สร้างตาราง location_qr_codes ถ้าไม่มี
 * @deprecated ใช้ TableManagementService.ensureLocationQRTableExists() แทน
 */
export async function createLocationQRTable(): Promise<boolean> {
  try {
    console.warn('createLocationQRTable is deprecated. Use TableManagementService.ensureLocationQRTableExists() instead.');

    const result = await TableManagementService.ensureLocationQRTableExists();
    return result.success && result.data === true;
  } catch (error) {
    console.error('❌ Failed to ensure QR table exists:', error);
    return false;
  }
}