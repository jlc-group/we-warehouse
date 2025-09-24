import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  WarehouseLocationService,
  type WarehouseLocation,
  type WarehouseLocationInsert,
  type WarehouseLocationUpdate,
  type LocationWithInventoryCount,
  type LocationStatistics,
  type InventoryItem
} from '@/services/warehouseLocationService';
import { normalizeLocation, isValidLocation, parseLocation } from '@/utils/locationUtils';

// Types are now imported from warehouseLocationService

// LocationWithInventoryCount is now imported from warehouseLocationService

// InventoryItem is now imported from warehouseLocationService

// LocationStatistics is now imported from warehouseLocationService

// Debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useWarehouseLocations(searchTerm: string = '', pageSize: number = 50) {
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [locationsWithInventory, setLocationsWithInventory] = useState<LocationWithInventoryCount[]>([]);
  const [statistics, setStatistics] = useState<LocationStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  // Debounce search term to avoid too many API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Fetch optimized locations using service layer
  const fetchLocationsOptimized = useCallback(async (loadMore: boolean = false) => {
    try {
      setLoading(true);

      const currentPage = loadMore ? page : 0;

      // Use the service layer instead of RPC
      const result = await WarehouseLocationService.getLocationsWithInventory(
        debouncedSearchTerm,
        pageSize,
        currentPage * pageSize
      );

      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถโหลดข้อมูลตำแหน่งคลังได้',
          variant: 'destructive',
        });
        return;
      }

      const typedData = result.data || [];

      if (loadMore) {
        setLocationsWithInventory(prev => [...prev, ...typedData]);
      } else {
        setLocationsWithInventory(typedData);
        setPage(0);
      }

      // Check if there are more results
      setHasMore(typedData.length === pageSize);

      if (loadMore) {
        setPage(prev => prev + 1);
      }

    } catch (error) {
      console.error('Error fetching optimized locations:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดข้อมูลตำแหน่งคลังได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [debouncedSearchTerm, pageSize, page, toast]);

  // Fetch location statistics using service layer
  const fetchStatistics = useCallback(async () => {
    try {
      const result = await WarehouseLocationService.getLocationStatistics();

      if (result.success && result.data) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, []);

  // Fetch all locations using service layer
  const fetchLocations = useCallback(async () => {
    try {
      const result = await WarehouseLocationService.getAllLocations();

      if (result.success) {
        setLocations(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching warehouse locations:', error);
    }
  }, []);

  // Legacy function for backward compatibility
  const fetchLocationsWithInventory = useCallback(async () => {
    await fetchLocationsOptimized(false);
  }, [fetchLocationsOptimized]);

  // Create new warehouse location using service layer
  const createLocation = useCallback(async (locationData: WarehouseLocationInsert) => {
    try {
      const result = await WarehouseLocationService.createLocation(locationData);

      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถสร้างตำแหน่งได้',
          variant: 'destructive',
        });
        throw new Error(result.error || 'Failed to create location');
      }

      // Refresh data
      await fetchLocations();
      await fetchLocationsWithInventory();

      toast({
        title: 'สร้างตำแหน่งสำเร็จ',
        description: `ตำแหน่ง ${locationData.location_code} ถูกสร้างแล้ว`,
      });

      return result.data;
    } catch (error: any) {
      console.error('Error creating location:', error);
      throw error;
    }
  }, [fetchLocations, fetchLocationsWithInventory, toast]);

  // Update warehouse location using service layer
  const updateLocation = useCallback(async (id: string, locationData: WarehouseLocationUpdate) => {
    try {
      const result = await WarehouseLocationService.updateLocation(id, locationData);

      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถแก้ไขตำแหน่งได้',
          variant: 'destructive',
        });
        throw new Error(result.error || 'Failed to update location');
      }

      // Refresh data
      await fetchLocations();
      await fetchLocationsWithInventory();

      toast({
        title: 'แก้ไขตำแหน่งสำเร็จ',
        description: `ตำแหน่ง ${locationData.location_code || ''} ถูกแก้ไขแล้ว`,
      });

      return result.data;
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  }, [fetchLocations, fetchLocationsWithInventory, toast]);

  // Delete warehouse location using service layer
  const deleteLocation = useCallback(async (id: string) => {
    try {
      const result = await WarehouseLocationService.deleteLocation(id);

      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถลบตำแหน่งได้',
          variant: 'destructive',
        });
        throw new Error(result.error || 'Failed to delete location');
      }

      // Refresh data
      await fetchLocations();
      await fetchLocationsWithInventory();

      toast({
        title: 'ลบตำแหน่งสำเร็จ',
        description: 'ตำแหน่งถูกลบออกจากระบบแล้ว',
      });
    } catch (error: any) {
      console.error('Error deleting location:', error);
      throw error;
    }
  }, [fetchLocations, fetchLocationsWithInventory, toast]);

  // Get location by location_code (client-side search)
  const getLocationByCode = useCallback((location_code: string) => {
    return locations.find(loc => loc.location_code === location_code);
  }, [locations]);

  // Get locations by row
  const getLocationsByRow = useCallback((row: string) => {
    return locations.filter(loc => loc.row === row);
  }, [locations]);

  // Auto-create location from inventory location using service layer
  const autoCreateLocationFromInventory = useCallback(async (location: string) => {
    try {
      const result = await WarehouseLocationService.autoCreateLocationFromInventory(location);

      if (result.success) {
        // Refresh data if location was created
        if (result.data) {
          await fetchLocations();
          await fetchLocationsWithInventory();
        }
        return result.data;
      }

      return null;
    } catch (error) {
      console.error('Error auto-creating location:', error);
      return null;
    }
  }, [fetchLocations, fetchLocationsWithInventory]);

  // Sync existing inventory locations to warehouse_locations using service layer
  const syncInventoryLocations = useCallback(async () => {
    try {
      const result = await WarehouseLocationService.syncInventoryLocations();

      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถซิงค์ข้อมูลตำแหน่งได้',
          variant: 'destructive',
        });
        throw new Error(result.error || 'Failed to sync inventory locations');
      }

      // Refresh data
      await fetchLocations();
      await fetchLocationsWithInventory();

      toast({
        title: 'ซิงค์ข้อมูลสำเร็จ',
        description: result.data || 'ซิงค์ข้อมูลตำแหน่งเรียบร้อย',
      });

      return result.data;
    } catch (error) {
      console.error('Error syncing inventory locations:', error);
      throw error;
    }
  }, [fetchLocations, fetchLocationsWithInventory, toast]);

  // Get detailed inventory for a specific location using service layer
  const getLocationInventoryDetails = useCallback(async (locationCode: string) => {
    try {
      const result = await WarehouseLocationService.getLocationInventoryDetails(locationCode);

      if (!result.success) {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: result.error || 'ไม่สามารถโหลดรายละเอียดสินค้าได้',
          variant: 'destructive',
        });
        return [];
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching location inventory details:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถโหลดรายละเอียดสินค้าได้',
        variant: 'destructive',
      });
      return [];
    }
  }, [toast]);

  // Load more function for pagination
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchLocationsOptimized(true);
    }
  }, [loading, hasMore, fetchLocationsOptimized]);

  // Memoized filtered and sorted data
  const filteredLocations = useMemo(() => {
    if (!searchTerm) return locationsWithInventory;

    return locationsWithInventory.filter(location =>
      location.location_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (location.description && location.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [locationsWithInventory, searchTerm]);

  // Memoized statistics
  const memoizedStatistics = useMemo(() => {
    if (statistics) return statistics;

    // Calculate from current data if no server statistics
    const total = locationsWithInventory.length;
    const withInventory = locationsWithInventory.filter(l => l.inventory_count > 0).length;
    const highUtil = locationsWithInventory.filter(l => l.utilization_percentage >= 80).length;
    const mediumUtil = locationsWithInventory.filter(l => l.utilization_percentage >= 40 && l.utilization_percentage < 80).length;
    const lowUtil = locationsWithInventory.filter(l => l.utilization_percentage < 40 && l.utilization_percentage > 0).length;
    const empty = locationsWithInventory.filter(l => l.inventory_count === 0).length;
    const avgUtil = total > 0 ? locationsWithInventory.reduce((sum, l) => sum + l.utilization_percentage, 0) / total : 0;

    return {
      total_locations: total,
      total_with_inventory: withInventory,
      high_utilization_count: highUtil,
      medium_utilization_count: mediumUtil,
      low_utilization_count: lowUtil,
      empty_locations: empty,
      average_utilization: avgUtil
    };
  }, [statistics, locationsWithInventory]);

  // Initialize data on mount and when search changes
  useEffect(() => {
    fetchLocationsOptimized(false);
    fetchStatistics();
  }, [debouncedSearchTerm]); // Only re-fetch when search term changes

  // Load basic locations for legacy compatibility
  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  return {
    // Core data
    locations,
    locationsWithInventory: filteredLocations,
    statistics: memoizedStatistics,
    loading,

    // Pagination
    hasMore,
    loadMore,
    page,

    // Functions
    fetchLocations,
    fetchLocationsWithInventory,
    fetchLocationsOptimized,
    fetchStatistics,
    createLocation,
    updateLocation,
    deleteLocation,
    getLocationByCode,
    getLocationsByRow,
    autoCreateLocationFromInventory,
    syncInventoryLocations,
    getLocationInventoryDetails,
  };
}