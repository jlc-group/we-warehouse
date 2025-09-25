import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import type { Warehouse, WarehouseInsert, WarehouseUpdate } from '../integrations/supabase/types';

export const useWarehouses = () => {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('is_active', true)
        .order('code');

      if (error) {
        console.error('Error fetching warehouses:', error);
        throw error;
      }

      return data as Warehouse[];
    },
  });
};

export const useWarehouse = (id: string) => {
  return useQuery({
    queryKey: ['warehouse', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching warehouse:', error);
        throw error;
      }

      return data as Warehouse;
    },
    enabled: !!id,
  });
};

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (warehouse: WarehouseInsert) => {
      const { data, error } = await supabase
        .from('warehouses')
        .insert(warehouse)
        .select()
        .single();

      if (error) {
        console.error('Error creating warehouse:', error);
        throw error;
      }

      return data as Warehouse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('สร้าง warehouse สำเร็จ');
    },
    onError: (error) => {
      console.error('Error creating warehouse:', error);
      toast.error('ไม่สามารถสร้าง warehouse ได้');
    },
  });
};

export const useUpdateWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: WarehouseUpdate }) => {
      const { data, error } = await supabase
        .from('warehouses')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating warehouse:', error);
        throw error;
      }

      return data as Warehouse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse', data.id] });
      toast.success('อัพเดท warehouse สำเร็จ');
    },
    onError: (error) => {
      console.error('Error updating warehouse:', error);
      toast.error('ไม่สามารถอัพเดท warehouse ได้');
    },
  });
};

export const useDeleteWarehouse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { data, error } = await supabase
        .from('warehouses')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error deleting warehouse:', error);
        throw error;
      }

      return data as Warehouse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success('ลบ warehouse สำเร็จ');
    },
    onError: (error) => {
      console.error('Error deleting warehouse:', error);
      toast.error('ไม่สามารถลบ warehouse ได้');
    },
  });
};

export const useDefaultWarehouse = () => {
  return useQuery({
    queryKey: ['default-warehouse'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('code', 'MAIN')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching default warehouse:', error);
        throw error;
      }

      return data as Warehouse;
    },
  });
};

export const useWarehouseByCode = (code: string) => {
  return useQuery({
    queryKey: ['warehouse-by-code', code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching warehouse by code:', error);
        throw error;
      }

      return data as Warehouse;
    },
    enabled: !!code,
  });
};

// Helper function to get warehouse statistics
export const useWarehouseStats = (warehouseId: string) => {
  return useQuery({
    queryKey: ['warehouse-stats', warehouseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, quantity_pieces')
        .eq('warehouse_id', warehouseId);

      if (error) {
        console.error('Error fetching warehouse stats:', error);
        throw error;
      }

      const totalItems = data?.length || 0;
      const totalQuantity = data?.reduce((sum, item) => sum + ((item as any).quantity_pieces || 0), 0) || 0;

      return {
        totalItems,
        totalQuantity,
      };
    },
    enabled: !!warehouseId,
  });
};