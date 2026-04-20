import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { getCurrentUserId, ensureDemoUser } from '@/utils/authHelper';
import { gatherDebugInfo, logDebugInfo } from '@/utils/debugUtils';
import { clearCustomerMockDataFlags } from '@/utils/customerDebugUtils';

export interface Customer {
  id: string;
  customer_code: string;
  customer_name: string; // ใช้ customer_name แทน name
  customer_type?: string;
  name?: string; // เพิ่ม alias สำหรับ backward compatibility
  phone?: string;
  email?: string;
  address?: string;
  address_line1?: string;
  address_line2?: string;
  district?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  contact_person?: string;
  company_name?: string; // alias สำหรับ customer_name
  business_type?: string;
  tax_id?: string;
  credit_limit?: number;
  payment_terms?: number;
  is_active: boolean;
  notes?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateCustomerData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  contact_person?: string;
  company_name?: string;
  tax_id?: string;
  credit_limit?: number;
  payment_terms?: number;
  notes?: string;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  is_active?: boolean;
}

export interface CustomerSearchParams {
  search?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

// Fallback mock data for development when database is not available
const getMockCustomers = (): Customer[] => {
  const currentTime = new Date().toISOString();
  return [
    {
      id: 'mock-customer-1',
      name: 'บริษัท ABC จำกัด',
      phone: '02-123-4567',
      email: 'contact@abc.com',
      address: '123 ถนนสุขุมวิท กรุงเทพฯ',
      contact_person: 'คุณสมชาย ใจดี',
      company_name: 'บริษัท ABC จำกัด',
      tax_id: '0123456789012',
      credit_limit: 100000,
      payment_terms: 30,
      is_active: true,
      notes: 'ลูกค้าประจำ - จ่ายตรงเวลา',
      created_at: currentTime,
      updated_at: currentTime,
      created_by: 'demo-user',
      updated_by: 'demo-user'
    },
    {
      id: 'mock-customer-2',
      name: 'ร้านค้าปลีก XYZ',
      phone: '08-1234-5678',
      email: 'xyz@shop.com',
      address: '456 ถนนรัชดา กรุงเทพฯ',
      contact_person: 'คุณสมหญิง รักสะอาด',
      company_name: 'ห้างหุ้นส่วน XYZ',
      credit_limit: 50000,
      payment_terms: 15,
      is_active: true,
      notes: 'ขายปลีกสินค้าอุปโภค',
      created_at: currentTime,
      updated_at: currentTime,
      created_by: 'demo-user',
      updated_by: 'demo-user'
    },
    {
      id: 'mock-customer-3',
      name: 'โรงแรม Grand Palace',
      phone: '02-987-6543',
      email: 'procurement@grandpalace.com',
      address: '789 ถนนพระราม 1 กรุงเทพฯ',
      contact_person: 'คุณสมศักดิ์ จัดการ',
      company_name: 'โรงแรม Grand Palace Co., Ltd.',
      tax_id: '0987654321098',
      credit_limit: 200000,
      payment_terms: 45,
      is_active: true,
      notes: 'โรงแรม 5 ดาว - สั่งซื้อเป็นงวดใหญ่',
      created_at: currentTime,
      updated_at: currentTime,
      created_by: 'demo-user',
      updated_by: 'demo-user'
    }
  ];
};

// Hook สำหรับดึงข้อมูลลูกค้าทั้งหมด
export const useCustomers = (params?: CustomerSearchParams) => {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async (): Promise<Customer[]> => {
      try {
        // ตรวจสอบและล้าง flags ทั้งหมดที่บังคับใช้ mock data
        console.log('🔍 Checking for mock data flags...');
        clearCustomerMockDataFlags();

        // ลองใช้ direct query ก่อน - พยายามดึงข้อมูลจริง
        console.log('📊 Attempting to fetch real customer data...');
        let query = localDb
          .from('customers')
          .select(`
            id,
            customer_code,
            customer_name,
            customer_type,
            phone,
            email,
            address_line1,
            address_line2,
            district,
            province,
            postal_code,
            country,
            contact_person,
            business_type,
            tax_id,
            credit_limit,
            payment_terms,
            is_active,
            notes,
            tags,
            created_at,
            updated_at,
            created_by,
            updated_by
          `)
          .order('customer_name', { ascending: true });

        // Filter by search term
        if (params?.search) {
          query = query.or(`customer_name.ilike.%${params.search}%,phone.ilike.%${params.search}%,email.ilike.%${params.search}%,customer_code.ilike.%${params.search}%,contact_person.ilike.%${params.search}%`);
        }

        // Filter by active status
        if (params?.is_active !== undefined) {
          query = query.eq('is_active', params.is_active);
        }

        // Pagination - เพิ่ม default limit ที่ใหญ่ขึ้น
        const defaultLimit = params?.limit || 100; // เพิ่มจาก 50 เป็น 100

        if (params?.limit) {
          query = query.limit(params.limit);
        } else {
          // ถ้าไม่ระบุ limit ให้ใช้ 100 records
          query = query.limit(defaultLimit);
        }

        if (params?.offset) {
          query = query.range(params.offset, params.offset + (params.limit || defaultLimit) - 1);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        console.log('✅ Successfully loaded customers from database:', data?.length || 0);

        // Transform ข้อมูลให้ตรงกับ interface Customer
        const transformedData = data?.map((customer: any): Customer => ({
          ...customer,
          name: customer.customer_name, // alias สำหรับ backward compatibility
          company_name: customer.customer_name, // alias
          address: customer.address_line1 || '', // รวม address
        })) || [];

        // แสดง success message และลบ flags ที่เก่า
        if (transformedData.length > 0) {
          // ลบ flags ที่อาจบังคับใช้ mock data
          localStorage.removeItem('customers_migration_warning_shown');
          localStorage.removeItem('database-error-flag');
          localStorage.removeItem('sales-system-error');

          // แสดงข้อความยืนยันว่าใช้ข้อมูลจริง (ไม่มี flag จำกัด)
          console.log(`🎉 SUCCESS: Found ${transformedData.length} customers in database - using REAL DATA!`);
          console.log('📋 Real customer names:', transformedData.slice(0, 3).map(c => c.customer_name).join(', '));
          console.log('🏢 Customer codes:', transformedData.slice(0, 3).map(c => c.customer_code).join(', '));

          // แสดง toast เฉพาะเมื่อเพิ่งเปลี่ยนจาก mock data
          const wasUsingMock = localStorage.getItem('was-using-mock-data');
          if (wasUsingMock || !localStorage.getItem('customers_loaded_success_shown')) {
            toast.success('🎉 ใช้ข้อมูลลูกค้าจริงแล้ว!', {
              description: `พบข้อมูลลูกค้า ${transformedData.length} รายการจากตาราง customers`,
              duration: 5000
            });
            localStorage.removeItem('was-using-mock-data');
            localStorage.setItem('customers_loaded_success_shown', 'true');
          }
        } else if (data && data.length === 0) {
          console.log('⚠️ Database connected but no customers found');
          toast.info('เชื่อมต่อฐานข้อมูลสำเร็จ', {
            description: 'แต่ยังไม่มีข้อมูลลูกค้าในตาราง customers',
            duration: 3000
          });
        }

        return transformedData;

      } catch (error: any) {
        // Enhanced error handling with debug info gathering
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        const is404Error = errorMessage.includes('404') || errorMessage.includes('does not exist') || errorMessage.includes('relation');
        const is400Error = errorMessage.includes('400') || errorMessage.includes('Bad Request') || errorMessage.includes('relationship');
        const isConnectionError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('Failed to fetch');

        console.warn('⚠️ Error fetching customers from database:', errorMessage);

        // Gather debug information when error occurs
        try {
          const debugInfo = await gatherDebugInfo();
          logDebugInfo(debugInfo);
        } catch (debugError) {
          console.warn('Could not gather debug info:', debugError);
        }

        if (is404Error || is400Error) {
          console.error('❌ CRITICAL: Customers table not found or inaccessible!');
          console.error('Raw error:', error);

          // แสดง toast เฉพาะครั้งแรกสำหรับ customers table
          if (!localStorage.getItem('customers_migration_warning_shown')) {
            toast.error('❌ ไม่พบตาราง customers', {
              description: 'ตารางลูกค้าไม่มีอยู่ หรือไม่สามารถเข้าถึงได้',
              duration: 10000,
              action: {
                label: 'ตรวจสอบฐานข้อมูล',
                onClick: () => {
                  console.log('Navigate to database check');
                }
              }
            });
            localStorage.setItem('customers_migration_warning_shown', 'true');
          }

          // ตั้ง flag ว่าใช้ mock data เพื่อแจ้งให้รู้ภายหลัง
          localStorage.setItem('was-using-mock-data', 'true');

          // Return filtered mock data เป็นทางเลือกสุดท้าย
          console.warn('🏃‍♂️ FALLBACK: Using mock data as last resort');
          let mockData = getMockCustomers();

          // Apply search filter to mock data
          if (params?.search) {
            const searchLower = params.search.toLowerCase();
            mockData = mockData.filter(customer =>
              customer.name.toLowerCase().includes(searchLower) ||
              customer.phone?.toLowerCase().includes(searchLower) ||
              customer.email?.toLowerCase().includes(searchLower) ||
              customer.company_name?.toLowerCase().includes(searchLower)
            );
          }

          // Apply active filter to mock data
          if (params?.is_active !== undefined) {
            mockData = mockData.filter(customer => customer.is_active === params.is_active);
          }

          // Apply pagination to mock data
          if (params?.offset || params?.limit) {
            const start = params?.offset || 0;
            const end = start + (params?.limit || 50);
            mockData = mockData.slice(start, end);
          }

          console.log('📋 Using mock customers data:', mockData.length);
          return mockData;

        } else if (isConnectionError) {
          console.error('Connection error fetching customers:', errorMessage);
          toast.error('เกิดปัญหาการเชื่อมต่อ', {
            description: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
            duration: 5000
          });

          // Return mock data for connection errors only
          return getMockCustomers();
        }

        // สำหรับ error อื่นๆ ให้ return mock data แต่แจ้งให้รู้ว่าต้องแก้ไข
        console.error('Unexpected error fetching customers, using fallback data:', errorMessage);

        toast.warning('ข้อผิดพลาดฐานข้อมูล', {
          description: 'ไม่สามารถดึงข้อมูลลูกค้าได้ กรุณา apply migration script',
          duration: 5000,
          action: {
            label: 'ดูวิธีแก้ไข',
            onClick: () => {
              console.log('Navigate to migration troubleshooting');
            }
          }
        });

        return getMockCustomers();
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // ไม่ retry เพื่อให้ fallback ทำงานได้เร็วขึ้น
  });
};

// Hook สำหรับดึงข้อมูลลูกค้ารายเดียว
export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async (): Promise<Customer | null> => {
      if (!id) return null;

      try {
        const { data, error } = await localDb
          .from('customers')
          .select(`
            id,
            customer_code,
            customer_name,
            customer_type,
            phone,
            email,
            address_line1,
            address_line2,
            district,
            province,
            postal_code,
            country,
            contact_person,
            business_type,
            tax_id,
            credit_limit,
            payment_terms,
            is_active,
            notes,
            tags,
            created_at,
            updated_at,
            created_by,
            updated_by
          `)
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') return null; // Not found
          throw error;
        }

        console.log('✅ Successfully fetched customer from database:', id);

        // Transform ข้อมูลให้ตรงกับ interface Customer
        return {
          ...data,
          name: data.customer_name, // alias สำหรับ backward compatibility
          company_name: data.customer_name, // alias
          address: data.address_line1 || '', // รวม address
        };

      } catch (error: any) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        const is404Error = errorMessage.includes('404') || errorMessage.includes('does not exist') || errorMessage.includes('relation');
        const is400Error = errorMessage.includes('400') || errorMessage.includes('Bad Request');

        if (is404Error || is400Error) {
          console.warn('🔧 Customers table not found. Checking mock data for:', id);

          // ลองหาใน mock data
          const mockCustomers = getMockCustomers();
          const mockCustomer = mockCustomers.find(customer => customer.id === id);

          if (mockCustomer) {
            console.log('📋 Found customer in mock data:', id);
            return mockCustomer;
          }
        }

        // สำหรับ error อื่นๆ หรือไม่พบใน mock data
        console.error('Error fetching customer, returning null:', errorMessage);
        return null;
      }
    },
    enabled: !!id,
    retry: false, // ไม่ retry เพื่อให้ fallback ทำงานได้เร็วขึ้น
  });
};

