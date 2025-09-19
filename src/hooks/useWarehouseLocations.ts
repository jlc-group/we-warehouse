import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { normalizeLocation, isValidLocation, parseLocation } from '@/utils/locationUtils';

type WarehouseLocation = Database['public']['Tables']['warehouse_locations']['Row'];
type WarehouseLocationInsert = Database['public']['Tables']['warehouse_locations']['Insert'];
type WarehouseLocationUpdate = Database['public']['Tables']['warehouse_locations']['Update'];

interface LocationWithInventoryCount extends WarehouseLocation {
  inventory_count: number;
  total_boxes: number;
  total_loose: number;
  total_cartons: number;
  total_pieces: number;
  total_sheets: number;
  total_bottles: number;
  total_sachets: number;
  total_quantity_sum: number;
  product_list: string | null;
  detailed_inventory: InventoryItem[] | null;
  utilization_percentage: number;
}

interface InventoryItem {
  sku_code: string;
  product_name: string;
  unit: string;
  box_quantity: number;
  loose_quantity: number;
  total_quantity: number;
  unit_display: string;
}

interface LocationStatistics {
  total_locations: number;
  total_with_inventory: number;
  high_utilization_count: number;
  medium_utilization_count: number;
  low_utilization_count: number;
  empty_locations: number;
  average_utilization: number;
}

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

  // Fetch optimized locations using RPC function
  const fetchLocationsOptimized = useCallback(async (loadMore: boolean = false) => {
    try {
      setLoading(true);

      const currentPage = loadMore ? page : 0;

      // Use the optimized RPC function
      const { data, error } = await supabase.rpc('get_warehouse_locations_optimized', {
        search_term: debouncedSearchTerm,
        limit_count: pageSize,
        offset_count: currentPage * pageSize,
        order_by: 'location_code',
        order_direction: 'ASC'
      });

      if (error) throw error;

      const typedData = data as LocationWithInventoryCount[];

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

  // Fetch location statistics using RPC function
  const fetchStatistics = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_location_statistics');

      if (error) throw error;

      if (data && data.length > 0) {
        setStatistics(data[0] as LocationStatistics);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, []);

  // Legacy function for backward compatibility
  const fetchLocations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('warehouse_locations')
        .select('*')
        .order('location_code');

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error('Error fetching warehouse locations:', error);
    }
  }, []);

  // Legacy function for backward compatibility
  const fetchLocationsWithInventory = useCallback(async () => {
    await fetchLocationsOptimized(false);
  }, [fetchLocationsOptimized]);

  // Create new warehouse location
  const createLocation = useCallback(async (locationData: WarehouseLocationInsert) => {
    try {
      const { data, error } = await supabase
        .from('warehouse_locations')
        .insert([locationData])
        .select()
        .single();

      if (error) throw error;

      // Refresh data
      await fetchLocations();
      await fetchLocationsWithInventory();

      toast({
        title: 'สร้างตำแหน่งสำเร็จ',
        description: `ตำแหน่ง ${locationData.location_code} ถูกสร้างแล้ว`,
      });

      return data;
    } catch (error: any) {
      console.error('Error creating location:', error);

      if (error.code === '23505') {
        toast({
          title: 'ตำแหน่งนี้มีอยู่แล้ว',
          description: `ตำแหน่ง ${locationData.location_code} ถูกสร้างไว้แล้ว`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถสร้างตำแหน่งได้',
          variant: 'destructive',
        });
      }
      throw error;
    }
  }, [fetchLocations, fetchLocationsWithInventory, toast]);

  // Update warehouse location
  const updateLocation = useCallback(async (id: string, locationData: WarehouseLocationUpdate) => {
    try {
      const { data, error } = await supabase
        .from('warehouse_locations')
        .update(locationData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Refresh data
      await fetchLocations();
      await fetchLocationsWithInventory();

      toast({
        title: 'แก้ไขตำแหน่งสำเร็จ',
        description: `ตำแหน่ง ${locationData.location_code || ''} ถูกแก้ไขแล้ว`,
      });

      return data;
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถแก้ไขตำแหน่งได้',
        variant: 'destructive',
      });
      throw error;
    }
  }, [fetchLocations, fetchLocationsWithInventory, toast]);

  // Delete warehouse location
  const deleteLocation = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('warehouse_locations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Refresh data
      await fetchLocations();
      await fetchLocationsWithInventory();

      toast({
        title: 'ลบตำแหน่งสำเร็จ',
        description: 'ตำแหน่งถูกลบออกจากระบบแล้ว',
      });
    } catch (error: any) {
      console.error('Error deleting location:', error);

      if (error.code === '23503') {
        toast({
          title: 'ไม่สามารถลบได้',
          description: 'ตำแหน่งนี้มีสินค้าคงคลังอยู่ กรุณาย้ายสินค้าก่อนลบ',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'เกิดข้อผิดพลาด',
          description: 'ไม่สามารถลบตำแหน่งได้',
          variant: 'destructive',
        });
      }
      throw error;
    }
  }, [fetchLocations, fetchLocationsWithInventory, toast]);

  // Get location by location_code
  const getLocationByCode = useCallback((location_code: string) => {
    return locations.find(loc => loc.location_code === location_code);
  }, [locations]);

  // Get locations by row
  const getLocationsByRow = useCallback((row: string) => {
    return locations.filter(loc => loc.row === row);
  }, [locations]);

  // Auto-create location from inventory location
  const autoCreateLocationFromInventory = useCallback(async (location: string) => {
    try {
      const normalizedLocation = normalizeLocation(location);

      if (!isValidLocation(normalizedLocation)) {
        console.warn('Invalid location format:', location);
        return null;
      }

      // Check if location already exists
      const existingLocation = getLocationByCode(normalizedLocation);
      if (existingLocation) {
        return existingLocation;
      }

      // Parse location components
      const parsed = parseLocation(normalizedLocation);
      if (!parsed) {
        console.warn('Could not parse location:', normalizedLocation);
        return null;
      }

      // Create new location
      const newLocationData: WarehouseLocationInsert = {
        location_code: normalizedLocation,
        row: parsed.row,
        level: parsed.level,
        position: parsed.position,
        location_type: 'shelf',
        capacity_boxes: 100,
        capacity_loose: 1000,
        description: `Auto-created from inventory (${normalizedLocation})`,
        user_id: '00000000-0000-0000-0000-000000000000'
      };

      return await createLocation(newLocationData);
    } catch (error) {
      console.error('Error auto-creating location:', error);
      return null;
    }
  }, [getLocationByCode, createLocation]);

  // Sync existing inventory locations to warehouse_locations
  const syncInventoryLocations = useCallback(async () => {
    try {
      // Call the database function to sync
      const { data, error } = await supabase
        .rpc('sync_inventory_to_warehouse_locations');

      if (error) throw error;

      // Refresh data
      await fetchLocations();
      await fetchLocationsWithInventory();

      toast({
        title: 'ซิงค์ข้อมูลสำเร็จ',
        description: `ผลลัพธ์: ${data}`,
      });

      return data;
    } catch (error) {
      console.error('Error syncing inventory locations:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถซิงค์ข้อมูลตำแหน่งได้',
        variant: 'destructive',
      });
      throw error;
    }
  }, [fetchLocations, fetchLocationsWithInventory, toast]);

  // Get detailed inventory for a specific location
  const getLocationInventoryDetails = useCallback(async (locationCode: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_location_inventory_details', {
          location_code_param: locationCode
        });

      if (error) throw error;

      return data as InventoryItem[];
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