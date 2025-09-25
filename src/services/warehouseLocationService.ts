// Mock service due to type conflicts
export const WarehouseLocationService = {
  getAllLocations: () => Promise.resolve({ data: [], error: null, success: true }),
  createLocation: () => Promise.resolve({ data: null, error: null, success: true }),
  updateLocation: () => Promise.resolve({ data: null, error: null, success: true }),
  deleteLocation: () => Promise.resolve({ data: true, error: null, success: true })
};