// Hook สำหรับสร้างลูกค้าใหม่
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerData: CreateCustomerData): Promise<Customer> => {
      // ใช้ auth helper สำหรับจัดการ authentication
      ensureDemoUser(); // สร้าง demo user ถ้าไม่มี
      const userId = await getCurrentUserId();

      const { data, error } = await localDb
        .from('customers')
        .insert({
          ...customerData,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Error creating customer: ${error.message}`);
      }

      return data;
    },
    onSuccess: (newCustomer) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['customers'] });

      toast.success('สร้างลูกค้าใหม่เรียบร้อยแล้ว', {
        description: `ลูกค้า: ${newCustomer.name}`,
      });
    },
    onError: (error) => {
      toast.error('เกิดข้อผิดพลาดในการสร้างลูกค้า', {
        description: error.message,
      });
    },
  });
};

// Hook สำหรับอัปเดตลูกค้า
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateCustomerData & { id: string }): Promise<Customer> => {
      const userId = await getCurrentUserId();

      const { data, error } = await localDb
        .from('customers')
        .update({
          ...updateData,
          updated_by: userId,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Error updating customer: ${error.message}`);
      }

      return data;
    },
    onSuccess: (updatedCustomer) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', updatedCustomer.id] });

      toast.success('อัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว', {
        description: `ลูกค้า: ${updatedCustomer.name}`,
      });
    },
    onError: (error) => {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตลูกค้า', {
        description: error.message,
      });
    },
  });
};

