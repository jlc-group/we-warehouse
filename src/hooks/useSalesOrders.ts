import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/integrations/local/client';
import { toast } from '@/components/ui/sonner';
import { getCurrentUserId, ensureDemoUser } from '@/utils/authHelper';

export interface SalesOrder {
  id: string;
  order_number: string;
  customer_id: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'confirmed' | 'picking' | 'packed' | 'shipping' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  order_date: string;
  required_date?: string;
  shipped_date?: string;
  delivered_date?: string;
  notes?: string;
  delivery_address?: string;
  delivery_instructions?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  sales_person_id?: string;
  warehouse_person_id?: string;
  shipping_person_id?: string;

  // Relations
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_company?: string;
}

export interface SalesOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity_cartons: number;
  quantity_boxes: number;
  quantity_pieces: number;
  total_pieces: number;
  unit_price: number;
  line_total: number;
  picked_cartons: number;
  picked_boxes: number;
  picked_pieces: number;
  total_picked: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSalesOrderData {
  customer_id: string;
  subtotal: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount: number;
  notes?: string;
  delivery_address?: string;
  delivery_instructions?: string;
  required_date?: string;
  order_items: Array<{
    product_id: string;
    product_name: string;
    product_sku?: string;
    quantity_cartons: number;
    quantity_boxes: number;
    quantity_pieces: number;
    total_pieces: number;
    unit_price: number;
    line_total: number;
    notes?: string;
  }>;
}

export interface UpdateSalesOrderData extends Partial<CreateSalesOrderData> {
  status?: SalesOrder['status'];
  payment_status?: SalesOrder['payment_status'];
  shipped_date?: string;
  delivered_date?: string;
  sales_person_id?: string;
  warehouse_person_id?: string;
  shipping_person_id?: string;
}

