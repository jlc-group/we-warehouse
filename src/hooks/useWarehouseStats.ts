import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WarehouseStats {
  warehouseId: string;
  itemCount: number;
}

export interface WarehouseStatsMap {
  [warehouseId: string]: number;
}

/**
 * Hook to get inventory item counts per warehouse
 * Returns a map of warehouse_id -> item count
 */
export function useWarehouseStats() {
  return useQuery({
    queryKey: ['warehouse-stats'],
    queryFn: async (): Promise<WarehouseStatsMap> => {
      console.log('📊 Fetching warehouse statistics...');

      const { data, error } = await supabase
        .from('inventory_items')
        .select('warehouse_id')
        .not('warehouse_id', 'is', null);

      if (error) {
        console.error('Error fetching warehouse stats:', error);
        throw error;
      }

      // Count items per warehouse
      const statsMap: WarehouseStatsMap = {};

      data.forEach(item => {
        if (item.warehouse_id) {
          statsMap[item.warehouse_id] = (statsMap[item.warehouse_id] || 0) + 1;
        }
      });

      console.log('✅ Warehouse stats:', statsMap);
      return statsMap;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Get the warehouse ID with the most inventory items
 */
export function getMostPopulatedWarehouse(stats: WarehouseStatsMap): string | null {
  const entries = Object.entries(stats);
  if (entries.length === 0) return null;

  const sorted = entries.sort(([,a], [,b]) => b - a);
  return sorted[0][0];
}

/**
 * Get total item count across all warehouses
 */
export function getTotalItemCount(stats: WarehouseStatsMap): number {
  return Object.values(stats).reduce((sum, count) => sum + count, 0);
}

/**
 * Get item count for a specific warehouse
 */
export function getWarehouseItemCount(stats: WarehouseStatsMap, warehouseId: string): number {
  return stats[warehouseId] || 0;
}
