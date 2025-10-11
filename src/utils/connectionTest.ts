// Connection test utilities for Sales System
import { supabase } from '@/integrations/supabase/client';

export interface ConnectionTestResult {
  success: boolean;
  tableName: string;
  error?: string;
  recordCount?: number;
  responseTime?: number;
}

export interface DatabaseStatus {
  isHealthy: boolean;
  completedMigrations: string[];
  pendingMigrations: string[];
  errors: string[];
  totalTests: number;
  passedTests: number;
}

// Test individual table connection
export const testTableConnection = async (tableName: string): Promise<ConnectionTestResult> => {
  const startTime = Date.now();

  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        success: false,
        tableName,
        error: error.message,
        responseTime
      };
    }

    return {
      success: true,
      tableName,
      recordCount: count || 0,
      responseTime
    };
  } catch (error: any) {
    return {
      success: false,
      tableName,
      error: error.message || 'Connection failed',
      responseTime: Date.now() - startTime
    };
  }
};

// Test view connection
export const testViewConnection = async (viewName: string): Promise<ConnectionTestResult> => {
  const startTime = Date.now();

  try {
    const { data, error, count } = await supabase
      .from(viewName)
      .select('*', { count: 'exact' })
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        success: false,
        tableName: viewName,
        error: error.message,
        responseTime
      };
    }

    return {
      success: true,
      tableName: viewName,
      recordCount: count || 0,
      responseTime
    };
  } catch (error: any) {
    return {
      success: false,
      tableName: viewName,
      error: error.message || 'View connection failed',
      responseTime: Date.now() - startTime
    };
  }
};

// Test complete Sales System database status
export const testSalesSystemStatus = async (): Promise<DatabaseStatus> => {
  const requiredTables = ['customers', 'sales_orders', 'sales_order_items'];
  const requiredViews = ['sales_orders_with_customer', 'products_summary', 'available_products_for_sales'];

  const allTests = [...requiredTables, ...requiredViews];
  const results: ConnectionTestResult[] = [];
  const errors: string[] = [];

  // Test tables
  for (const table of requiredTables) {
    const result = await testTableConnection(table);
    results.push(result);
    if (!result.success) {
      errors.push(`Table ${table}: ${result.error}`);
    }
  }

  // Test views
  for (const view of requiredViews) {
    const result = await testViewConnection(view);
    results.push(result);
    if (!result.success) {
      errors.push(`View ${view}: ${result.error}`);
    }
  }

  const passedTests = results.filter(r => r.success).length;
  const completedMigrations = [];
  const pendingMigrations = [];

  // Determine migration status
  const tablesExist = requiredTables.every(table =>
    results.find(r => r.tableName === table)?.success
  );
  const viewsExist = requiredViews.every(view =>
    results.find(r => r.tableName === view)?.success
  );

  if (tablesExist) {
    completedMigrations.push('Sales System Tables (customers, sales_orders, sales_order_items)');
  } else {
    pendingMigrations.push('Sales System Migration - 20250929_create_sales_system.sql');
  }

  if (viewsExist) {
    completedMigrations.push('Products Summary Views (products_summary, available_products_for_sales)');
  } else {
    pendingMigrations.push('Products Views Migration - products_summary_views.sql');
  }

  return {
    isHealthy: passedTests === allTests.length,
    completedMigrations,
    pendingMigrations,
    errors,
    totalTests: allTests.length,
    passedTests
  };
};

// Test basic Supabase connection
export const testSupabaseConnection = async (): Promise<ConnectionTestResult> => {
  const startTime = Date.now();

  try {
    // Try to access a system table that should always exist
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        success: false,
        tableName: 'supabase_connection',
        error: `Connection failed: ${error.message}`,
        responseTime
      };
    }

    return {
      success: true,
      tableName: 'supabase_connection',
      responseTime
    };
  } catch (error: any) {
    return {
      success: false,
      tableName: 'supabase_connection',
      error: `Network error: ${error.message}`,
      responseTime: Date.now() - startTime
    };
  }
};

// Diagnose specific 404/400 errors
export const diagnoseError = (error: string): {
  type: 'migration_needed' | 'permission_error' | 'connection_error' | 'unknown';
  description: string;
  solution: string;
} => {
  const errorLower = error.toLowerCase();

  if (errorLower.includes('404') || errorLower.includes('does not exist') || errorLower.includes('relation')) {
    return {
      type: 'migration_needed',
      description: 'ตารางหรือ view ยังไม่ถูกสร้างในฐานข้อมูล',
      solution: 'ต้องรัน migration scripts เพื่อสร้างตารางที่จำเป็น'
    };
  }

  if (errorLower.includes('400') || errorLower.includes('relationship') || errorLower.includes('foreign key')) {
    return {
      type: 'migration_needed',
      description: 'ความสัมพันธ์ระหว่างตารางยังไม่ถูกสร้าง',
      solution: 'ต้องรัน migration scripts ให้ครบถ้วน'
    };
  }

  if (errorLower.includes('permission') || errorLower.includes('denied') || errorLower.includes('unauthorized')) {
    return {
      type: 'permission_error',
      description: 'ไม่มีสิทธิ์เข้าถึงฐานข้อมูล',
      solution: 'ตรวจสอบ RLS policies และ API keys'
    };
  }

  if (errorLower.includes('fetch') || errorLower.includes('network') || errorLower.includes('timeout')) {
    return {
      type: 'connection_error',
      description: 'ปัญหาการเชื่อมต่อเครือข่าย',
      solution: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและ Supabase URL'
    };
  }

  return {
    type: 'unknown',
    description: 'ข้อผิดพลาดที่ไม่สามารถระบุสาเหตุได้',
    solution: 'ดู error message และติดต่อทีมพัฒนาหากจำเป็น'
  };
};

// Format response time for display
export const formatResponseTime = (ms: number): string => {
  if (ms < 1000) {
    return `${ms}ms`;
  } else {
    return `${(ms / 1000).toFixed(1)}s`;
  }
};

// Check if migration is needed based on errors
export const isMigrationNeeded = (errors: string[]): boolean => {
  return errors.some(error => {
    const diagnosis = diagnoseError(error);
    return diagnosis.type === 'migration_needed';
  });
};

// Generate migration checklist
export const generateMigrationChecklist = (status: DatabaseStatus): Array<{
  id: string;
  title: string;
  completed: boolean;
  description: string;
}> => {
  return [
    {
      id: 'sales_tables',
      title: 'Sales System Tables',
      completed: status.completedMigrations.some(m => m.includes('Sales System Tables')),
      description: 'ตาราง customers, sales_orders, sales_order_items'
    },
    {
      id: 'products_views',
      title: 'Products Summary Views',
      completed: status.completedMigrations.some(m => m.includes('Products Summary Views')),
      description: 'Views สำหรับแสดงสินค้าในระบบขาย'
    }
  ];
};

export default {
  testTableConnection,
  testViewConnection,
  testSalesSystemStatus,
  testSupabaseConnection,
  diagnoseError,
  formatResponseTime,
  isMigrationNeeded,
  generateMigrationChecklist
};