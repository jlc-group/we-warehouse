import { useQuery } from '@tanstack/react-query';

// API Base URL configuration (from .env)
const SALES_API_BASE = import.meta.env.VITE_SALES_API_URL || '/api';

/**
 * Sales Order Response Types
 */
export interface SalesOrder {
  docno: string;
  docdate: string | null;
  taxno: string | null;
  arcode: string | null;
  arname: string | null;
  totalamount: number | null;
}

export interface SalesLineItem {
  lineid: number;
  productcode: string | null;
  productname: string | null;
  quantity: number | null;
  unitname: string | null;
  unitprice: number | null;
  netamount: number | null;
}

export interface SalesOrderDetail extends SalesOrder {
  items: SalesLineItem[];
}

export interface SalesQueryParams {
  startDate?: string;
  endDate?: string;
  arcode?: string;
  docstatus?: string;
  limit?: number;
  offset?: number;
}

/**
 * Hook: ดึงรายการขายทั้งหมด
 */
export function useSalesOrders(params?: SalesQueryParams) {
  return useQuery({
    queryKey: ['sales-orders', params],
    queryFn: async () => {
      console.log('🌐 Fetching sales with params:', params);

      const queryParams = new URLSearchParams();

      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.arcode) queryParams.append('arcode', params.arcode);
      if (params?.docstatus) queryParams.append('docstatus', params.docstatus);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const url = `${SALES_API_BASE}/sales${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      console.log('🌐 Fetching from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch sales orders: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        console.error('❌ API Error:', data.error);
        throw new Error(data.error || 'Failed to fetch sales orders');
      }

      console.log('✅ Fetched sales orders:', data.data.length, 'orders');
      return data.data as SalesOrder[];
    },
    staleTime: 0, // ไม่ cache - ดึงข้อมูลใหม่ทุกครั้งที่ params เปลี่ยน
    gcTime: 5 * 60 * 1000, // 5 นาที
  });
}

/**
 * Hook: ดึงรายละเอียดใบขาย + รายการสินค้า
 */
export function useSalesOrderDetail(docno: string | null) {
  return useQuery({
    queryKey: ['sales-order-detail', docno],
    queryFn: async () => {
      if (!docno) {
        throw new Error('Document number is required');
      }

      const url = `${SALES_API_BASE}/sales/${encodeURIComponent(docno)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch sales order: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch sales order');
      }

      return data.data as SalesOrderDetail;
    },
    enabled: !!docno, // ดึงข้อมูลเมื่อมี docno เท่านั้น
    staleTime: 60000, // 1 นาที
  });
}

/**
 * Hook: คำนวณสถิติการขาย
 */
export function useSalesStats(params?: { startDate?: string; endDate?: string }) {
  const { data: sales, isLoading, error } = useSalesOrders({
    ...params,
    limit: 5000, // ดึงข้อมูลสูงสุด 5000 รายการ
  });

  const stats = {
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    paidAmount: 0,
    unpaidAmount: 0,
  };

  if (sales && sales.length > 0) {
    stats.totalOrders = sales.length;
    stats.totalSales = sales.reduce((sum, order) => sum + (order.totalamount || 0), 0);
    stats.averageOrderValue = stats.totalSales / stats.totalOrders;

    // Note: CSSALE ไม่มี field PAIDAMOUNT, REMAINAMOUNT จึงไม่สามารถคำนวณได้
    // ถ้าต้องการข้อมูลนี้ ต้องเพิ่ม fields ใน SQL query
  }

  return { stats, isLoading, error };
}

/**
 * Hook: ดึงยอดขายรายวัน (สำหรับกราฟ)
 */
export function useDailySales(days: number = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useSalesOrders({
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  });
}

/**
 * Interface สำหรับข้อมูลกราฟรายวัน
 */
export interface DailySalesData {
  date: string; // YYYY-MM-DD
  totalAmount: number;
  orderCount: number;
}

/**
 * Hook: ดึงข้อมูลยอดขายรายวันแบบ grouped สำหรับกราฟ
 * @param startDate - วันที่เริ่มต้น (YYYY-MM-DD)
 * @param endDate - วันที่สิ้นสุด (YYYY-MM-DD)
 * @returns ข้อมูลยอดขายแบบ group by วัน พร้อม loading/error states
 */
