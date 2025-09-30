import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
   * Create fulfillment task from PO and save to database
   */
  const createFulfillmentTask = useCallback(async (poNumber: string) => {
    try {
      setError(null);

      // Check if task already exists in database
      const { data: existingTasks } = await supabase
        .from('fulfillment_tasks')
        .select('id, po_number')
        .eq('po_number', poNumber);

      if (existingTasks && existingTasks.length > 0) {
        toast({
          title: '⚠️ งานมีอยู่แล้ว',
          description: `งานจัดสินค้าสำหรับใบสั่งซื้อ ${poNumber} มีอยู่แล้ว`,
          variant: 'destructive'
        });
        return;
      }

      // First, fetch PO details if not already loaded
      let poData = selectedPO;
      if (!poData || poData.header.PO_Number !== poNumber) {
        poData = await PurchaseOrderService.fetchPODetails(poNumber);
      }

      // Convert to fulfillment task with inventory linking
      const fulfillmentTask = await PurchaseOrderService.convertPOToFulfillmentTask(poData);

      // Save fulfillment task to database
      const { data: savedTask, error: taskError } = await supabase
        .from('fulfillment_tasks')
        .insert({
          po_number: fulfillmentTask.po_number,
          po_date: fulfillmentTask.po_date,
          delivery_date: fulfillmentTask.delivery_date,
          customer_code: fulfillmentTask.customer_code,
          warehouse_name: fulfillmentTask.warehouse_name,
          total_amount: fulfillmentTask.total_amount,
          status: fulfillmentTask.status,
          notes: `สร้างจากใบสั่งซื้อ ${poNumber}`,
          user_id: '00000000-0000-0000-0000-000000000000'
        })
        .select()
        .single();

      if (taskError) {
        throw taskError;
      }

      // Save fulfillment items to database
      const fulfillmentItemsData = fulfillmentTask.items.map(item => ({
        fulfillment_task_id: savedTask.id,
        product_name: item.product_name,
        product_code: item.product_code || item.product_name,
        requested_quantity: item.requested_quantity,
        fulfilled_quantity: item.fulfilled_quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        status: item.status,
        location: item.location,
        inventory_item_id: item.inventory_item_id,
        available_stock: item.available_stock || 0
      }));

      const { error: itemsError } = await supabase
        .from('fulfillment_items')
        .insert(fulfillmentItemsData);

      if (itemsError) {
        // Rollback task creation if items fail
        await supabase
          .from('fulfillment_tasks')
          .delete()
          .eq('id', savedTask.id);
        throw itemsError;
      }

      // Update local state
      setFulfillmentTasks(prev => [...prev, {
        ...fulfillmentTask,
        id: savedTask.id
      }]);

      toast({
        title: '✅ สร้างงานสำเร็จ',
        description: `สร้างงานจัดสินค้าสำหรับใบสั่งซื้อ ${poNumber} แล้ว`,
      });

      console.log(`✅ Created fulfillment task for PO: ${poNumber}`, savedTask);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create fulfillment task';
      setError(errorMsg);
      console.error('❌ Error creating fulfillment task:', err);

      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: `ไม่สามารถสร้างงานจัดสินค้าได้: ${errorMsg}`,
        variant: 'destructive'
      });
    }
  }, [selectedPO, toast]);

  /**
   * Update fulfillment task status in database
   */
  const updateTaskStatus = useCallback(async (taskId: string, status: any) => {
    try {
      setError(null);

      // Update status in database
      const { error: updateError } = await supabase
        .from('fulfillment_tasks')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (updateError) {
        throw updateError;
      }

      // Update local state
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
        description: `ไม่สามารถอัปเดตสถานะงานได้: ${errorMsg}`,
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
   * Fetch fulfillment tasks from database
   */
  const fetchFulfillmentTasks = useCallback(async () => {
    try {
      const { data: tasks, error } = await supabase
        .from('fulfillment_tasks_with_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Convert to FulfillmentTask format
      const fulfillmentTasksData: FulfillmentTask[] = [];

      for (const task of tasks || []) {
        // Fetch items for this task
        const { data: items, error: itemsError } = await supabase
          .from('fulfillment_items')
          .select(`
            id,
            fulfillment_task_id,
            product_name,
            product_code,
            requested_quantity,
            fulfilled_quantity,
            unit_price,
            total_amount,
            status,
            location,
            inventory_item_id,
            available_stock
          `)
          .eq('fulfillment_task_id', task.id);

        if (itemsError) {
          console.warn('Error fetching items for task:', task.id, itemsError);
          continue;
        }

        const fulfillmentTask: FulfillmentTask = {
          id: task.id,
          po_number: task.po_number,
          po_date: task.po_date,
          delivery_date: task.delivery_date,
          customer_code: task.customer_code,
          warehouse_name: task.warehouse_name,
          total_amount: task.total_amount,
          status: task.status,
          items: (items || []).map(item => ({
            id: item.id,
            fulfillment_task_id: item.fulfillment_task_id,
            product_name: item.product_name,
            product_code: item.product_code,
            requested_quantity: item.requested_quantity,
            fulfilled_quantity: item.fulfilled_quantity,
            unit_price: item.unit_price,
            total_amount: item.total_amount,
            status: item.status,
            inventory_item_id: item.inventory_item_id,
            available_stock: item.available_stock,
            location: item.location
          })),
          created_at: task.created_at,
          updated_at: task.updated_at
        };

        fulfillmentTasksData.push(fulfillmentTask);
      }

      setFulfillmentTasks(fulfillmentTasksData);
      console.log(`✅ Fetched ${fulfillmentTasksData.length} fulfillment tasks`);

    } catch (err) {
      console.error('❌ Error fetching fulfillment tasks:', err);
      toast({
        title: '❌ เกิดข้อผิดพลาด',
        description: 'ไม่สามารถดึงข้อมูลงานจัดสินค้าได้',
        variant: 'destructive'
      });
    }
  }, [toast]);

  /**
   * Auto-fetch data on mount
   */
  useEffect(() => {
    fetchPurchaseOrders();
    fetchFulfillmentTasks();
  }, [fetchPurchaseOrders, fetchFulfillmentTasks]);

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