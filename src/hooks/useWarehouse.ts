import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import type { Warehouse, WarehouseInsert, WarehouseUpdate } from '@/integrations/supabase/types';

const warehouseSelect =
  'id,name,code,description,address,is_active,location_prefix_start,location_prefix_end,max_levels,max_positions,created_at,updated_at';

export const useWarehouses = (activeOnly: boolean = true) => {
  return useQuery({
    queryKey: ['warehouses', activeOnly],
    queryFn: async (): Promise<Warehouse[]> => {
      let query = supabase
        .from('warehouses')
        .select(warehouseSelect)
        .order('code');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching warehouses:', error);
        return [];
      }

      return (data || []) as Warehouse[];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    retry: 2,
  });
};

export const useWarehouse = (id: string | undefined) => {
  return useQuery({
    queryKey: ['warehouse', id],
    queryFn: async (): Promise<Warehouse | null> => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('warehouses')
        .select(warehouseSelect)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }

        console.error('Error fetching warehouse:', error);
        return null;
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
        .select(warehouseSelect)
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
        .select(warehouseSelect)
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
        .select(warehouseSelect)
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
    queryFn: async (): Promise<Warehouse | null> => {
      const { data, error } = await supabase
        .from('warehouses')
        .select(warehouseSelect)
        .eq('code', 'MAIN')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching default warehouse:', error);
        if (error.code === 'PGRST116') {
          return null;
        }

        return null;
      }

      return data as Warehouse;
    },
  });
};

export const useWarehouseByCode = (code: string) => {
  return useQuery({
    queryKey: ['warehouse-by-code', code],
    queryFn: async (): Promise<Warehouse | null> => {
      if (!code) return null;

      const { data, error } = await supabase
        .from('warehouses')
        .select(warehouseSelect)
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching warehouse by code:', error);
        if (error.code === 'PGRST116') {
          return null;
        }

        return null;
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
    queryFn: async (): Promise<{ totalItems: number; totalQuantity: number } | null> => {
      if (!warehouseId) return null;

      const { data, error } = await supabase
        .from('inventory_items')
        .select('id,quantity_pieces,warehouse_id')
        .eq('warehouse_id', warehouseId);

      if (error) {
        console.error('Error fetching warehouse stats:', error);
        return null;
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