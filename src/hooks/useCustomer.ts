import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/integrations/local/client';
import { secureGatewayClient } from '@/utils/secureGatewayClient';
import type { Customer, CustomerInsert, CustomerUpdate } from '@/integrations/local/types';
import { toast } from '@/components/ui/sonner';

// Hook สำหรับดึงข้อมูลลูกค้าทั้งหมด
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      console.log('🔍 Fetching customers via secureGatewayClient...');

      try {
        const result = await secureGatewayClient.get<Customer[]>('customers');

        if (result.success && result.data) {
          console.log(`✅ Fetched ${result.data.length || 0} customers via gateway`);
          return result.data;
        }

        // Fallback to direct supabase call if gateway fails
        console.log('⚠️ Gateway failed, falling back to direct supabase call...');
        const { data, error } = await localDb
          .from('customers')
          .select(`
            id,
            customer_name,
            customer_code,
            customer_type,
            phone,
            email,
            address_line1,
            address_line2,
            district,
            province,
            postal_code,
            country,
            is_active,
            created_at,
            updated_at
          `)
          .eq('is_active', true)
          .order('customer_name');

        if (error) {
          console.error('❌ Fallback error fetching customers:', error);
          throw error;
        }

        console.log(`✅ Fallback fetched ${data?.length || 0} customers`);
        return data as Customer[];

      } catch (error) {
        console.error('❌ Error in useCustomers:', error);
        throw error;
      }
    },
  });
}

// Hook สำหรับดึงข้อมูลลูกค้ารายเดียว
export function useCustomer(customerId?: string) {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      if (!customerId) return null;

      console.log('🔍 Fetching customer via gateway:', customerId);

      try {
        const result = await secureGatewayClient.get<Customer>('customers', { id: customerId });

        if (result.success && result.data) {
          console.log('✅ Fetched customer via gateway:', result.data.customer_name);
          return result.data;
        }

        // Fallback to direct supabase call
        console.log('⚠️ Gateway failed, falling back to direct supabase call...');
        const { data, error } = await localDb
          .from('customers')
          .select(`
            id,
            customer_name,
            customer_code,
            customer_type,
            phone,
            email,
            address_line1,
            address_line2,
            district,
            province,
            postal_code,
            country,
            is_active,
            created_at,
            updated_at
          `)
          .eq('id', customerId)
          .single();

        if (error) {
          console.error('❌ Fallback error fetching customer:', error);
          throw error;
        }

        console.log('✅ Fallback fetched customer:', data.customer_name);
        return data as Customer;

      } catch (error) {
        console.error('❌ Error in useCustomer:', error);
        throw error;
      }
    },
    enabled: !!customerId,
  });
}

