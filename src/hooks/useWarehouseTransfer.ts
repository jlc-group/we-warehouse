import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { EventLoggingService } from '@/services/eventLoggingService';

// Types for Warehouse Transfer
export interface WarehouseTransfer {
  id: string;
  transfer_number: string;
  transfer_type: 'manual' | 'system' | 'batch';
  title: string;
  description?: string;
  notes?: string;
  source_warehouse_id: string;
  target_warehouse_id: string;
  status: 'draft' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_by?: string;
  approved_by?: string;
  processed_by?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  started_at?: string;
  completed_at?: string;
  total_items: number;
  estimated_duration_minutes?: number;
  actual_duration_minutes?: number;
  metadata?: any;
  // View fields
  source_warehouse_name?: string;
  source_warehouse_code?: string;
  target_warehouse_name?: string;
  target_warehouse_code?: string;
  status_display?: string;
}

export interface WarehouseTransferItem {
  id: string;
  transfer_id: string;
  inventory_item_id: string;
  unit_level1_quantity: number;
  unit_level2_quantity: number;
  unit_level3_quantity: number;
  original_level1_quantity: number;
  original_level2_quantity: number;
  original_level3_quantity: number;
  product_name: string;
  sku: string;
  lot?: string;
  mfd?: string;
  source_location?: string;
  target_location?: string;
  status: 'pending' | 'picked' | 'in_transit' | 'delivered' | 'error';
  created_at: string;
  updated_at: string;
  picked_at?: string;
  delivered_at?: string;
  notes?: string;
  metadata?: any;
  // View fields
  transfer_number?: string;
  transfer_status?: string;
  current_location?: string;
  current_warehouse_id?: string;
  product_type?: string;
  total_quantity_transferring?: number;
  total_original_quantity?: number;
}

export interface CreateWarehouseTransferData {
  title: string;
  source_warehouse_id: string;
  target_warehouse_id: string;
  description?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  created_by?: string;
  inventory_item_ids?: string[];
}

// Hook to get all warehouse transfers
export const useWarehouseTransfers = (options?: {
  status?: WarehouseTransfer['status'];
  recent?: boolean;
  active?: boolean;
}) => {
  return useQuery({
    queryKey: ['warehouse-transfers', options],
    queryFn: async () => {
      let query = supabase.from('warehouse_transfers_view').select('*');

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.recent) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('created_at', thirtyDaysAgo.toISOString());
      }

      if (options?.active) {
        query = query.not('status', 'in', '(completed,cancelled)');
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching warehouse transfers:', error);
        throw error;
      }

      return data as WarehouseTransfer[];
    },
  });
};

// Hook to get a specific warehouse transfer
export const useWarehouseTransfer = (id: string) => {
  return useQuery({
    queryKey: ['warehouse-transfer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_transfers_view')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching warehouse transfer:', error);
        throw error;
      }

      return data as WarehouseTransfer;
    },
    enabled: !!id,
  });
};

// Hook to get transfer items
export const useWarehouseTransferItems = (transferId: string) => {
  return useQuery({
    queryKey: ['warehouse-transfer-items', transferId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_transfer_items_view')
        .select('*')
        .eq('transfer_id', transferId)
        .order('created_at');

      if (error) {
        console.error('Error fetching transfer items:', error);
        throw error;
      }

      return data as WarehouseTransferItem[];
    },
    enabled: !!transferId,
  });
};

// Hook to create a new warehouse transfer
export const useCreateWarehouseTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferData: CreateWarehouseTransferData) => {
      // Create the transfer
      const { data: transfer, error: transferError } = await supabase
        .rpc('create_warehouse_transfer', {
          p_title: transferData.title,
          p_source_warehouse_id: transferData.source_warehouse_id,
          p_target_warehouse_id: transferData.target_warehouse_id,
          p_description: transferData.description,
          p_created_by: transferData.created_by,
          p_priority: transferData.priority || 'normal'
        });

      if (transferError) {
        console.error('Error creating transfer:', transferError);
        throw transferError;
      }

      const transferId = transfer;

      // Add items if provided
      if (transferData.inventory_item_ids && transferData.inventory_item_ids.length > 0) {
        const { data: itemsAdded, error: itemsError } = await supabase
          .rpc('add_items_to_transfer', {
            p_transfer_id: transferId,
            p_inventory_item_ids: transferData.inventory_item_ids
          });

        if (itemsError) {
          console.error('Error adding items to transfer:', itemsError);
          throw itemsError;
        }

        console.log(`Added ${itemsAdded} items to transfer ${transferId}`);
      }

      // Return the created transfer
      const { data: createdTransfer, error: fetchError } = await supabase
        .from('warehouse_transfers_view')
        .select('*')
        .eq('id', transferId)
        .single();

      if (fetchError) {
        console.error('Error fetching created transfer:', fetchError);
        throw fetchError;
      }

      // Log event to system_events
      await EventLoggingService.logTransferCreated({
        transfer_id: createdTransfer.id,
        transfer_number: createdTransfer.transfer_number,
        title: createdTransfer.title,
        source_warehouse_name: createdTransfer.source_warehouse_name || 'N/A',
        target_warehouse_name: createdTransfer.target_warehouse_name || 'N/A',
        total_items: createdTransfer.total_items || 0,
        priority: createdTransfer.priority,
        created_by: transferData.created_by
      });

      return createdTransfer as WarehouseTransfer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      toast.success(`สร้างใบย้ายสินค้า ${data.transfer_number} สำเร็จ`);
    },
    onError: (error) => {
      console.error('Error creating warehouse transfer:', error);
      toast.error('ไม่สามารถสร้างใบย้ายสินค้าได้');
    },
  });
};

