import { useQuery } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_SALES_API_URL || 'http://localhost:3001/api';

// Interface สำหรับข้อมูลย้อนหลังรายเดือน
export interface ForecastHistoricalData {
  month: string;        // "2024-08"
  monthName: string;    // "ส.ค. 2567"
  qty: number;
}

// Interface สำหรับข้อมูลรายเดือนของแต่ละ product
export interface ProductMonthlyData {
  month: string;
  monthName: string;
  qty: number;
  actualQty: number;    // qty * multiplier
}

// Interface สำหรับรายละเอียดแต่ละ original code
export interface ForecastProductDetail {
  originalCode: string;
  originalName: string;
  multiplier: number;
  monthlyData: ProductMonthlyData[];
}

// Interface สำหรับแต่ละ Base Code
export interface ForecastPredictionItem {
  baseCode: string;
  baseName: string;
  historicalData: ForecastHistoricalData[];  // ยอดรวมทั้งหมดรายเดือน
  averageQty: number;                        // ค่าเฉลี่ย
  forecastQty: number;                       // ยอดพยากรณ์
  details: ForecastProductDetail[];          // รายละเอียดแต่ละ original code
}

// Parameters สำหรับ API
export interface ProductForecastPredictionParams {
  targetMonth?: string;     // เช่น "2024-11"
  lookbackMonths?: number;  // default: 3
  search?: string;          // ค้นหา base code หรือชื่อ
}

// Response จาก API
interface ForecastPredictionResponse {
  success: boolean;
  data: ForecastPredictionItem[];
  metadata: {
    targetMonth: string;
    lookbackMonths: number;
    startDate: string;
    endDate: string;
    totalBaseCodes: number;
  };
}

/**
 * Hook สำหรับดึงข้อมูล Product Forecast Prediction
 * คำนวณยอดพยากรณ์จากค่าเฉลี่ย 3 เดือนย้อนหลัง
 */
export function useProductForecastPrediction(params?: ProductForecastPredictionParams) {
  return useQuery({
    queryKey: ['product-forecast-prediction', params?.targetMonth, params?.lookbackMonths, params?.search],
    queryFn: async () => {
      // สร้าง query parameters
      const queryParams = new URLSearchParams();

      if (params?.targetMonth) {
        queryParams.append('targetMonth', params.targetMonth);
      }

      if (params?.lookbackMonths) {
        queryParams.append('lookbackMonths', params.lookbackMonths.toString());
      }

      // Fetch from backend
      const url = `${API_BASE}/analytics/product-forecast-prediction?${queryParams.toString()}`;
      console.log('[useProductForecastPrediction] Fetching:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ForecastPredictionResponse = await response.json();

      if (!result.success) {
        throw new Error('API returned success: false');
      }

      console.log('[useProductForecastPrediction] Received:', result.data.length, 'items');

      // Client-side search filtering
      let data = result.data;

      if (params?.search && params.search.trim() !== '') {
        const searchLower = params.search.toLowerCase();
        data = data.filter(item =>
          item.baseCode.toLowerCase().includes(searchLower) ||
          item.baseName.toLowerCase().includes(searchLower) ||
          item.details.some(detail =>
            detail.originalCode.toLowerCase().includes(searchLower) ||
            detail.originalName.toLowerCase().includes(searchLower)
          )
        );
      }

      return {
        data,
        metadata: result.metadata
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  });
}
