import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StockOverviewSummary {
  totalItems: number;
  totalProducts: number;
  totalLocations: number;
  totalPieces: number;
  totalCartons: number;
  timestamp: number;
}

export interface StockOverviewItem {
  skuCode: string;
  productName: string;
  productType: string;
  brand: string | null;
  locationCount: number;
  totalPieces: number;
  totalCartons: number;
  locations: string[];
  lastUpdated: string;
  hasStock?: boolean;
}

export interface StockOverviewData {
  summary: StockOverviewSummary;
  items: StockOverviewItem[];
  warehouseId: string | null;
  generatedAt: string;
}

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

async function fetchStockOverview(warehouseId?: string): Promise<StockOverviewData> {
  const { data, error } = await supabase.rpc('get_stock_overview', {
    p_warehouse_id: warehouseId || null
  });

  if (error) {
    console.error('Error fetching stock overview:', error);
    throw new Error(`Failed to fetch stock overview: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned from stock overview');
  }

  return data as StockOverviewData;
}

export function useStockOverview(warehouseId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['stock-overview', warehouseId || 'all'],
    queryFn: () => fetchStockOverview(warehouseId),
    staleTime: THREE_HOURS_MS,
    gcTime: THREE_HOURS_MS, // Previously cacheTime in v4
    refetchInterval: THREE_HOURS_MS,
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-overview', warehouseId || 'all'] });
  };

  return {
    ...query,
    refresh,
    summary: query.data?.summary,
    items: query.data?.items || [],
    warehouseId: query.data?.warehouseId,
    generatedAt: query.data?.generatedAt,
  };
}