// Hook to update transfer status
export const useUpdateTransferStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transferId,
      status,
      notes,
      userId
    }: {
      transferId: string;
      status: WarehouseTransfer['status'];
      notes?: string;
      userId?: string;
    }) => {
      // Get current transfer data for logging
      const { data: currentTransfer } = await supabase
        .from('warehouse_transfers_view')
        .select('*')
        .eq('id', transferId)
        .single();

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      // Add timestamps based on status
      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = userId;
      } else if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString();
        updateData.processed_by = userId;
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (notes) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from('warehouse_transfers')
        .update(updateData)
        .eq('id', transferId)
        .select()
        .single();

      if (error) {
        console.error('Error updating transfer status:', error);
        throw error;
      }

      // Log status change to system_events
      if (currentTransfer) {
        await EventLoggingService.logTransferStatusUpdate({
          transfer_id: transferId,
          transfer_number: currentTransfer.transfer_number,
          old_status: currentTransfer.status,
          new_status: status,
          updated_by: userId,
          notes: notes
        });
      }

      return data as WarehouseTransfer;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfer', data.id] });

      const statusMessages = {
        pending: 'ส่งใบย้ายสินค้าเพื่อรอการอนุมัติแล้ว',
        approved: 'อนุมัติใบย้ายสินค้าแล้ว',
        in_progress: 'เริ่มดำเนินการย้ายสินค้าแล้ว',
        completed: 'ย้ายสินค้าเสร็จสิ้นแล้ว',
        cancelled: 'ยกเลิกใบย้ายสินค้าแล้ว'
      };

      toast.success(statusMessages[data.status] || `อัพเดตสถานะเป็น ${data.status} แล้ว`);
    },
    onError: (error) => {
      console.error('Error updating transfer status:', error);
      toast.error('ไม่สามารถอัพเดตสถานะได้');
    },
  });
};

// Hook to execute warehouse transfer (actually move the items)
export const useExecuteWarehouseTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transferId: string) => {
      // First get transfer details with warehouse names
      const { data: transfer, error: transferError } = await supabase
        .from('warehouse_transfers_view')
        .select('*')
        .eq('id', transferId)
        .single();

      if (transferError || !transfer) {
        await EventLoggingService.logTransferError({
          transfer_id: transferId,
          error_message: 'Transfer not found',
          error_details: transferError
        });
        throw new Error('Transfer not found');
      }

      // Get transfer items
      const { data: items, error: itemsError } = await supabase
        .from('warehouse_transfer_items')
        .select('*')
        .eq('transfer_id', transferId);

      if (itemsError) {
        await EventLoggingService.logTransferError({
          transfer_id: transferId,
          transfer_number: transfer.transfer_number,
          error_message: 'Failed to get transfer items',
          error_details: itemsError
        });
        throw itemsError;
      }

      // Update each inventory item's warehouse_id
      const updatePromises = items.map(item =>
        supabase
          .from('inventory_items')
          .update({
            warehouse_id: transfer.target_warehouse_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.inventory_item_id)
      );

      const results = await Promise.all(updatePromises);

      // Check for errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        console.error('Errors updating inventory items:', errors);
        await EventLoggingService.logTransferError({
          transfer_id: transferId,
          transfer_number: transfer.transfer_number,
          error_message: `Failed to update ${errors.length} items`,
          error_details: errors
        });
        throw new Error(`Failed to update ${errors.length} items`);
      }

      // Calculate duration
      const durationMinutes = transfer.started_at
        ? Math.round((Date.now() - new Date(transfer.started_at).getTime()) / (1000 * 60))
        : null;

      // Update transfer status to completed
      const { error: statusError } = await supabase
        .from('warehouse_transfers')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          actual_duration_minutes: durationMinutes,
          updated_at: new Date().toISOString()
        })
        .eq('id', transferId);

      if (statusError) {
        await EventLoggingService.logTransferError({
          transfer_id: transferId,
          transfer_number: transfer.transfer_number,
          error_message: 'Failed to update transfer status to completed',
          error_details: statusError
        });
        throw statusError;
      }

      // Log successful execution
      await EventLoggingService.logTransferExecuted({
        transfer_id: transferId,
        transfer_number: transfer.transfer_number,
        source_warehouse_name: transfer.source_warehouse_name || 'N/A',
        target_warehouse_name: transfer.target_warehouse_name || 'N/A',
        items_moved: items.length,
        duration_minutes: durationMinutes || undefined
      });

      return { success: true, itemsUpdated: items.length };
    },
    onSuccess: (data, transferId) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-transfer', transferId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });

      toast.success(`ย้ายสินค้า ${data.itemsUpdated} รายการเสร็จสิ้น`);
    },
    onError: (error) => {
      console.error('Error executing warehouse transfer:', error);
      toast.error('ไม่สามารถย้ายสินค้าได้');
    },
  });
};

// Hook to get transfer statistics
export const useWarehouseTransferStats = () => {
  return useQuery({
    queryKey: ['warehouse-transfer-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouse_transfers')
        .select('status, priority, created_at');

      if (error) {
        console.error('Error fetching transfer stats:', error);
        throw error;
      }

      // Calculate statistics
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const stats = {
        total: data.length,
        byStatus: data.reduce((acc, transfer) => {
          acc[transfer.status] = (acc[transfer.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byPriority: data.reduce((acc, transfer) => {
          acc[transfer.priority] = (acc[transfer.priority] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        thisMonth: data.filter(t => new Date(t.created_at) >= thisMonth).length,
        lastMonth: data.filter(t =>
          new Date(t.created_at) >= lastMonth && new Date(t.created_at) < thisMonth
        ).length
      };

      return stats;
    },
  });
};