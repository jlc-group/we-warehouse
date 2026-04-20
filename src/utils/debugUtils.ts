// Debug utilities for monitoring database connectivity and cache management
import { localDb } from '@/integrations/local/client';

export interface DebugInfo {
  localStorage: Record<string, any>;
  supabaseConnection: boolean;
  customersTableExists: boolean;
  customersCount: number;
  error?: string;
}

/**
 * Clear all cache and localStorage flags that might prevent real data loading
 */
export const clearAllCache = () => {
  // Clear localStorage flags that might force mock data
  const keysToRemove = [
    'force-mock-customers',
    'database-error-flag',
    'sales-system-error',
    'customer-connection-error',
    'use-fallback-data'
  ];

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });

  console.log('🧹 Cleared localStorage flags:', keysToRemove);

  // Clear any cached data in sessionStorage too
  const sessionKeys = [
    'cached-customers',
    'cached-products',
    'database-status'
  ];

  sessionKeys.forEach(key => {
    sessionStorage.removeItem(key);
  });

  console.log('🧹 Cleared sessionStorage cache:', sessionKeys);
};

/**
 * Force refresh React Query cache for sales-related queries
 */
export const clearReactQueryCache = () => {
  // This will be called from components that have access to queryClient
  const keysToInvalidate = [
    'customers',
    'sales-orders',
    'available-products-for-sales',
    'products-summary'
  ];

  console.log('🔄 React Query cache keys to invalidate:', keysToInvalidate);
  return keysToInvalidate;
};

/**
 * Test database connectivity and gather debug information
 */
export const gatherDebugInfo = async (): Promise<DebugInfo> => {
  const debugInfo: DebugInfo = {
    localStorage: {},
    supabaseConnection: false,
    customersTableExists: false,
    customersCount: 0
  };

  try {
    // Gather localStorage data
    debugInfo.localStorage = {
      'force-mock-customers': localStorage.getItem('force-mock-customers'),
      'database-error-flag': localStorage.getItem('database-error-flag'),
      'sales-system-error': localStorage.getItem('sales-system-error'),
      'customer-connection-error': localStorage.getItem('customer-connection-error'),
      'use-fallback-data': localStorage.getItem('use-fallback-data')
    };

    // Test Supabase connection
    const { data: connectionTest, error: connectionError } = await localDb
      .from('customers')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      debugInfo.error = `Connection error: ${connectionError.message}`;
      console.error('🔴 Supabase connection failed:', connectionError);
    } else {
      debugInfo.supabaseConnection = true;
      debugInfo.customersTableExists = true;
      debugInfo.customersCount = connectionTest || 0;
      console.log('✅ Supabase connection successful, customers count:', debugInfo.customersCount);
    }

    // Additional table structure check
    const { data: tableCheck, error: tableError } = await localDb
      .from('customers')
      .select('id, name, phone')
      .limit(1);

    if (tableError) {
      debugInfo.error = `Table structure error: ${tableError.message}`;
      console.error('🔴 Customers table structure issue:', tableError);
    } else if (tableCheck && tableCheck.length > 0) {
      console.log('✅ Customers table structure OK, sample record:', tableCheck[0]);
    } else {
      console.warn('⚠️ Customers table empty but accessible');
    }

  } catch (error) {
    debugInfo.error = `Debug gathering failed: ${error}`;
    console.error('🔴 Debug info gathering failed:', error);
  }

  return debugInfo;
};

/**
 * Log debug information in a readable format
 */
export const logDebugInfo = (debugInfo: DebugInfo) => {
  console.group('🔍 Sales System Debug Information');
  console.log('📱 LocalStorage Flags:', debugInfo.localStorage);
  console.log('🔗 Supabase Connected:', debugInfo.supabaseConnection);
  console.log('📊 Customers Table Exists:', debugInfo.customersTableExists);
  console.log('🔢 Customers Count:', debugInfo.customersCount);
  if (debugInfo.error) {
    console.error('❌ Error:', debugInfo.error);
  }
  console.groupEnd();
};

/**
 * Emergency reset - clear everything and force fresh data fetch
 */
export const emergencyReset = async () => {
  console.log('🚨 Performing emergency reset...');

  // Clear all cache
  clearAllCache();

  // Gather fresh debug info
  const debugInfo = await gatherDebugInfo();
  logDebugInfo(debugInfo);

  // Return info for components to use
  return debugInfo;
};