export interface SalesOrderSearchParams {
  search?: string;
  status?: SalesOrder['status'];
  payment_status?: SalesOrder['payment_status'];
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

// Hook สำหรับดึงข้อมูลใบสั่งซื้อทั้งหมด
export const useSalesOrders = (params?: SalesOrderSearchParams) => {
  return useQuery({
    queryKey: ['sales-orders', params],
    queryFn: async (): Promise<SalesOrder[]> => {
      console.log('🔄 Fetching sales orders with params:', params);

      // 🎯 ลำดับการลอง query: View → Direct Table Join → ถ้าไม่มีตารางให้ fallback เป็น empty

      // 1. ลองใช้ view ก่อน (ดีที่สุด)
      try {
        console.log('🔍 Trying sales_orders_with_customer view...');
        const viewQuery = localDb
          .from('sales_orders_with_customer')
          .select('*')
          .order('created_at', { ascending: false });

        // Apply filters to view query
        let query = viewQuery;
        if (params?.search) {
          query = query.or(`order_number.ilike.%${params.search}%,customer_name.ilike.%${params.search}%,customer_phone.ilike.%${params.search}%`);
        }
        if (params?.status) {
          query = query.eq('status', params.status);
        }
        if (params?.payment_status) {
          query = query.eq('payment_status', params.payment_status);
        }
        if (params?.customer_id) {
          query = query.eq('customer_id', params.customer_id);
        }
        if (params?.date_from) {
          query = query.gte('order_date', params.date_from);
        }
        if (params?.date_to) {
          query = query.lte('order_date', params.date_to);
        }
        if (params?.limit) {
          query = query.limit(params.limit);
        }
        if (params?.offset) {
          query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
        }

        const { data: viewData, error: viewError } = await query;

        if (!viewError && viewData) {
          console.log('✅ Successfully used sales_orders_with_customer view:', viewData.length);
          return viewData;
        }

        console.warn('⚠️ View query failed, trying direct table join:', viewError?.message);
        throw viewError; // ขว้างต่อไปที่ fallback

      } catch (viewError) {
        // 2. ถ้า view ไม่มี ลองใช้ตาราง sales_orders โดยตรง
        console.log('🔄 Trying direct sales_orders table with customer join...');

        try {
          let directQuery = localDb
            .from('sales_orders')
            .select(`
              id,
              order_number,
              customer_id,
              customer_name,
              customer_phone,
              customer_email,
              subtotal,
              discount_amount,
              tax_amount,
              total_amount,
              status,
              payment_status,
              order_date,
              delivery_date,
              notes,
              created_at,
              updated_at,
              customers!left (
                name,
                phone,
                email,
                company_name,
                address
              )
            `)
            .order('created_at', { ascending: false });

          // Apply filters
          if (params?.search) {
            directQuery = directQuery.or(`order_number.ilike.%${params.search}%,customer_name.ilike.%${params.search}%,customer_phone.ilike.%${params.search}%`);
          }
          if (params?.status) {
            directQuery = directQuery.eq('status', params.status);
          }
          if (params?.payment_status) {
            directQuery = directQuery.eq('payment_status', params.payment_status);
          }
          if (params?.customer_id) {
            directQuery = directQuery.eq('customer_id', params.customer_id);
          }
          if (params?.date_from) {
            directQuery = directQuery.gte('order_date', params.date_from);
          }
          if (params?.date_to) {
            directQuery = directQuery.lte('order_date', params.date_to);
          }
          if (params?.limit) {
            directQuery = directQuery.limit(params.limit);
          }
          if (params?.offset) {
            directQuery = directQuery.range(params.offset, params.offset + (params.limit || 50) - 1);
          }

          const { data: directData, error: directError } = await directQuery;

          if (!directError && directData) {
            // Transform data to match expected format
            const transformedData = directData.map(order => {
              const customerData = Array.isArray(order.customers) ? order.customers[0] : order.customers;

              return {
                ...order,
                customers: undefined, // ลบ nested object
                customer_name: order.customer_name || customerData?.name || 'ไม่ระบุ',
                customer_phone: order.customer_phone || customerData?.phone || '',
                customer_email: order.customer_email || customerData?.email || '',
                customer_company: customerData?.company_name || '',
                customer_address: customerData?.address || '',
              };
            });

            console.log('✅ Successfully used direct table query:', transformedData.length);
            return transformedData;
          }

          console.warn('⚠️ Direct table query failed:', directError?.message);
          throw directError;

        } catch (directError) {
          // 3. ถ้าทุกอย่างล้มเหลว ตรวจสอบสาเหตุและให้ข้อมูลที่เป็นประโยชน์
          console.error('❌ All queries failed. Analyzing error types...');

          const errorMessage = directError?.message || viewError?.message || 'Unknown error';
          const is404Error = errorMessage.includes('404') || errorMessage.includes('does not exist') || errorMessage.includes('relation');
          const is400Error = errorMessage.includes('400') || errorMessage.includes('relationship') || errorMessage.includes('foreign key');
          const isConnectionError = errorMessage.includes('fetch') || errorMessage.includes('network');

          if (is404Error) {
            console.warn('🔧 Tables not found. Please apply migration: apply_sales_migration.sql');
            // แสดง toast เฉพาะครั้งแรก
            if (!localStorage.getItem('sales_migration_warning_shown')) {
              toast.error('ระบบขายยังไม่ถูกติดตั้ง', {
                description: 'กรุณารัน apply_sales_migration.sql ใน Supabase Dashboard',
                duration: 10000,
                action: {
                  label: 'คัดลอก SQL',
                  onClick: () => {
                    navigator.clipboard?.writeText('-- กรุณาเปิดไฟล์ apply_sales_migration.sql และรันใน Supabase Dashboard → SQL Editor');
                    toast.success('คัดลอกคำแนะนำแล้ว');
                  }
                }
              });
              localStorage.setItem('sales_migration_warning_shown', 'true');
            }
          } else if (is400Error) {
            console.warn('🔧 Foreign key relationships issue.');
            toast.warning('ฐานข้อมูลไม่สมบูรณ์', {
              description: 'ความสัมพันธ์ระหว่างตารางยังไม่ถูกสร้าง',
              duration: 5000
            });
          } else if (isConnectionError) {
            toast.error('เกิดปัญหาการเชื่อมต่อ', {
              description: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้',
              duration: 5000
            });
          } else {
            console.error('🔥 Unexpected error:', directError, viewError);
            toast.error('เกิดข้อผิดพลาดไม่คาดคิด', {
              description: errorMessage.substring(0, 100),
              duration: 5000
            });
          }

          // Return empty array
          return [] as SalesOrder[];
        }
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook สำหรับดึงข้อมูลใบสั่งซื้อรายเดียว
export const useSalesOrder = (id: string) => {
  return useQuery({
    queryKey: ['sales-order', id],
    queryFn: async (): Promise<SalesOrder | null> => {
      if (!id) return null;

      const { data, error } = await localDb
        .from('sales_orders_with_customer')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(`Error fetching sales order: ${error.message}`);
      }

      return data;
    },
    enabled: !!id,
  });
};

// Hook สำหรับดึงรายการสินค้าในใบสั่งซื้อ
export const useSalesOrderItems = (orderId: string) => {
  return useQuery({
    queryKey: ['sales-order-items', orderId],
    queryFn: async (): Promise<SalesOrderItem[]> => {
      if (!orderId) return [];

      const { data, error } = await localDb
        .from('sales_order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Error fetching order items: ${error.message}`);
      }

      return data || [];
    },
    enabled: !!orderId,
  });
};

// Hook สำหรับสร้างใบสั่งซื้อใหม่
export const useCreateSalesOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: CreateSalesOrderData): Promise<SalesOrder> => {
      console.log('🛒 Creating sales order with data:', orderData);

      try {
        // ใช้ auth helper สำหรับจัดการ authentication
        ensureDemoUser(); // สร้าง demo user ถ้าไม่มี
        const userId = await getCurrentUserId();

        console.log('🔐 Using user ID for order creation:', userId);

        // สร้างใบสั่งซื้อหลัก
        const { data: order, error: orderError } = await localDb
          .from('sales_orders')
          .insert({
            customer_id: orderData.customer_id,
            subtotal: orderData.subtotal,
            discount_amount: orderData.discount_amount || 0,
            tax_amount: orderData.tax_amount || 0,
            total_amount: orderData.total_amount,
            notes: orderData.notes,
            delivery_address: orderData.delivery_address,
            delivery_instructions: orderData.delivery_instructions,
            required_date: orderData.required_date,
            created_by: userId,
            updated_by: userId,
            sales_person_id: userId,
          })
          .select()
          .single();

        if (orderError) {
          console.error('❌ Error creating sales order:', orderError);

          // ถ้าตารางไม่มี ให้ fallback เป็นการแสดงข้อความแทน
          if (orderError.message.includes('relation "sales_orders" does not exist')) {
            console.warn('⚠️ Sales orders table not found - please apply migration 20250929_create_sales_system.sql');
            throw new Error('ระบบขายยังไม่ถูกติดตั้ง กรุณา apply migration ก่อนใช้งาน');
          }

          throw new Error(`Error creating sales order: ${orderError.message}`);
        }

        console.log('✅ Created sales order:', order);

        // สร้างรายการสินค้า
        if (orderData.order_items.length > 0) {
          const { error: itemsError } = await localDb
            .from('sales_order_items')
            .insert(
              orderData.order_items.map(item => ({
                order_id: order.id,
                product_id: item.product_id,
                product_name: item.product_name,
                product_sku: item.product_sku,
                quantity_cartons: item.quantity_cartons,
                quantity_boxes: item.quantity_boxes,
                quantity_pieces: item.quantity_pieces,
                total_pieces: item.total_pieces,
                unit_price: item.unit_price,
                line_total: item.line_total,
                notes: item.notes,
              }))
            );

          if (itemsError) {
            console.error('❌ Error creating order items:', itemsError);
            throw new Error(`Error creating order items: ${itemsError.message}`);
          }

          console.log('✅ Created order items:', orderData.order_items.length);
        }

        return order;

      } catch (error) {
        console.error('❌ Failed to create sales order:', error);
        throw error;
      }
    },
    onSuccess: (newOrder) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });

      toast.success('สร้างใบสั่งซื้อเรียบร้อยแล้ว', {
        description: `เลขที่: ${newOrder.order_number}`,
      });
    },
    onError: (error) => {
      toast.error('เกิดข้อผิดพลาดในการสร้างใบสั่งซื้อ', {
        description: error.message,
      });
    },
  });
};

