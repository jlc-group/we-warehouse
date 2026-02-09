import { useQuery } from '@tanstack/react-query';
import { localDb } from '@/integrations/local/client';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  description?: string;
  address?: string;
  is_active: boolean;
}

/**
 * Custom hook สำหรับดึงข้อมูล warehouses ทั้งหมด
 * ใช้ React Query เพื่อ cache และ sync ข้อมูล
 */
export function useWarehouses(activeOnly: boolean = true) {
  return useQuery({
    queryKey: ['warehouses', activeOnly],
    queryFn: async (): Promise<Warehouse[]> => {
      console.log('🏭 Fetching warehouses from database...');

      let query = localDb
        .from('warehouses')
        .select('id, name, code, description, address, is_active')
        .order('name');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching warehouses:', error);
        console.warn('⚠️ This may be due to RLS policies blocking access');
        // Don't throw - return empty array to prevent app breaking
        return [];
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ No warehouses found in database - table may be empty or RLS blocking access');
      } else {
        console.log('✅ Fetched warehouses:', data.length);
      }

      return (data || []) as Warehouse[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Custom hook สำหรับดึงข้อมูล warehouse เดียว
 */
export function useWarehouse(warehouseId: string | undefined) {
  return useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: async (): Promise<Warehouse | null> => {
      if (!warehouseId) return null;

      console.log('🏭 Fetching warehouse by ID:', warehouseId);

      const { data, error } = await localDb
        .from('warehouses')
        .select('id, name, code, description, address, is_active')
        .eq('id', warehouseId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null;
        }
        throw error;
      }

      return data as Warehouse;
    },
    enabled: !!warehouseId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Helper function เพื่อจัดรูปแบบ warehouse name
 */
export function formatWarehouseName(warehouse: Warehouse): string {
  return `${warehouse.name} (${warehouse.code})`;
}

/**
 * Helper function เพื่อหา warehouse จาก ID
 */
export function findWarehouseById(warehouses: Warehouse[], id: string): Warehouse | undefined {
  return warehouses.find(w => w.id === id);
}
