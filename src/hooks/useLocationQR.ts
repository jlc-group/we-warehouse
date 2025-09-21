import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import type { InventoryItem } from '@/hooks/useInventory';
import QRCodeLib from 'qrcode';
import { normalizeLocation, locationsEqual } from '@/utils/locationUtils';

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

      const { data, error } = await supabase
        .from('location_qr_codes')
        .select('*')
        .eq('is_active', true)
        .order('location');

      if (error) {
        console.error('Fetch QR codes error:', error);

        // If table doesn't exist, try to create it
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          await createQRTable();

          // Retry fetch after table creation
          const { data: retryData, error: retryError } = await supabase
            .from('location_qr_codes')
            .select('*')
            .eq('is_active', true)
            .order('location');

          if (!retryError) {
            setQrCodes(retryData || []);
            return;
          }
        }

        throw error;
      }

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

  // Function to create QR table if it doesn't exist
  const createQRTable = async () => {
    try {

      // Simple table creation - basic version
      const { error } = await supabase.rpc('exec', {
        sql: `
          CREATE TABLE IF NOT EXISTS location_qr_codes (
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

          ALTER TABLE location_qr_codes ENABLE ROW LEVEL SECURITY;

          CREATE POLICY IF NOT EXISTS "Enable all access for location_qr_codes"
          ON location_qr_codes FOR ALL USING (true);
        `
      });

      if (error) {
        // Manual method if RPC fails
        const result = await fetch(`${supabase.supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`,
            'apikey': supabase.supabaseKey || ''
          },
          body: JSON.stringify({
            sql: `CREATE TABLE IF NOT EXISTS location_qr_codes (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              location TEXT NOT NULL,
              qr_code_data TEXT NOT NULL,
              qr_image_url TEXT,
              inventory_snapshot JSONB,
              generated_at TIMESTAMPTZ DEFAULT NOW(),
              last_updated TIMESTAMPTZ DEFAULT NOW(),
              is_active BOOLEAN DEFAULT TRUE,
              user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000'::UUID,
              created_at TIMESTAMPTZ DEFAULT NOW(),
              updated_at TIMESTAMPTZ DEFAULT NOW()
            )`
          })
        });

        if (!result.ok) {
          throw new Error(`Manual table creation failed: ${result.statusText}`);
        }

      } else {
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to create QR table:', error);

      toast({
        title: '⚠️ ต้องสร้างตารางด้วยตนเอง',
        description: 'กรุณาไปที่ Supabase Dashboard → SQL Editor และรัน migration script',
        variant: 'destructive',
      });

      return false;
    }
  };

  const generateQRForLocation = useCallback(async (
    location: string,
    inventoryItems: InventoryItem[]
  ): Promise<LocationQRCode | null> => {
    try {
      const normalizedLocation = normalizeLocation(location);

      // Create minimal location reference data (no inventory snapshot)
      const locationData = {
        type: 'WAREHOUSE_LOCATION',
        location: normalizedLocation,
        timestamp: new Date().toISOString(),
        // Note: Real inventory data will be fetched live from database
        note: 'QR points to location - inventory fetched real-time'
      };

      // Create URL for QR Code that opens location view
      // Get base URL with environment detection
      let baseUrl = '';
      if (typeof window !== 'undefined') {
        baseUrl = window.location.origin;

      }

      const qrUrl = `${baseUrl}?tab=overview&location=${encodeURIComponent(normalizedLocation)}&action=view`;

      // QR Code contains URL only - no static inventory snapshot
      const qrDataString = qrUrl;

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

      // First, deactivate any existing QR for this location (both original and normalized)
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
          qr_code_data: qrDataString,
          qr_image_url: qrImageDataURL,
          inventory_snapshot: locationData as any,
          user_id: fixedUserId,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Insert QR code error:', error);
        throw error;
      }


      // Refresh QR codes list with delay to ensure database consistency
      await fetchQRCodes();

      // Double-check with another fetch after a short delay
      setTimeout(async () => {
        await fetchQRCodes();
      }, 500);

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

  const deleteAllQRCodes = useCallback(async (): Promise<boolean> => {
    try {
      // Danger: delete all QR codes
      const { error } = await supabase
        .from('location_qr_codes')
        .delete()
        // Use a condition that matches all rows safely
        .neq('id', '00000000-0000-0000-0000-000000000001');

      if (error) {
        console.error('Delete ALL QR codes error:', error);
        throw error;
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

      const { error } = await supabase
        .from('location_qr_codes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete QR code error:', error);
        throw error;
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
    updates: LocationQRCodeUpdate
  ): Promise<LocationQRCode | null> => {
    try {

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