import { localDb } from '@/integrations/local/client';

export const WarehouseLocationService = {
  getAllLocations: async () => {
    try {
      const { data, error } = await localDb
        .from('warehouse_locations')
        .select('*')
        .eq('is_active', true)
        .order('location_code');
      return { data: data || [], error: error?.message || null, success: !error };
    } catch (e: any) {
      return { data: [], error: e.message, success: false };
    }
  },

  createLocation: async (locationData: any) => {
    try {
      const { data, error } = await localDb
        .from('warehouse_locations')
        .insert(locationData);
      return { data, error: error?.message || null, success: !error };
    } catch (e: any) {
      return { data: null, error: e.message, success: false };
    }
  },

  updateLocation: async (id: string, updateData: any) => {
    try {
      const { data, error } = await localDb
        .from('warehouse_locations')
        .update(updateData)
        .eq('id', id);
      return { data, error: error?.message || null, success: !error };
    } catch (e: any) {
      return { data: null, error: e.message, success: false };
    }
  },

  deleteLocation: async (id: string) => {
    try {
      const { error } = await localDb
        .from('warehouse_locations')
        .update({ is_active: false })
        .eq('id', id);
      return { data: true, error: error?.message || null, success: !error };
    } catch (e: any) {
      return { data: false, error: e.message, success: false };
    }
  },

  getLocationsWithInventory: async () => {
    try {
      const { data: locations, error } = await localDb
        .from('warehouse_locations')
        .select('*')
        .eq('is_active', true)
        .order('location_code');

      if (error) return { data: [], error: error.message, success: false };

      // Get inventory counts per location
      const { data: inventory } = await localDb
        .from('inventory_items')
        .select('location')
        .eq('is_deleted', false);

      const inventoryCounts: Record<string, number> = {};
      (inventory || []).forEach((item: any) => {
        inventoryCounts[item.location] = (inventoryCounts[item.location] || 0) + 1;
      });

      const enriched = (locations || []).map((loc: any) => ({
        ...loc,
        item_count: inventoryCounts[loc.location_code] || 0
      }));

      return { data: enriched, error: null, success: true };
    } catch (e: any) {
      return { data: [], error: e.message, success: false };
    }
  },

  getLocationStatistics: async () => {
    try {
      const { data: locations } = await localDb
        .from('warehouse_locations')
        .select('*')
        .eq('is_active', true);

      const total = locations?.length || 0;
      const types: Record<string, number> = {};
      (locations || []).forEach((loc: any) => {
        types[loc.location_type || 'shelf'] = (types[loc.location_type || 'shelf'] || 0) + 1;
      });

      return { data: { total, types }, error: null, success: true };
    } catch (e: any) {
      return { data: null, error: e.message, success: false };
    }
  },

  autoCreateLocationFromInventory: async (location: string) => {
    try {
      const row = location.match(/^([A-Z]+)/)?.[1] || location[0];
      const parts = location.split('/');
      const level = parts.length > 1 ? parseInt(parts[1]) || 1 : 1;
      const position = parseInt(row.slice(1)) || 1;

      const { data, error } = await localDb
        .from('warehouse_locations')
        .insert({
          location_code: location,
          row: row[0],
          level,
          position,
          location_type: 'shelf',
          is_active: true
        });
      return { data, error: error?.message || null, success: !error };
    } catch (e: any) {
      return { data: null, error: e.message, success: false };
    }
  },

  syncInventoryLocations: async () => {
    try {
      // Get all unique locations from inventory
      const { data: items } = await localDb
        .from('inventory_items')
        .select('location')
        .eq('is_deleted', false);

      const uniqueLocations = [...new Set((items || []).map((i: any) => i.location).filter(Boolean))];

      // Get existing locations
      const { data: existing } = await localDb
        .from('warehouse_locations')
        .select('location_code');

      const existingCodes = new Set((existing || []).map((l: any) => l.location_code));
      const missing = uniqueLocations.filter(loc => !existingCodes.has(loc));

      return { data: { total: uniqueLocations.length, missing: missing.length, synced: missing }, error: null, success: true };
    } catch (e: any) {
      return { data: null, error: e.message, success: false };
    }
  },

  getLocationInventoryDetails: async (location: string) => {
    try {
      const { data, error } = await localDb
        .from('inventory_items')
        .select('*')
        .eq('location', location)
        .eq('is_deleted', false);
      return { data: data || [], error: error?.message || null, success: !error };
    } catch (e: any) {
      return { data: [], error: e.message, success: false };
    }
  }
};