export function useDailySalesChart(startDate?: string, endDate?: string) {
  const { data: sales, isLoading, error } = useSalesOrders({
    startDate,
    endDate,
    limit: 5000, // ดึงข้อมูลสูงสุด 5000 รายการ
  });

  // Group ข้อมูลตามวันที่
  const chartData: DailySalesData[] = [];

  if (sales && sales.length > 0) {
    // สร้าง Map เพื่อ group ตามวันที่
    const groupedByDate = new Map<string, { totalAmount: number; orderCount: number }>();

    sales.forEach(order => {
      if (!order.docdate) return;

      // แปลง ISO date เป็น YYYY-MM-DD
      const date = order.docdate.split('T')[0];
      const amount = order.totalamount || 0;

      if (groupedByDate.has(date)) {
        const existing = groupedByDate.get(date)!;
        existing.totalAmount += amount;
        existing.orderCount += 1;
      } else {
        groupedByDate.set(date, {
          totalAmount: amount,
          orderCount: 1,
        });
      }
    });

    // แปลง Map เป็น Array และเรียงตามวันที่
    groupedByDate.forEach((value, date) => {
      chartData.push({
        date,
        totalAmount: value.totalAmount,
        orderCount: value.orderCount,
      });
    });

    // เรียงตามวันที่จากเก่าไปใหม่
    chartData.sort((a, b) => a.date.localeCompare(b.date));
  }

  return {
    data: chartData,
    isLoading,
    error,
  };
}

/**
 * Interface สำหรับ Top Customers
 */
export interface TopCustomer {
  arcode: string;
  arname: string;
  totalAmount: number;
  orderCount: number;
}

/**
 * Hook: คำนวณ Top Customers ตามยอดขาย
 * @param startDate - วันที่เริ่มต้น
 * @param endDate - วันที่สิ้นสุด
 * @param limit - จำนวนลูกค้าที่ต้องการ (default: 5)
 */
export function useTopCustomers(startDate?: string, endDate?: string, limit: number = 5) {
  const { data: sales, isLoading, error } = useSalesOrders({
    startDate,
    endDate,
    limit: 5000, // ดึงข้อมูลสูงสุด 5000 รายการ
  });

  const topCustomers: TopCustomer[] = [];

  if (sales && sales.length > 0) {
    // Group ตามลูกค้า
    const groupedByCustomer = new Map<string, { arcode: string; arname: string; totalAmount: number; orderCount: number }>();

    sales.forEach(order => {
      const arcode = order.arcode || 'UNKNOWN';
      const arname = order.arname || 'ไม่ระบุชื่อ';
      const amount = order.totalamount || 0;

      if (groupedByCustomer.has(arcode)) {
        const existing = groupedByCustomer.get(arcode)!;
        existing.totalAmount += amount;
        existing.orderCount += 1;
      } else {
        groupedByCustomer.set(arcode, {
          arcode,
          arname,
          totalAmount: amount,
          orderCount: 1,
        });
      }
    });

    // แปลง Map เป็น Array และเรียงตามยอดขาย
    const customersArray = Array.from(groupedByCustomer.values());
    customersArray.sort((a, b) => b.totalAmount - a.totalAmount);

    // เอาแค่ top N
    topCustomers.push(...customersArray.slice(0, limit));
  }

  return {
    data: topCustomers,
    isLoading,
    error,
  };
}

/**
 * Analytics API Response Types
 */
export interface AnalyticsPeriodData {
  totalSales?: number;
  totalPurchases?: number;
  totalQuantity: number;
  orderCount: number;
  avgOrderValue: number;
  dailyData: { date: string; amount: number; quantity: number }[];
  peakSalesDate?: string;
  peakSalesAmount?: number;
  peakPurchaseDate?: string;
  peakPurchaseAmount?: number;
}

export interface ProductComparisonResponse {
  current: AnalyticsPeriodData;
  previous: AnalyticsPeriodData;
  growth: {
    salesGrowth: number;
    quantityGrowth: number;
    orderGrowth: number;
    avgValueGrowth: number;
  };
  topCustomers: Array<{
    arcode: string;
    arname: string;
    totalAmount: number;
    quantity: number;
  }>;
  dailyComparison: Array<{
    date: string;
    current: number;
    previous: number;
  }>;
}

export interface CustomerComparisonResponse {
  current: AnalyticsPeriodData;
  previous: AnalyticsPeriodData;
  growth: {
    purchasesGrowth: number;
    quantityGrowth: number;
    orderGrowth: number;
    avgValueGrowth: number;
  };
  topProducts: Array<{
    productcode: string;
    productname: string;
    totalAmount: number;
    quantity: number;
  }>;
  dailyComparison: Array<{
    date: string;
    current: number;
    previous: number;
  }>;
}

/**
 * Hook: ดึงข้อมูลเปรียบเทียบสินค้า (Product Comparison)
 * ใช้ Backend API สำหรับ aggregated queries ที่ optimize แล้ว
 */
