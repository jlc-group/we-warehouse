export function useWarehouseLocations() {
  return {
    locations: [],
    loading: false,
    error: null,
    refreshLocations: () => Promise.resolve(),
    statistics: null,
    loadStatistics: () => Promise.resolve(),
    createLocation: () => Promise.resolve({ success: true }),
    updateLocation: () => Promise.resolve({ success: true }),
    deleteLocation: () => Promise.resolve({ success: true })
  };
}