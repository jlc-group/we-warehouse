import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import type { InventoryItem } from '@/hooks/useInventory';
import QRCodeLib from 'qrcode';

type LocationQRCode = Database['public']['Tables']['location_qr_codes']['Row'];
type LocationQRCodeInsert = Database['public']['Tables']['location_qr_codes']['Insert'];
type LocationQRCodeUpdate = Database['public']['Tables']['location_qr_codes']['Update'];

interface QRDataLocation {
  type: 'WAREHOUSE_LOCATION';
  location: string;
  timestamp: string;
  summary: {
    total_items: number;
    total_boxes: number;
    total_loose: number;
    product_types: number;
  };
  items: Array<{
    sku: string;
    product_name: string;
    lot: string | null;
    mfd: string | null;
    boxes: number;
    loose: number;
  }>;
}

export function useLocationQR() {
  const [qrCodes, setQrCodes] = useState<LocationQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchQRCodes = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching location QR codes...');

      const { data, error } = await supabase
        .from('location_qr_codes')
        .select('*')
        .eq('is_active', true)
        .order('location');

      if (error) {
        console.error('Fetch QR codes error:', error);
        throw error;
      }

      console.log('Successfully fetched QR codes:', data?.length || 0);
      setQrCodes(data || []);
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

  const generateQRForLocation = useCallback(async (
    location: string,
    inventoryItems: InventoryItem[]
  ): Promise<LocationQRCode | null> => {
    try {
      console.log(`Generating QR Code for location: ${location}`);

      // Filter items for this location
      const locationItems = inventoryItems.filter(item => item.location === location);

      // Calculate totals
      const totals = locationItems.reduce(
        (acc, item) => ({
          boxes: acc.boxes + item.box_quantity,
          loose: acc.loose + item.loose_quantity,
          items: acc.items + 1,
        }),
        { boxes: 0, loose: 0, items: 0 }
      );

      // Group by product
      const groups = new Map<string, InventoryItem[]>();
      locationItems.forEach(item => {
        const key = item.sku;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(item);
      });

      // Create QR data
      const qrData: QRDataLocation = {
        type: 'WAREHOUSE_LOCATION',
        location: location,
        timestamp: new Date().toISOString(),
        summary: {
          total_items: totals.items,
          total_boxes: totals.boxes,
          total_loose: totals.loose,
          product_types: groups.size
        },
        items: locationItems.map(item => ({
          sku: item.sku,
          product_name: item.product_name,
          lot: item.lot,
          mfd: item.mfd,
          boxes: item.box_quantity,
          loose: item.loose_quantity
        }))
      };

      const qrDataString = JSON.stringify(qrData);

      // Generate QR code image as data URL
      const qrImageDataURL = await QRCodeLib.toDataURL(qrDataString, {
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
        .eq('location', location)
        .eq('is_active', true);

      // Insert new QR code record
      const { data, error } = await supabase
        .from('location_qr_codes')
        .insert({
          location: location,
          qr_code_data: qrDataString,
          qr_image_url: qrImageDataURL,
          inventory_snapshot: qrData as any,
          user_id: fixedUserId,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Insert QR code error:', error);
        throw error;
      }

      console.log('Successfully generated QR code for location:', location);

      // Refresh QR codes list
      await fetchQRCodes();

      toast({
        title: 'สร้าง QR Code สำเร็จ',
        description: `สร้าง QR Code สำหรับตำแหน่ง ${location} แล้ว`,
      });

      return data;
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

  const bulkGenerateQR = useCallback(async (
    locations: string[],
    inventoryItems: InventoryItem[]
  ): Promise<number> => {
    let successCount = 0;

    for (const location of locations) {
      const result = await generateQRForLocation(location, inventoryItems);
      if (result) {
        successCount++;
      }
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    toast({
      title: 'Bulk Generation เสร็จสิ้น',
      description: `สร้าง QR Code สำเร็จ ${successCount}/${locations.length} ตำแหน่ง`,
    });

    return successCount;
  }, [generateQRForLocation, toast]);

  const deleteQRCode = useCallback(async (id: string): Promise<boolean> => {
    try {
      console.log('Deleting QR code:', id);

      const { error } = await supabase
        .from('location_qr_codes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete QR code error:', error);
        throw error;
      }

      console.log('Successfully deleted QR code:', id);
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
    return qrCodes.find(qr => qr.location === location && qr.is_active);
  }, [qrCodes]);

  const updateQRCode = useCallback(async (
    id: string,
    updates: LocationQRCodeUpdate
  ): Promise<LocationQRCode | null> => {
    try {
      console.log('Updating QR code:', id, updates);

      const { data, error } = await supabase
        .from('location_qr_codes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update QR code error:', error);
        throw error;
      }

      console.log('Successfully updated QR code:', id);
      await fetchQRCodes();

      toast({
        title: 'อัพเดต QR Code สำเร็จ',
        description: 'แก้ไขข้อมูล QR Code แล้ว',
      });

      return data;
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
  }, [fetchQRCodes]);

  return {
    qrCodes,
    loading,
    generateQRForLocation,
    bulkGenerateQR,
    deleteQRCode,
    getQRByLocation,
    updateQRCode,
    refetch: fetchQRCodes,
  };
}

export type { LocationQRCode, QRDataLocation };