// Hook สำหรับค้นหาลูกค้า
export function useCustomerSearch(searchTerm?: string) {
  return useQuery({
    queryKey: ['customers', 'search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      console.log('🔍 Searching customers via gateway:', searchTerm);

      try {
        const result = await secureGatewayClient.get<Customer[]>('customers', { search: searchTerm });

        if (result.success && result.data) {
          console.log(`✅ Found ${result.data.length || 0} customers via gateway matching "${searchTerm}"`);
          return result.data;
        }

        // Fallback to direct supabase call
        console.log('⚠️ Gateway search failed, falling back to direct supabase call...');
        const { data, error } = await localDb
          .from('customers')
          .select(`
            id,
            customer_name,
            customer_code,
            customer_type,
            phone,
            email,
            address_line1,
            address_line2,
            district,
            province,
            postal_code,
            country,
            is_active,
            created_at,
            updated_at
          `)
          .eq('is_active', true)
          .or(`customer_name.ilike.%${searchTerm}%,customer_code.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .order('customer_name')
          .limit(20);

        if (error) {
          console.error('❌ Fallback error searching customers:', error);
          throw error;
        }

        console.log(`✅ Fallback found ${data?.length || 0} customers matching "${searchTerm}"`);
        return data as Customer[];

      } catch (error) {
        console.error('❌ Error in useCustomerSearch:', error);
        throw error;
      }
    },
    enabled: !!searchTerm && searchTerm.length >= 2,
  });
}

// Hook สำหรับสถิติลูกค้า
export function useCustomerStats(customerId?: string) {
  return useQuery({
    queryKey: ['customer', customerId, 'stats'],
    queryFn: async () => {
      if (!customerId) return null;

      console.log('📊 Fetching customer stats:', customerId);

      // ดึงจำนวนใบสั่งซื้อและยอดขาย
      const { data: orderStats, error: orderError } = await localDb
        .from('customer_orders')
        .select('id, final_amount, status, created_at')
        .eq('customer_id', customerId);

      if (orderError) {
        console.error('❌ Error fetching customer order stats:', orderError);
        throw orderError;
      }

      // คำนวณสถิติ
      const totalOrders = orderStats?.length || 0;
      const totalAmount = orderStats?.reduce((sum, order) => sum + (order.final_amount || 0), 0) || 0;
      const activeOrders = orderStats?.filter(order =>
        !['DELIVERED', 'CANCELLED', 'RETURNED'].includes(order.status || '')
      ).length || 0;

      // หาวันที่สั่งซื้อล่าสุด
      const lastOrderDate = orderStats && orderStats.length > 0
        ? new Date(Math.max(...orderStats.map(order => new Date(order.created_at).getTime())))
        : null;

      const stats = {
        totalOrders,
        totalAmount,
        activeOrders,
        lastOrderDate: lastOrderDate?.toISOString() || null,
        averageOrderValue: totalOrders > 0 ? totalAmount / totalOrders : 0,
      };

      console.log('✅ Customer stats:', stats);
      return stats;
    },
    enabled: !!customerId,
  });
}

// Hook สำหรับเพิ่มลูกค้าใหม่
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerData: CustomerInsert) => {
      console.log('📝 Creating customer via gateway:', customerData.customer_name);

      try {
        const result = await secureGatewayClient.mutate('createCustomer', customerData);

        if (result.success && result.data) {
          console.log('✅ Customer created via gateway:', result.data.customer_name);
          return result.data as Customer;
        }

        // Fallback to direct supabase call
        console.log('⚠️ Gateway creation failed, falling back to direct supabase call...');
        const { data, error } = await localDb
          .from('customers')
          .insert(customerData)
          .select()
          .single();

        if (error) {
          console.error('❌ Fallback error creating customer:', error);
          throw error;
        }

        console.log('✅ Fallback customer created:', data.customer_name);
        return data as Customer;

      } catch (error) {
        console.error('❌ Error in useCreateCustomer:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`เพิ่มลูกค้า "${data.customer_name}" สำเร็จ`);
    },
    onError: (error) => {
      console.error('❌ Create customer failed:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มลูกค้า');
    },
  });
}

// Hook สำหรับแก้ไขข้อมูลลูกค้า
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, updates }: { customerId: string; updates: CustomerUpdate }) => {
      console.log('📝 Updating customer via gateway:', customerId);

      try {
        const result = await secureGatewayClient.mutate('updateCustomer', { id: customerId, updates });

        if (result.success && result.data) {
          console.log('✅ Customer updated via gateway:', result.data.customer_name);
          return result.data as Customer;
        }

        // Fallback to direct supabase call
        console.log('⚠️ Gateway update failed, falling back to direct supabase call...');
        const { data, error } = await localDb
          .from('customers')
          .update(updates)
          .eq('id', customerId)
          .select()
          .single();

        if (error) {
          console.error('❌ Fallback error updating customer:', error);
          throw error;
        }

        console.log('✅ Fallback customer updated:', data.customer_name);
        return data as Customer;

      } catch (error) {
        console.error('❌ Error in useUpdateCustomer:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', data.id] });
      toast.success(`อัปเดตข้อมูลลูกค้า "${data.customer_name}" สำเร็จ`);
    },
    onError: (error) => {
      console.error('❌ Update customer failed:', error);
      toast.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูลลูกค้า');
    },
  });
}

// Hook สำหรับลบลูกค้า (soft delete)
export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (customerId: string) => {
      console.log('🗑️ Deactivating customer:', customerId);

      // ใช้ soft delete โดยเปลี่ยน is_active เป็น false
      const { data, error } = await localDb
        .from('customers')
        .update({ is_active: false })
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error deactivating customer:', error);
        throw error;
      }

      console.log('✅ Customer deactivated:', data.customer_name);
      return data as Customer;
    },
    onSuccess: (data) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', data.id] });
      toast.success(`ปิดใช้งานลูกค้า "${data.customer_name}" สำเร็จ`);
    },
    onError: (error) => {
      console.error('❌ Delete customer failed:', error);
      toast.error('เกิดข้อผิดพลาดในการปิดใช้งานลูกค้า');
    },
  });
}

// Hook สำหรับ reactive customer data
export function useCustomerRealtime() {
  const queryClient = useQueryClient();

  // Setup real-time subscription
  useQuery({
    queryKey: ['customers', 'realtime'],
    queryFn: () => {
      console.log('🔄 Setting up customer realtime subscription...');

      const subscription = localDb
        .channel('customers-changes')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'customers'
          },
          (payload) => {
            console.log('🔄 Customer change detected:', payload);

            // Invalidate และ refetch customer queries
            queryClient.invalidateQueries({ queryKey: ['customers'] });

            if (payload.new && 'id' in payload.new) {
              queryClient.invalidateQueries({
                queryKey: ['customer', payload.new.id]
              });
            }
          })
        .subscribe();

      return subscription;
    },
    staleTime: Infinity, // ไม่ต้อง refetch เพราะเป็น subscription
  });
}

// Utility functions
export const customerTypeOptions = [
  { value: 'RETAIL', label: 'ลูกค้าปลีก' },
  { value: 'WHOLESALE', label: 'ลูกค้าส่ง' },
  { value: 'DISTRIBUTOR', label: 'ตัวแทนจำหน่าย' },
  { value: 'CORPORATE', label: 'ลูกค้าองค์กร' },
];

export const getCustomerTypeLabel = (type: string) => {
  const option = customerTypeOptions.find(opt => opt.value === type);
  return option ? option.label : type;
};