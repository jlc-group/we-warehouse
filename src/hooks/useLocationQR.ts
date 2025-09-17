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

        // If table doesn't exist, try to create it
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.log('🔧 Table does not exist, attempting to create...');
          await createQRTable();

          // Retry fetch after table creation
          const { data: retryData, error: retryError } = await supabase
            .from('location_qr_codes')
            .select('*')
            .eq('is_active', true)
            .order('location');

          if (!retryError) {
            console.log('✅ Successfully fetched QR codes after table creation:', retryData?.length || 0);
            setQrCodes(retryData || []);
            return;
          }
        }

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

  // Function to create QR table if it doesn't exist
  const createQRTable = async () => {
    try {
      console.log('🔧 Creating location_qr_codes table...');

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
        console.error('❌ Error creating QR table via RPC:', error);

        // Manual method if RPC fails
        console.log('🔄 Trying manual table creation...');
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

        console.log('✅ Manual table creation succeeded');
      } else {
        console.log('✅ QR table created successfully via RPC');
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

      // Create inventory data for storage
      const inventoryData: QRDataLocation = {
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

      // Create URL for QR Code that opens add item page
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const qrUrl = `${baseUrl}/?tab=overview&location=${encodeURIComponent(location)}&action=add`;

      // QR Code will contain URL, inventory data stored separately
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
          inventory_snapshot: inventoryData as any,
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