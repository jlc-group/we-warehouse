// Mock service due to database schema issues
export const TableManagementService = {
  checkTableExists: () => Promise.resolve({ data: true, error: null, success: true }),
  getAllTables: () => Promise.resolve({ data: [], error: null, success: true }),
  getTableSchema: () => Promise.resolve({ data: [], error: null, success: true })
};