export function useProductComparisonAPI(
  productCode: string | null,
  currentStart: string,
  currentEnd: string,
  previousStart: string,
  previousEnd: string
) {
  return useQuery({
    queryKey: ['product-comparison', productCode, currentStart, currentEnd, previousStart, previousEnd],
    queryFn: async () => {
      if (!productCode) {
        throw new Error('Product code is required');
      }

      const params = new URLSearchParams({
        productCode,
        currentStart,
        currentEnd,
        previousStart,
        previousEnd
      });

      const url = `${SALES_API_BASE}/analytics/product-comparison?${params}`;
      console.log('🔍 Fetching product comparison from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch product comparison: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('❌ API Error:', result.error);
        throw new Error(result.error || 'Failed to fetch product comparison');
      }

      console.log('✅ Product comparison data:', result.data);
      return result.data as ProductComparisonResponse;
    },
    enabled: !!productCode, // ดึงข้อมูลเมื่อมี productCode เท่านั้น
    staleTime: 60000, // 1 นาที
    gcTime: 5 * 60 * 1000, // 5 นาที
  });
}

/**
 * Hook: ดึงข้อมูลเปรียบเทียบลูกค้า (Customer Comparison)
 * ใช้ Backend API สำหรับ aggregated queries ที่ optimize แล้ว
 */
export function useCustomerComparisonAPI(
  arcode: string | null,
  currentStart: string,
  currentEnd: string,
  previousStart: string,
  previousEnd: string
) {
  return useQuery({
    queryKey: ['customer-comparison', arcode, currentStart, currentEnd, previousStart, previousEnd],
    queryFn: async () => {
      if (!arcode) {
        throw new Error('Customer code is required');
      }

      const params = new URLSearchParams({
        arcode,
        currentStart,
        currentEnd,
        previousStart,
        previousEnd
      });

      const url = `${SALES_API_BASE}/analytics/customer-comparison?${params}`;
      console.log('🔍 Fetching customer comparison from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch customer comparison: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('❌ API Error:', result.error);
        throw new Error(result.error || 'Failed to fetch customer comparison');
      }

      console.log('✅ Customer comparison data:', result.data);
      return result.data as CustomerComparisonResponse;
    },
    enabled: !!arcode, // ดึงข้อมูลเมื่อมี arcode เท่านั้น
    staleTime: 60000, // 1 นาที
    gcTime: 5 * 60 * 1000, // 5 นาที
  });
}

/**
 * Product List Response Type
 */
export interface ProductListItem {
  productCode: string;
  productName: string;
  totalSales: number;
  totalQuantity: number;
}

/**
 * Customer List Response Type
 */
export interface CustomerListItem {
  arcode: string;
  arname: string;
  totalPurchases: number;
  orderCount: number;
}

/**
 * Hook: ดึงรายการสินค้าที่มียอดขาย
 * ใช้สำหรับ dropdown selection
 */
export function useProductList(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['product-list', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `${SALES_API_BASE}/analytics/products${params.toString() ? `?${params}` : ''}`;
      console.log('🔍 Fetching product list from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch product list: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('❌ API Error:', result.error);
        throw new Error(result.error || 'Failed to fetch product list');
      }

      console.log('✅ Product list loaded:', result.data.length, 'products');
      return result.data as ProductListItem[];
    },
    staleTime: 5 * 60 * 1000, // 5 นาที
    gcTime: 10 * 60 * 1000, // 10 นาที
  });
}

/**
 * Hook: ดึงรายการลูกค้าที่มียอดซื้อ
 * ใช้สำหรับ dropdown selection
 */
export function useCustomerList(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['customer-list', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `${SALES_API_BASE}/analytics/customers${params.toString() ? `?${params}` : ''}`;
      console.log('🔍 Fetching customer list from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch customer list: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('❌ API Error:', result.error);
        throw new Error(result.error || 'Failed to fetch customer list');
      }

      console.log('✅ Customer list loaded:', result.data.length, 'customers');
      return result.data as CustomerListItem[];
    },
    staleTime: 5 * 60 * 1000, // 5 นาที
    gcTime: 10 * 60 * 1000, // 10 นาที
  });
}

/**
 * Sales Summary Response Type
 */
export interface SalesSummaryData {
  sales: {
    amount: number;
    count: number;
    docType: string;
  };
  creditNote: {
    amount: number;
    count: number;
    docType: string;
  };
  net: {
    amount: number;
    count: number;
    percentage: number;
  };
}

/**
 * Hook: ดึงข้อมูลสรุปการขาย (SA vs CN)
 * แสดงยอดขาย, ยอด CN, และยอดสุทธิ
 */
export function useSalesSummary(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['sales-summary', startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const url = `${SALES_API_BASE}/analytics/sales-summary${params.toString() ? `?${params}` : ''}`;
      console.log('🔍 Fetching sales summary from:', url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch sales summary: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('❌ API Error:', result.error);
        throw new Error(result.error || 'Failed to fetch sales summary');
      }

      console.log('✅ Sales summary loaded:', result.data);
      return result.data as SalesSummaryData;
    },
    staleTime: 5 * 60 * 1000, // 5 นาที
    gcTime: 10 * 60 * 1000, // 10 นาที
  });
}
