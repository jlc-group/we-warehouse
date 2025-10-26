import { useQuery } from '@tanstack/react-query';

/**
 * Product Forecast Types
 */
export interface ProductForecastDetail {
  originalCode: string;
  originalName: string;
  rawQty: number;
  multiplier: number;
  actualQty: number;
}

export interface ProductForecastItem {
  baseCode: string;
  baseName: string;
  totalQty: number;
  details: ProductForecastDetail[];
}

export interface ProductForecastParams {
  startDate?: string;
  endDate?: string;
  search?: string;
}

/**
 * Hook: ดึงข้อมูล Product Forecast (Base Code grouping with X6, X12 multipliers)
 */
export function useProductForecast(params?: ProductForecastParams) {
  return useQuery({
    queryKey: ['product-forecast', params?.startDate, params?.endDate],
    queryFn: async () => {
      const queryParams = new URLSearchParams();

      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);

      const url = `http://localhost:3001/api/analytics/product-forecast${
        queryParams.toString() ? `?${queryParams}` : ''
      }`;

      console.log('🔍 Fetching product forecast from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch product forecast: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('❌ API Error:', result.error);
        throw new Error(result.error || 'Failed to fetch product forecast');
      }

      console.log('✅ Product forecast loaded:', result.data.length, 'base codes');

      // Client-side search filtering
      let data = result.data as ProductForecastItem[];

      if (params?.search) {
        const searchLower = params.search.toLowerCase();
        data = data.filter(item =>
          item.baseCode.toLowerCase().includes(searchLower) ||
          item.baseName.toLowerCase().includes(searchLower) ||
          item.details.some(d =>
            d.originalCode.toLowerCase().includes(searchLower) ||
            d.originalName.toLowerCase().includes(searchLower)
          )
        );
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 นาที
    gcTime: 10 * 60 * 1000, // 10 นาที
  });
}
