// Database connectivity test utility
import { supabase } from '@/integrations/supabase/client';

export async function testDatabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🔍 Testing database connection...');

    // Test 1: Basic connection
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Database connection failed:', error);
      return {
        success: false,
        message: `Database connection failed: ${error.message}`,
        details: error
      };
    }

    console.log('✅ Database connection successful');
    console.log('📊 Sample data:', data);

    return {
      success: true,
      message: `Database connected successfully. Found ${data?.length || 0} items in inventory_items table.`,
      details: data
    };

  } catch (error) {
    console.error('❌ Unexpected error testing database:', error);
    return {
      success: false,
      message: `Unexpected error: ${error}`,
      details: error
    };
  }
}

export async function testTablesExist(): Promise<{
  inventory_items: boolean;
  products: boolean;
  details: any;
}> {
  const results = {
    inventory_items: false,
    products: false,
    details: {} as any
  };

  try {
    // Test inventory_items table
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory_items')
      .select('id')
      .limit(1);

    results.inventory_items = !inventoryError;
    results.details.inventory_items = {
      success: !inventoryError,
      error: inventoryError?.message,
      count: inventoryData?.length || 0
    };

    // Test products table
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    results.products = !productsError;
    results.details.products = {
      success: !productsError,
      error: productsError?.message,
      count: productsData?.length || 0
    };

    console.log('📋 Table existence test results:', results);
    return results;

  } catch (error) {
    console.error('❌ Error testing tables:', error);
    results.details.error = error;
    return results;
  }
}

// Helper function to run all tests
export async function runDatabaseTests(): Promise<void> {
  console.group('🧪 Database Tests');

  const connectionTest = await testDatabaseConnection();
  console.log('Connection Test:', connectionTest);

  const tablesTest = await testTablesExist();
  console.log('Tables Test:', tablesTest);

  console.groupEnd();
}

// Global function for browser console
if (typeof window !== 'undefined') {
  (window as any).testDatabase = runDatabaseTests;
  (window as any).testConnection = testDatabaseConnection;
  (window as any).testTables = testTablesExist;
}