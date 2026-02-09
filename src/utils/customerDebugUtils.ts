// Debug utilities สำหรับตรวจสอบข้อมูลลูกค้าจริงในฐานข้อมูล
import { localDb } from '@/integrations/local/client';

export interface CustomerDebugInfo {
  success: boolean;
  customersTableExists: boolean;
  customerCount: number;
  sampleCustomers: any[];
  errors: string[];
  rlsPolicies: any[];
  rawError?: any;
}

/**
 * ตรวจสอบข้อมูลลูกค้าจริงในฐานข้อมูล
 */
export const debugCustomersTable = async (): Promise<CustomerDebugInfo> => {
  const debugInfo: CustomerDebugInfo = {
    success: false,
    customersTableExists: false,
    customerCount: 0,
    sampleCustomers: [],
    errors: [],
    rlsPolicies: []
  };

  console.group('🔍 Debug Customers Table');

  try {
    // 1. ทดสอบว่าตาราง customers มีอยู่จริง
    console.log('1. Testing customers table existence...');
    const { count, error: countError } = await localDb
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      debugInfo.errors.push(`Count query error: ${countError.message}`);
      debugInfo.rawError = countError;
      console.error('❌ Customers table count error:', countError);
    } else {
      debugInfo.customersTableExists = true;
      debugInfo.customerCount = count || 0;
      console.log(`✅ Customers table exists with ${count} records`);
    }

    // 2. ดึงข้อมูลลูกค้าตัวอย่าง
    if (debugInfo.customersTableExists) {
      console.log('2. Fetching sample customers...');
      const { data: customers, error: fetchError } = await localDb
        .from('customers')
        .select(`
          id,
          customer_code,
          customer_name,
          customer_type,
          phone,
          email,
          contact_person,
          is_active,
          created_at
        `)
        .limit(5);

      if (fetchError) {
        debugInfo.errors.push(`Fetch query error: ${fetchError.message}`);
        console.error('❌ Error fetching customers:', fetchError);
      } else {
        debugInfo.sampleCustomers = customers || [];
        console.log(`✅ Fetched ${customers?.length || 0} sample customers`);

        if (customers && customers.length > 0) {
          console.log('Sample customer data:');
          customers.forEach((customer, index) => {
            console.log(`  ${index + 1}. [${customer.customer_code}] ${customer.customer_name} (${customer.phone || 'No phone'})`);
          });
        }
      }
    }

    // 3. ตรวจสอบ RLS policies
    console.log('3. Checking RLS policies...');
    try {
      const { data: policies, error: policyError } = await localDb
        .rpc('pg_policies')
        .select('*')
        .eq('tablename', 'customers');

      if (policyError) {
        debugInfo.errors.push(`RLS policy check error: ${policyError.message}`);
        console.warn('⚠️ Could not check RLS policies:', policyError.message);
      } else {
        debugInfo.rlsPolicies = policies || [];
        console.log(`📋 Found ${policies?.length || 0} RLS policies for customers table`);
      }
    } catch (rpcError) {
      console.warn('⚠️ RLS policy check not available (normal for some setups)');
    }

    // 4. ทดสอบ direct query แบบต่างๆ
    console.log('4. Testing different query approaches...');

    // ทดสอบ query แบบง่าย
    const { data: simpleData, error: simpleError } = await localDb
      .from('customers')
      .select('id, customer_code, customer_name')
      .limit(1);

    if (simpleError) {
      debugInfo.errors.push(`Simple query error: ${simpleError.message}`);
      console.error('❌ Simple query failed:', simpleError);
    } else {
      console.log('✅ Simple query works:', simpleData?.length || 0, 'records');
    }

    // ทดสอบ query พร้อม filter
    const { data: filteredData, error: filterError } = await localDb
      .from('customers')
      .select('id, customer_code, customer_name, is_active')
      .eq('is_active', true)
      .limit(3);

    if (filterError) {
      debugInfo.errors.push(`Filtered query error: ${filterError.message}`);
      console.error('❌ Filtered query failed:', filterError);
    } else {
      console.log('✅ Filtered query works:', filteredData?.length || 0, 'active customers');
    }

    // สรุปผลลัพธ์
    debugInfo.success = debugInfo.customersTableExists && debugInfo.errors.length === 0;

    if (debugInfo.success) {
      console.log('🎉 All customer table tests passed!');
    } else {
      console.warn('⚠️ Some issues found with customers table');
    }

  } catch (error: any) {
    debugInfo.errors.push(`Unexpected error: ${error.message}`);
    debugInfo.rawError = error;
    console.error('❌ Unexpected error in debug:', error);
  }

  console.groupEnd();
  return debugInfo;
};

/**
 * ทดสอบและแสดงผลลัพธ์การ debug ข้อมูลลูกค้า
 */
export const runCustomerDebugTest = async () => {
  console.log('🚀 Starting customer debug test...');

  const result = await debugCustomersTable();

  console.group('📊 Debug Results Summary');
  console.log('Success:', result.success);
  console.log('Table exists:', result.customersTableExists);
  console.log('Customer count:', result.customerCount);
  console.log('Sample customers:', result.sampleCustomers.length);
  console.log('Errors:', result.errors.length);

  if (result.errors.length > 0) {
    console.group('❌ Errors found:');
    result.errors.forEach((error, index) => {
      console.error(`${index + 1}. ${error}`);
    });
    console.groupEnd();
  }

  if (result.sampleCustomers.length > 0) {
    console.group('👥 Real customers found:');
    result.sampleCustomers.forEach((customer, index) => {
      console.log(`${index + 1}. [${customer.customer_code}] ${customer.customer_name} - ${customer.phone || 'No phone'} - ${customer.email || 'No email'}`);
    });
    console.groupEnd();
  }

  console.groupEnd();

  return result;
};

/**
 * ล้าง localStorage flags ที่บังคับใช้ mock data สำหรับลูกค้า
 */
export const clearCustomerMockDataFlags = () => {
  const keysToRemove = [
    'force-mock-customers',
    'customers_migration_warning_shown',
    'customers_loaded_success_shown',
    'customer-connection-error',
    'use-fallback-customers',
    'customers-fallback-mode'
  ];

  console.group('🧹 Clearing customer mock data flags');

  keysToRemove.forEach(key => {
    const existing = localStorage.getItem(key);
    if (existing) {
      localStorage.removeItem(key);
      console.log(`✅ Removed: ${key} = ${existing}`);
    } else {
      console.log(`⏭️ Not found: ${key}`);
    }
  });

  console.log('🎯 All customer mock data flags cleared');
  console.groupEnd();
};

export default {
  debugCustomersTable,
  runCustomerDebugTest,
  clearCustomerMockDataFlags
};