// Hook สำหรับลบลูกค้า (soft delete)
export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data: { user } } = await localDb.auth.getUser();

      // Soft delete โดยการ set is_active = false
      const { error } = await localDb
        .from('customers')
        .update({
          is_active: false,
          updated_by: user?.id,
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Error deleting customer: ${error.message}`);
      }
    },
    onSuccess: () => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['customers'] });

      toast.success('ลบลูกค้าเรียบร้อยแล้ว');
    },
    onError: (error) => {
      toast.error('เกิดข้อผิดพลาดในการลบลูกค้า', {
        description: error.message,
      });
    },
  });
};

// Hook สำหรับค้นหาลูกค้า (real-time search)
export const useCustomerSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: customers, isLoading } = useCustomers({
    search: debouncedSearchTerm,
    is_active: true,
    limit: 1000, // เพิ่มขีดจำกัดให้แสดงลูกค้าได้มากขึ้น
  });

  return {
    searchTerm,
    setSearchTerm,
    customers: customers || [],
    isLoading,
  };
};

// Hook สำหรับดึงลูกค้าที่ใช้งานอยู่
export const useActiveCustomers = () => {
  return useCustomers({ is_active: true });
};

// Hook สำหรับสถิติลูกค้า
export const useCustomerStats = () => {
  return useQuery({
    queryKey: ['customer-stats'],
    queryFn: async () => {
      const [
        { count: totalCustomers },
        { count: activeCustomers },
        { count: inactiveCustomers }
      ] = await Promise.all([
        localDb.from('customers').select('*', { count: 'exact', head: true }),
        localDb.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', true),
        localDb.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', false),
      ]);

      return {
        total: totalCustomers || 0,
        active: activeCustomers || 0,
        inactive: inactiveCustomers || 0,
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Utility functions
export const formatCustomerDisplay = (customer: Customer): string => {
  const parts = [customer.name];
  if (customer.company_name && customer.company_name !== customer.name) {
    parts.push(`(${customer.company_name})`);
  }
  if (customer.phone) {
    parts.push(customer.phone);
  }
  return parts.join(' ');
};

export const validateCustomerData = (data: CreateCustomerData): string[] => {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push('ชื่อลูกค้าจำเป็นต้องระบุ');
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('รูปแบบอีเมลไม่ถูกต้อง');
  }

  if (data.phone && !/^[0-9\-+()\\s]+$/.test(data.phone)) {
    errors.push('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
  }

  if (data.credit_limit && data.credit_limit < 0) {
    errors.push('วงเงินเครดิตต้องมากกว่าหรือเท่ากับ 0');
  }

  if (data.payment_terms && data.payment_terms <= 0) {
    errors.push('เงื่อนไขการชำระเงินต้องมากกว่า 0 วัน');
  }

  return errors;
};

export default {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useCustomerSearch,
  useActiveCustomers,
  useCustomerStats,
  formatCustomerDisplay,
  validateCustomerData,
};