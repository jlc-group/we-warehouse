import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/integrations/local/client';

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
  const { data, error } = await localDb.rpc('get_stock_overview', {
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
    // ใช้ staleTime สั้นลง + refetchOnWindowFocus เพื่อให้ refresh เมื่อกลับมาที่ tab
    staleTime: 30_000, // 30 วินาที (เคยเป็น 3 ชม. → cache เหนียว, ลบข้อมูลแล้วยังแสดง)
    gcTime: THREE_HOURS_MS,
    refetchInterval: THREE_HOURS_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stock-overview', warehouseId || 'all'] });
  };

  // ฟัง custom event จาก modal save/delete → invalidate cache ทันที
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('inventory-changed', handler);
    return () => window.removeEventListener('inventory-changed', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...query,
    refresh,
    summary: query.data?.summary,
    items: query.data?.items || [],
    warehouseId: query.data?.warehouseId,
    generatedAt: query.data?.generatedAt,
  };
}
