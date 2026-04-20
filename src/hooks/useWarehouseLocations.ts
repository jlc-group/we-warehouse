import { useState, useEffect, useCallback } from 'react';
import { WarehouseLocationService } from '@/services/warehouseLocationService';

export function useWarehouseLocations() {
  const [locations, setLocations] = useState<any[]>([]);
  const [locationsWithInventory, setLocationsWithInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  const refreshLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await WarehouseLocationService.getAllLocations();
      if (result.success) {
        setLocations(result.data);
      } else {
        setError(result.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshLocationsWithInventory = useCallback(async () => {
    try {
      const result = await WarehouseLocationService.getLocationsWithInventory();
      if (result.success) {
        setLocationsWithInventory(result.data);
      }
    } catch (e: any) {
      console.error('Error loading locations with inventory:', e);
    }
  }, []);

  const loadStatistics = useCallback(async () => {
    try {
      const result = await WarehouseLocationService.getLocationStatistics();
      if (result.success) {
        setStatistics(result.data);
      }
    } catch (e: any) {
      console.error('Error loading statistics:', e);
    }
  }, []);

  const syncInventoryLocations = useCallback(async () => {
    try {
      const result = await WarehouseLocationService.syncInventoryLocations();
      return result;
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }, []);

  const createLocation = useCallback(async (data: any) => {
    const result = await WarehouseLocationService.createLocation(data);
    if (result.success) await refreshLocations();
    return result;
  }, [refreshLocations]);

  const updateLocation = useCallback(async (id: string, data: any) => {
    const result = await WarehouseLocationService.updateLocation(id, data);
    if (result.success) await refreshLocations();
    return result;
  }, [refreshLocations]);

  const deleteLocation = useCallback(async (id: string) => {
    const result = await WarehouseLocationService.deleteLocation(id);
    if (result.success) await refreshLocations();
    return result;
  }, [refreshLocations]);

  useEffect(() => {
    refreshLocations();
    refreshLocationsWithInventory();
  }, [refreshLocations, refreshLocationsWithInventory]);

  return {
    locations,
    locationsWithInventory,
    loading,
    error,
    refreshLocations,
    syncInventoryLocations,
    statistics,
    loadStatistics,
    createLocation,
    updateLocation,
    deleteLocation
  };
}
