/**
 * Sales Order Service - Integration with SQL Server External DB
 * Connects to we-warehouse-backend API for CSSALE and CSSALESUB data
 */

// API Configuration
const SALES_API_BASE = import.meta.env.VITE_SALES_API_URL || 'http://localhost:3001/api';

// ============================================================================
// TypeScript Interfaces (Mirror from backend)
// ============================================================================

export interface CSSale {
  DOCNO: string;
  DOCTYPE: string | null;
  DOCDATE: Date | null;
  TAXDATE: Date | null;
  TAXNO: string | null;
  ARCODE: string | null;
  ARNAME: string | null;
  BILLADDR: string | null;
  SUMAMOUNT1: number | null;
  SUMAMOUNT2: number | null;
  DISCAMOUNT: number | null;
  DISCAMOUNT2: number | null;
  TAXRATE: number | null;
  TAXAMOUNT: number | null;
  TOTALAMOUNT: number | null;
  DEBTAMOUNT: number | null;
  DEBTBALANCE: number | null;
  SALECODE: string | null;
  DEPARTMENT: string | null;
  PROJECT: string | null;
  SHIPCODE: string | null;
  SHIPDATE: Date | null;
  CARNUMBER: string | null;
  REMARK: string | null;
  CLOSEFLAG: string | null;
  CANCELDATE: Date | null;
  CREATEUSER: string | null;
  SYSCREATE: Date | null;
  SYSUPDATE: Date | null;
}

export interface CSSaleSub {
  DOCNO: string;
  LINEID: string;
  ROWORDER: number | null;
  PRODUCTCODE: string | null;
  PRODUCTNAME: string | null;
  BARCODE: string | null;
  QUANTITY: number | null;
  UNITCODE: string | null;
  UNITNAME: string | null;
  UNITPRICE: number | null;
  AMOUNT: number | null;
  DISCAMOUNT: number | null;
  NETAMOUNT: number | null;
  WAREHOUSE: string | null;
  LOCATION: string | null;
  REMARK: string | null;
}

export interface SaleWithItems extends CSSale {
  items: CSSaleSub[];
  itemCount: number;
}

export interface SalesListParams {
  page?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
  arcode?: string;
  doctype?: string;
  salecode?: string;
  department?: string;
  closeflag?: string;
  search?: string;
  sort_by?: 'DOCDATE' | 'DOCNO' | 'TOTALAMOUNT';
  order?: 'ASC' | 'DESC';
}

export interface SalesSummaryParams {
  date_from?: string;
  date_to?: string;
  arcode?: string;
  department?: string;
  salecode?: string;
  closeflag?: string;
  search?: string;
}

export interface SalesSummaryResult {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalItems: number;
  totalQuantity: number;
  averageOrderValue: number;
  totalDiscount: number;
  totalTax: number;
  periodStart: string;
  periodEnd: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetch sales orders with pagination and filtering
 */
export async function fetchSalesOrders(
  params: SalesListParams = {}
): Promise<ApiResponse<CSSale[]>> {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.date_from) queryParams.append('date_from', params.date_from);
  if (params.date_to) queryParams.append('date_to', params.date_to);
  if (params.arcode) queryParams.append('arcode', params.arcode);
  if (params.doctype) queryParams.append('doctype', params.doctype);
  if (params.salecode) queryParams.append('salecode', params.salecode);
  if (params.department) queryParams.append('department', params.department);
  if (params.closeflag) queryParams.append('closeflag', params.closeflag);
  if (params.search) queryParams.append('search', params.search);
  if (params.sort_by) queryParams.append('sort_by', params.sort_by);
  if (params.order) queryParams.append('order', params.order);

  const url = `${SALES_API_BASE}/sales?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    throw error;
  }
}

/**
 * Fetch sales order by DOCNO with items
 */
export async function fetchSalesOrderById(docno: string): Promise<ApiResponse<SaleWithItems>> {
  const url = `${SALES_API_BASE}/sales/${encodeURIComponent(docno)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching sales order ${docno}:`, error);
    throw error;
  }
}

/**
 * Fetch sales items for specific DOCNO
 */
export async function fetchSalesItems(docno: string): Promise<ApiResponse<CSSaleSub[]>> {
  const url = `${SALES_API_BASE}/sales/${encodeURIComponent(docno)}/items`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching sales items for ${docno}:`, error);
    throw error;
  }
}

/**
 * Fetch sales summary statistics
 */
export async function fetchSalesSummary(
  params: SalesSummaryParams
): Promise<ApiResponse<SalesSummaryResult>> {
  const queryParams = new URLSearchParams();
  queryParams.append('date_from', params.date_from);
  queryParams.append('date_to', params.date_to);

  if (params.arcode) queryParams.append('arcode', params.arcode);
  if (params.department) queryParams.append('department', params.department);
  if (params.salecode) queryParams.append('salecode', params.salecode);

  const url = `${SALES_API_BASE}/sales/summary?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    throw error;
  }
}

/**
 * Fetch top selling products
 */
export async function fetchTopProducts(
  dateFrom: string,
  dateTo: string,
  limit: number = 10
): Promise<ApiResponse<Array<{ productCode: string; productName: string; totalQuantity: number; totalAmount: number }>>> {
  const queryParams = new URLSearchParams();
  queryParams.append('date_from', dateFrom);
  queryParams.append('date_to', dateTo);
  queryParams.append('limit', limit.toString());

  const url = `${SALES_API_BASE}/sales/top-products?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching top products:', error);
    throw error;
  }
}

/**
 * Fetch sales for specific customer
 */
export async function fetchCustomerSales(arcode: string): Promise<ApiResponse<CSSale[]>> {
  const url = `${SALES_API_BASE}/customers/${encodeURIComponent(arcode)}/sales`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching customer sales for ${arcode}:`, error);
    throw error;
  }
}

// Export all functions as default
export default {
  fetchSalesOrders,
  fetchSalesOrderById,
  fetchSalesItems,
  fetchSalesSummary,
  fetchTopProducts,
  fetchCustomerSales,
};
