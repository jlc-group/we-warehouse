// Mock service with expected interface
export const WarehouseLocationService = {
  getAllLocations: () => Promise.resolve({ data: [], error: null, success: true }),
  createLocation: (data: any) => Promise.resolve({ data: null, error: null, success: true }),
  updateLocation: (id: string, data: any) => Promise.resolve({ data: null, error: null, success: true }),
  deleteLocation: (id: string) => Promise.resolve({ data: true, error: null, success: true }),
  getLocationsWithInventory: () => Promise.resolve({ data: [], error: null, success: true }),
  getLocationStatistics: () => Promise.resolve({ data: null, error: null, success: true }),
  autoCreateLocationFromInventory: (location: string) => Promise.resolve({ data: null, error: null, success: true }),
  syncInventoryLocations: () => Promise.resolve({ data: null, error: null, success: true }),
  getLocationInventoryDetails: (location: string) => Promise.resolve({ data: [], error: null, success: true })
};