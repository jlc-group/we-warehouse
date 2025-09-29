import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  PurchaseOrderService,
  type PurchaseOrderHeader,
  type PurchaseOrderFull,
  type FulfillmentTask,
  type POListParams
} from '@/services/purchaseOrderService';

interface UsePurchaseOrdersReturn {
  // Data states
  purchaseOrders: PurchaseOrderHeader[];
  fulfillmentTasks: FulfillmentTask[];
  selectedPO: PurchaseOrderFull | null;

  // Loading states
  loading: boolean;
  detailsLoading: boolean;
  refreshing: boolean;

  // Error states
  error: string | null;

  // Actions
  fetchPurchaseOrders: (params?: POListParams) => Promise<void>;
  fetchPODetails: (poNumber: string) => Promise<void>;
  createFulfillmentTask: (poNumber: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: any) => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
  clearSelectedPO: () => void;
}

/**
 * Custom hook for managing Purchase Orders and Fulfillment Tasks
 */
export const usePurchaseOrders = (): UsePurchaseOrdersReturn => {
  const { toast } = useToast();

  // State management
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderHeader[]>([]);
  const [fulfillmentTasks, setFulfillmentTasks] = useState<FulfillmentTask[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderFull | null>(null);

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch purchase orders from API
   */
  const fetchPurchaseOrders = useCallback(async (params: POListParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Default to showing recent orders
      const defaultParams: POListParams = {
        top: 50, // Show latest 50 orders
        ...params
      };

      const data = await PurchaseOrderService.fetchPOList(defaultParams);
      setPurchaseOrders(data);

      console.log(`✅ Fetched ${data.length} purchase orders`);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch purchase orders';
      setError(errorMsg);
      console.error('❌ Error fetching purchase orders:', err);

      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดึงข้อมูลใบสั่งซื้อได้',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Fetch detailed PO information
   */
  const fetchPODetails = useCallback(async (poNumber: string) => {
    try {
      setDetailsLoading(true);
      setError(null);

      const poDetails = await PurchaseOrderService.fetchPODetails(poNumber);
      setSelectedPO(poDetails);

      console.log(`✅ Fetched details for PO: ${poNumber}`);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch PO details';
      setError(errorMsg);
      console.error('❌ Error fetching PO details:', err);

      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: `ไม่สามารถดึงรายละเอียดใบสั่งซื้อ ${poNumber} ได้`,
        variant: 'destructive'
      });
    } finally {
      setDetailsLoading(false);
    }
  }, [toast]);

  /**
   * Create fulfillment task from PO
   */
  const createFulfillmentTask = useCallback(async (poNumber: string) => {
    try {
      setError(null);

      // First, fetch PO details if not already loaded
      let poData = selectedPO;
      if (!poData || poData.header.PO_Number !== poNumber) {
        poData = await PurchaseOrderService.fetchPODetails(poNumber);
      }

      // Convert to fulfillment task
      const fulfillmentTask = PurchaseOrderService.convertPOToFulfillmentTask(poData);

      // Check if task already exists
      const existingTask = fulfillmentTasks.find(task => task.po_number === poNumber);
      if (existingTask) {
        toast({
          title: '⚠️ งานมีอยู่แล้ว',
          description: `งานจัดสินค้าสำหรับใบสั่งซื้อ ${poNumber} มีอยู่แล้ว`,
          variant: 'destructive'
        });
        return;
      }

      // Add to fulfillment tasks
      setFulfillmentTasks(prev => [...prev, fulfillmentTask]);

      toast({
        title: '✅ สร้างงานสำเร็จ',
        description: `สร้างงานจัดสินค้าสำหรับใบสั่งซื้อ ${poNumber} แล้ว`,
      });

      console.log(`✅ Created fulfillment task for PO: ${poNumber}`);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create fulfillment task';
      setError(errorMsg);
      console.error('❌ Error creating fulfillment task:', err);

      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: `ไม่สามารถสร้างงานจัดสินค้าได้`,
        variant: 'destructive'
      });
    }
  }, [selectedPO, fulfillmentTasks, toast]);

  /**
   * Update fulfillment task status
   */
  const updateTaskStatus = useCallback(async (taskId: string, status: any) => {
    try {
      setError(null);

      setFulfillmentTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? { ...task, status, updated_at: new Date().toISOString() }
            : task
        )
      );

      const statusLabel = PurchaseOrderService.getStatusLabel(status);
      toast({
        title: '✅ อัปเดตสถานะสำเร็จ',
        description: `เปลี่ยนสถานะงานเป็น "${statusLabel}" แล้ว`,
      });

      console.log(`✅ Updated task ${taskId} status to: ${status}`);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update task status';
      setError(errorMsg);
      console.error('❌ Error updating task status:', err);

      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถอัปเดตสถานะงานได้',
        variant: 'destructive'
      });
    }
  }, [toast]);

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      await fetchPurchaseOrders();

      toast({
        title: '🔄 รีเฟรชข้อมูลสำเร็จ',
        description: 'ข้อมูลใบสั่งซื้อได้รับการอัปเดตแล้ว'
      });

    } catch (err) {
      console.error('❌ Error refreshing data:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchPurchaseOrders, toast]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear selected PO
   */
  const clearSelectedPO = useCallback(() => {
    setSelectedPO(null);
  }, []);

  /**
   * Auto-fetch data on mount
   */
  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  return {
    // Data states
    purchaseOrders,
    fulfillmentTasks,
    selectedPO,

    // Loading states
    loading,
    detailsLoading,
    refreshing,

    // Error states
    error,

    // Actions
    fetchPurchaseOrders,
    fetchPODetails,
    createFulfillmentTask,
    updateTaskStatus,
    refreshData,
    clearError,
    clearSelectedPO
  };
};

export default usePurchaseOrders;