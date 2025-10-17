import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LocationInventoryCount {
  location: string;
  count: number;
  isEmpty: boolean;
}

export interface LocationInventoryCountsMap {
  [location: string]: LocationInventoryCount;
}

/**
 * Custom hook to fetch inventory counts per location
 * Returns a map of locations with their item counts and empty status
 */
export const useLocationInventoryCounts = () => {
  return useQuery<LocationInventoryCountsMap>({
    queryKey: ['location-inventory-counts'],
    queryFn: async () => {
      // Fetch all inventory items grouped by location
      const { data, error } = await supabase
        .from('inventory_items')
        .select('location, id')
        .order('location');

      if (error) {
        console.error('Error fetching location inventory counts:', error);
        throw error;
      }

      // Group by location and count items
      const countMap: LocationInventoryCountsMap = {};

      if (data) {
        data.forEach((item) => {
          const location = item.location || 'unknown';

          if (!countMap[location]) {
            countMap[location] = {
              location,
              count: 0,
              isEmpty: true
            };
          }

          countMap[location].count += 1;
          countMap[location].isEmpty = false;
        });
      }

      return countMap;
    },
    // Refetch every 30 seconds to keep data fresh
    refetchInterval: 30000,
    // Keep data in cache for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Cache data for 10 minutes even if component unmounts
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Helper function to get location status based on item count
 */
export const getLocationStatus = (count: number): {
  label: string;
  color: string;
  icon: string;
  bgColor: string;
} => {
  if (count === 0) {
    return {
      label: 'ว่าง',
      color: 'text-green-700',
      icon: '🟢',
      bgColor: 'bg-green-50'
    };
  } else if (count <= 2) {
    return {
      label: `${count} รายการ`,
      color: 'text-blue-700',
      icon: '🔵',
      bgColor: 'bg-blue-50'
    };
  } else if (count <= 5) {
    return {
      label: `${count} รายการ`,
      color: 'text-yellow-700',
      icon: '🟡',
      bgColor: 'bg-yellow-50'
    };
  } else {
    return {
      label: `${count} รายการ`,
      color: 'text-orange-700',
      icon: '🟠',
      bgColor: 'bg-orange-50'
    };
  }
};