// Hook สำหรับอัปเดตใบสั่งซื้อ
export const useUpdateSalesOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateSalesOrderData & { id: string }): Promise<SalesOrder> => {
      const { data: { user } } = await localDb.auth.getUser();

      const { data, error } = await localDb
        .from('sales_orders')
        .update({
          ...updateData,
          updated_by: user?.id,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Error updating sales order: ${error.message}`);
      }

      return data;
    },
    onSuccess: (updatedOrder) => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      queryClient.invalidateQueries({ queryKey: ['sales-order', updatedOrder.id] });

      toast.success('อัปเดตใบสั่งซื้อเรียบร้อยแล้ว', {
        description: `เลขที่: ${updatedOrder.order_number}`,
      });
    },
    onError: (error) => {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตใบสั่งซื้อ', {
        description: error.message,
      });
    },
  });
};

// Hook สำหรับยกเลิกใบสั่งซื้อ
export const useCancelSalesOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data: { user } } = await localDb.auth.getUser();

      const { error } = await localDb
        .from('sales_orders')
        .update({
          status: 'cancelled',
          updated_by: user?.id,
        })
        .eq('id', id);

      if (error) {
        throw new Error(`Error cancelling sales order: ${error.message}`);
      }
    },
    onSuccess: () => {
      // อัปเดต cache
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });

      toast.success('ยกเลิกใบสั่งซื้อเรียบร้อยแล้ว');
    },
    onError: (error) => {
      toast.error('เกิดข้อผิดพลาดในการยกเลิกใบสั่งซื้อ', {
        description: error.message,
      });
    },
  });
};

// Hook สำหรับค้นหาใบสั่งซื้อ (real-time search)
export const useSalesOrderSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: orders, isLoading } = useSalesOrders({
    search: debouncedSearchTerm,
    limit: 20,
  });

  return {
    searchTerm,
    setSearchTerm,
    orders: orders || [],
    isLoading,
  };
};

// Hook สำหรับสถิติใบสั่งซื้อ
export const useSalesOrderStats = () => {
  return useQuery({
    queryKey: ['sales-order-stats'],
    queryFn: async () => {
      const [
        { count: totalOrders },
        { count: draftOrders },
        { count: confirmedOrders },
        { count: deliveredOrders },
        { count: cancelledOrders },
        { data: revenueData }
      ] = await Promise.all([
        localDb.from('sales_orders').select('*', { count: 'exact', head: true }),
        localDb.from('sales_orders').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
        localDb.from('sales_orders').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
        localDb.from('sales_orders').select('*', { count: 'exact', head: true }).eq('status', 'delivered'),
        localDb.from('sales_orders').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase
          .from('sales_orders')
          .select('total_amount')
          .eq('status', 'delivered')
          .gte('order_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
      ]);

      const monthlyRevenue = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      return {
        total: totalOrders || 0,
        draft: draftOrders || 0,
        confirmed: confirmedOrders || 0,
        delivered: deliveredOrders || 0,
        cancelled: cancelledOrders || 0,
        monthlyRevenue,
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Utility functions
export const formatOrderStatus = (status: SalesOrder['status']): string => {
  const statusMap = {
    draft: 'ร่าง',
    confirmed: 'ยืนยันแล้ว',
    picking: 'กำลังจัดเก็บ',
    packed: 'แพ็คเสร็จ',
    shipping: 'กำลังจัดส่ง',
    delivered: 'จัดส่งเสร็จ',
    cancelled: 'ยกเลิก',
  };
  return statusMap[status] || status;
};

export const formatPaymentStatus = (status: SalesOrder['payment_status']): string => {
  const statusMap = {
    pending: 'รอชำระ',
    partial: 'ชำระบางส่วน',
    paid: 'ชำระเต็มจำนวน',
    overdue: 'เกินกำหนด',
  };
  return statusMap[status] || status;
};

export const getOrderStatusColor = (status: SalesOrder['status']): string => {
  const colorMap = {
    draft: 'bg-gray-100 text-gray-800',
    confirmed: 'bg-blue-100 text-blue-800',
    picking: 'bg-yellow-100 text-yellow-800',
    packed: 'bg-purple-100 text-purple-800',
    shipping: 'bg-orange-100 text-orange-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
};

export const getPaymentStatusColor = (status: SalesOrder['payment_status']): string => {
  const colorMap = {
    pending: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-orange-100 text-orange-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
  };
  return colorMap[status] || 'bg-gray-100 text-gray-800';
};

export default {
  useSalesOrders,
  useSalesOrder,
  useSalesOrderItems,
  useCreateSalesOrder,
  useUpdateSalesOrder,
  useCancelSalesOrder,
  useSalesOrderSearch,
  useSalesOrderStats,
  formatOrderStatus,
  formatPaymentStatus,
  getOrderStatusColor,
  getPaymentStatusColor,
};