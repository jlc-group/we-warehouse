import { useQuery } from '@tanstack/react-query';

// API Base URL configuration
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
      const queryParams = new URLSearchParams();

      if (params?.startDate) queryParams.append('startDate', params.startDate);
      if (params?.endDate) queryParams.append('endDate', params.endDate);
      if (params?.arcode) queryParams.append('arcode', params.arcode);
      if (params?.docstatus) queryParams.append('docstatus', params.docstatus);
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());

      const url = `${SALES_API_BASE}/sales${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch sales orders: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch sales orders');
      }

      return data.data as SalesOrder[];
    },
    staleTime: 30000, // 30 วินาที
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
  const { data: sales, isLoading, error } = useSalesOrders(params);

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
