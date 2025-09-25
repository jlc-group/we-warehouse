import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { InventoryItem } from '@/hooks/useInventory';
import { LocationQRService, type LocationQRCode, type QRDataLocation } from '@/services/locationQRService';
import { TableManagementService } from '@/services/tableManagementService';
import { normalizeLocation, locationsEqual } from '@/utils/locationUtils';

// Types are now imported from locationQRService

// QRDataLocation is now imported from locationQRService

export function useLocationQR() {
  const [qrCodes, setQrCodes] = useState<LocationQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchQRCodes = useCallback(async () => {
    try {
      setLoading(true);

      // ตรวจสอบว่าตารางมีอยู่หรือไม่ (disabled for now)
      const tableResult = { success: true };
      if (!tableResult.success) {
        toast({
          title: 'ไม่พบตาราง QR Code',
          description: tableResult.error || 'กรุณาให้ admin สร้างตาราง location_qr_codes',
          variant: 'destructive',
        });
        setQrCodes([]);
        return;
      }

      const result = await LocationQRService.getAllQRCodes();
      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถโหลดข้อมูล QR Code ได้',
          variant: 'destructive',
        });
        return;
      }

      setQrCodes(result.data || []);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูล QR Code ได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Table creation is now handled by TableManagementService

  const generateQRForLocation = useCallback(async (
    location: string,
    inventoryItems?: InventoryItem[]
  ): Promise<LocationQRCode | null> => {
    try {
      const result = await LocationQRService.generateQRForLocation(location);

      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || `ไม่สามารถสร้าง QR Code สำหรับตำแหน่ง ${location} ได้`,
          variant: 'destructive',
        });
        return null;
      }

      // Refresh QR codes list
      await fetchQRCodes();

      toast({
        title: 'สร้าง QR Code สำเร็จ',
        description: `สร้าง QR Code สำหรับตำแหน่ง ${location} แล้ว`,
      });

      return result.data;
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: `ไม่สามารถสร้าง QR Code สำหรับตำแหน่ง ${location} ได้`,
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchQRCodes, toast]);

  const deleteAllQRCodes = useCallback(async (): Promise<boolean> => {
    try {
      const result = await LocationQRService.deleteAllQRCodes();

      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถลบ QR Code ทั้งหมดได้',
          variant: 'destructive',
        });
        return false;
      }

      await fetchQRCodes();

      toast({
        title: 'ลบ QR Code ทั้งหมดสำเร็จ',
        description: 'ข้อมูล QR Code ถูกลบทั้งหมดแล้ว',
      });

      return true;
    } catch (error) {
      console.error('Error deleting ALL QR codes:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถลบ QR Code ทั้งหมดได้',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchQRCodes, toast]);

  const bulkGenerateQR = useCallback(async (
    locations: string[],
    inventoryItems?: InventoryItem[]
  ): Promise<number> => {
    try {
      const result = await LocationQRService.bulkGenerateQR(locations);

      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถสร้าง QR Code แบบ bulk ได้',
          variant: 'destructive',
        });
        return 0;
      }

      const { successCount, failedCount } = result.data || { successCount: 0, failedCount: 0 };

      await fetchQRCodes();

      toast({
        title: 'Bulk Generation เสร็จสิ้น',
        description: `สร้าง QR Code สำเร็จ ${successCount}/${locations.length} ตำแหน่ง${failedCount > 0 ? ` (ล้มเหลว ${failedCount} ตำแหน่ง)` : ''}`,
      });

      return successCount;
    } catch (error) {
      console.error('Error in bulk generate QR:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถสร้าง QR Code แบบ bulk ได้',
        variant: 'destructive',
      });
      return 0;
    }
  }, [fetchQRCodes, toast]);

  const deleteQRCode = useCallback(async (id: string): Promise<boolean> => {
    try {
      const result = await LocationQRService.deleteQRCode(id);

      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถลบ QR Code ได้',
          variant: 'destructive',
        });
        return false;
      }

      await fetchQRCodes();

      toast({
        title: 'ลบ QR Code สำเร็จ',
        description: 'ลบ QR Code แล้ว',
      });

      return true;
    } catch (error) {
      console.error('Error deleting QR code:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถลบ QR Code ได้',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchQRCodes, toast]);

  const getQRByLocation = useCallback((location: string): LocationQRCode | undefined => {
    if (!location) return undefined;

    const normalizedLocation = normalizeLocation(location);

    // Try exact match first
    const exactMatch = qrCodes.find(qr => qr.location === location && qr.is_active);
    if (exactMatch) {
      return exactMatch;
    }

    // Try normalized location match
    const normalizedMatch = qrCodes.find(qr => {
      const normalizedQRLocation = normalizeLocation(qr.location);
      return normalizedQRLocation === normalizedLocation && qr.is_active;
    });

    if (normalizedMatch) {
      return normalizedMatch;
    }

    // Try using locationsEqual for fuzzy matching
    const fuzzyMatch = qrCodes.find(qr => locationsEqual(qr.location, location) && qr.is_active);
    if (fuzzyMatch) {
      return fuzzyMatch;
    }

    return undefined;
  }, [qrCodes]);

  const updateQRCode = useCallback(async (
    id: string,
    updates: any
  ): Promise<LocationQRCode | null> => {
    try {
      const result = await LocationQRService.updateQRCode(id, updates);

      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถแก้ไข QR Code ได้',
          variant: 'destructive',
        });
        return null;
      }

      await fetchQRCodes();

      toast({
        title: 'อัพเดต QR Code สำเร็จ',
        description: 'แก้ไขข้อมูล QR Code แล้ว',
      });

      return result.data;
    } catch (error) {
      console.error('Error updating QR code:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถแก้ไข QR Code ได้',
        variant: 'destructive',
      });
      return null;
    }
  }, [fetchQRCodes, toast]);

  useEffect(() => {
    fetchQRCodes();

    // DISABLED: Real-time subscription for QR codes (to prevent flickering)
    // Real-time updates disabled to improve performance and prevent UI flickering
    // Data will be manually refreshed when needed

    // const subscription = supabase
    //   .channel('location_qr_codes_changes')
    //   .on(
    //     'postgres_changes',
    //     {
    //       event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
    //       schema: 'public',
    //       table: 'location_qr_codes'
    //     },
    //     (payload) => {
    //       // Refetch QR codes when any change occurs
    //       fetchQRCodes();
    //     }
    //   )
    //   .subscribe();

    // Cleanup subscription on unmount (no subscription to clean)
    return () => {
      // supabase.removeChannel(subscription);
    };
  }, [fetchQRCodes]);

  return {
    qrCodes,
    loading,
    generateQRForLocation,
    bulkGenerateQR,
    deleteQRCode,
    deleteAllQRCodes,
    getQRByLocation,
    updateQRCode,
    refetch: fetchQRCodes,
  };
}

export type { LocationQRCode, QRDataLocation };