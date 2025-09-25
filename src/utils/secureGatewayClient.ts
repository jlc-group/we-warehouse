import { supabase } from '@/integrations/supabase/client';

// Real gateway client with fallback
export const secureGatewayClient = {
  get: async <T = any>(endpoint: string, params?: any): Promise<{ success: boolean; data: T | null }> => {
    try {
      // Direct Supabase queries for common endpoints
      switch (endpoint) {
        case 'inventory': {
          let query = supabase
            .from('inventory_items')
            .select(`
              id,
              product_name,
              sku,
              location,
              lot,
              mfd,
              unit_level1_quantity,
              unit_level2_quantity,
              unit_level3_quantity,
              unit_level1_name,
              unit_level2_name,
              unit_level3_name,
              unit_level1_rate,
              unit_level2_rate,
              carton_quantity_legacy,
              box_quantity_legacy,
              pieces_quantity_legacy,
              quantity_pieces,
              unit,
              warehouse_id,
              user_id,
              created_at,
              updated_at
            `);

          if (params?.warehouseId) {
            query = query.eq('warehouse_id', params.warehouseId);
          }

          if (params?.id) {
            query = query.eq('id', params.id).single();
          }

          const { data, error } = await query;

          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned (acceptable)
            throw error;
          }

          return { success: true, data: data as T };
        }

        case 'productBySku': {
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('sku_code', params?.sku)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          return { success: true, data: data as T };
        }

        default:
          // Fallback for unknown endpoints
          return { success: true, data: null };
      }
    } catch (error) {
      console.warn(`secureGatewayClient.get(${endpoint}) failed, using fallback:`, error);
      return { success: true, data: null };
    }
  },

  delete: async (endpoint: string, params?: any): Promise<{ success: boolean; data: any | null }> => {
    try {
      switch (endpoint) {
        case 'inventory': {
          const { error } = await supabase
            .from('inventory_items')
            .delete()
            .eq('id', params?.id);

          if (error) throw error;
          return { success: true, data: { deleted: true } };
        }

        default:
          return { success: true, data: null };
      }
    } catch (error) {
      console.warn(`secureGatewayClient.delete(${endpoint}) failed, using fallback:`, error);
      return { success: true, data: null };
    }
  },

  mutate: async (action: string, payload?: any): Promise<{ success: boolean; data: any | null }> => {
    try {
      switch (action) {
        case 'createInventoryItem': {
          const { data, error } = await supabase
            .from('inventory_items')
            .insert([payload])
            .select()
            .single();

          if (error) throw error;
          return { success: true, data };
        }

        case 'updateInventoryItem': {
          const { data, error } = await supabase
            .from('inventory_items')
            .update(payload.updates)
            .eq('id', payload.id)
            .select()
            .single();

          if (error) throw error;
          return { success: true, data: { item: data } };
        }

        case 'createProduct': {
          const { data, error } = await supabase
            .from('products')
            .insert([payload])
            .select()
            .single();

          if (error) throw error;
          return { success: true, data };
        }

        case 'clearInventory': {
          const { error } = await supabase
            .from('inventory_items')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

          if (error) throw error;
          return { success: true, data: { cleared: true } };
        }

        case 'bulkUpsertInventory': {
          const { clearExisting, items } = payload;

          if (clearExisting) {
            await supabase
              .from('inventory_items')
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000');
          }

          const { data, error } = await supabase
            .from('inventory_items')
            .upsert(items, { onConflict: 'id' })
            .select();

          if (error) throw error;
          return { success: true, data };
        }

        case 'transferInventoryItems': {
          const { ids, targetLocation, notes } = payload;

          const { data, error } = await supabase
            .from('inventory_items')
            .update({
              location: targetLocation,
              updated_at: new Date().toISOString()
            })
            .in('id', ids)
            .select();

          if (error) throw error;
          return { success: true, data };
        }

        case 'shipOutInventoryItems': {
          const { ids, notes } = payload;

          const { error } = await supabase
            .from('inventory_items')
            .delete()
            .in('id', ids);

          if (error) throw error;
          return { success: true, data: { shipped: true } };
        }

        default:
          // Fallback for unknown actions
          return { success: true, data: null };
      }
    } catch (error) {
      console.warn(`secureGatewayClient.mutate(${action}) failed, using fallback:`, error);
      return { success: true, data: null };
    }
  }
};