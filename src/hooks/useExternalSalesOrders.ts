/**
 * React Hooks for External Sales Orders (SQL Server DB)
 * Uses React Query for data fetching and caching
 */

import { useQuery } from '@tanstack/react-query';
import {
  fetchSalesOrders,
  fetchSalesOrderById,
  fetchSalesItems,
  fetchSalesSummary,
  fetchTopProducts,
  fetchCustomerSales,
  type CSSale,
  type CSSaleSub,
  type SaleWithItems,
  type SalesListParams,
  type SalesSummaryParams,
  type SalesSummaryResult,
  type ApiResponse,
} from '@/services/salesOrderService';

// ============================================================================
// External Sales Orders Hooks
// ============================================================================

/**
 * Hook to fetch external sales orders with pagination and filtering
 */
export function useExternalSalesOrders(params: SalesListParams = {}) {
  return useQuery<ApiResponse<CSSale[]>, Error>({
    queryKey: ['external-sales-orders', params],
    queryFn: () => fetchSalesOrders(params),
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}

/**
 * Hook to fetch single external sales order with items
 */
export function useExternalSalesOrderDetails(docno: string | undefined) {
  return useQuery<ApiResponse<SaleWithItems>, Error>({
    queryKey: ['external-sales-order', docno],
    queryFn: () => {
      if (!docno) throw new Error('DOCNO is required');
      return fetchSalesOrderById(docno);
    },
    enabled: !!docno, // Only run when docno is provided
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch external sales items for a specific document
 */
export function useExternalSalesItems(docno: string | undefined) {
  return useQuery<ApiResponse<CSSaleSub[]>, Error>({
    queryKey: ['external-sales-items', docno],
    queryFn: () => {
      if (!docno) throw new Error('DOCNO is required');
      return fetchSalesItems(docno);
    },
    enabled: !!docno,
    staleTime: 60000,
  });
}

/**
 * Hook to fetch external sales summary statistics
 */
export function useExternalSalesSummary(params: SalesSummaryParams | undefined) {
  return useQuery<ApiResponse<SalesSummaryResult>, Error>({
    queryKey: ['external-sales-summary', params],
    queryFn: () => {
      if (!params) throw new Error('Summary params are required');
      return fetchSalesSummary(params);
    },
    enabled: !!params && !!params.date_from && !!params.date_to,
    staleTime: 60000,
  });
}

/**
 * Hook to fetch top selling products from external DB
 */
export function useExternalTopProducts(
  dateFrom: string | undefined,
  dateTo: string | undefined,
  limit: number = 10
) {
  return useQuery({
    queryKey: ['external-top-products', dateFrom, dateTo, limit],
    queryFn: () => {
      if (!dateFrom || !dateTo) throw new Error('Date range is required');
      return fetchTopProducts(dateFrom, dateTo, limit);
    },
    enabled: !!dateFrom && !!dateTo,
    staleTime: 60000,
  });
}

/**
 * Hook to fetch external sales for a specific customer
 */
export function useExternalCustomerSales(arcode: string | undefined) {
  return useQuery<ApiResponse<CSSale[]>, Error>({
    queryKey: ['external-customer-sales', arcode],
    queryFn: () => {
      if (!arcode) throw new Error('Customer code is required');
      return fetchCustomerSales(arcode);
    },
    enabled: !!arcode,
    staleTime: 60000,
  });
}

// ============================================================================
// Helper Type Exports for Components
// ============================================================================

export type {
  CSSale,
  CSSaleSub,
  SaleWithItems,
  SalesListParams,
  SalesSummaryResult,
  ApiResponse,
};
