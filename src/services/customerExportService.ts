import { supabase } from '@/integrations/supabase/client';

export interface CustomerExportStats {
  customer_id: string;
  customer_name: string;
  customer_code: string;
  total_orders: number;
  total_amount: number;
  total_items: number;
  last_order_date: string | null;
  orders: Array<{
    id: string;
    order_number: string;
    order_date: string;
    status: string;
    total_amount: number;
    items_count: number;
  }>;
}

export class CustomerExportService {
  /**
   * ดึงข้อมูลสรุปการส่งออกของลูกค้าทั้งหมด (Optimized version)
   */
  static async getCustomerExportStats(
    startDate?: string,
    endDate?: string
  ): Promise<CustomerExportStats[]> {
    try {
      console.log('📊 Fetching customer export stats...');
      const startTime = performance.now();

      // Step 1: ดึงข้อมูล customers ทั้งหมด
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, customer_name, customer_code')
        .order('customer_name');

      if (customersError) {
        console.error('Error fetching customers:', customersError);
        throw customersError;
      }

      if (!customers || customers.length === 0) {
        console.log('No customers found');
        return [];
      }

      console.log(`Found ${customers.length} customers`);

      // Step 2: ดึงข้อมูล orders พร้อม order_items count
      let ordersQuery = supabase
        .from('customer_orders')
        .select(`
          id,
          customer_id,
          order_number,
          order_date,
          status,
          total_amount,
          final_amount,
          created_at
        `)
        .order('order_date', { ascending: false });

      // กรองตามวันที่
      if (startDate) {
        ordersQuery = ordersQuery.gte('order_date', startDate);
      }
      if (endDate) {
        ordersQuery = ordersQuery.lte('order_date', endDate);
      }

      const { data: orders, error: ordersError } = await ordersQuery;

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      console.log(`Found ${orders?.length || 0} orders`);

      if (!orders || orders.length === 0) {
        // ถ้าไม่มี orders ให้คืนข้อมูลลูกค้าที่มี orders = 0
        return customers.map(c => ({
          customer_id: c.id,
          customer_name: c.customer_name,
          customer_code: c.customer_code,
          total_orders: 0,
          total_amount: 0,
          total_items: 0,
          last_order_date: null,
          orders: [],
        }));
      }

      // Step 3: ดึง order_items count
      const orderIds = orders.map(o => o.id);
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, id')
        .in('order_id', orderIds);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        // ถ้า error ให้ใช้ 0 แทน
      }

      // สร้าง Map เก็บจำนวน items ต่อ order
      const orderItemsCount = new Map<string, number>();
      if (orderItems) {
        orderItems.forEach(item => {
          const count = orderItemsCount.get(item.order_id) || 0;
          orderItemsCount.set(item.order_id, count + 1);
        });
      }

      // Step 4: จัดกลุ่มตาม customer
      const customerMap = new Map<string, CustomerExportStats>();

      // Initialize all customers
      customers.forEach(customer => {
        customerMap.set(customer.id, {
          customer_id: customer.id,
          customer_name: customer.customer_name,
          customer_code: customer.customer_code,
          total_orders: 0,
          total_amount: 0,
          total_items: 0,
          last_order_date: null,
          orders: [],
        });
      });

      // เพิ่มข้อมูล orders
      orders.forEach(order => {
        const stats = customerMap.get(order.customer_id);
        if (!stats) return; // skip orders ที่ไม่มีลูกค้า

        const itemsCount = orderItemsCount.get(order.id) || 0;
        const orderAmount = order.final_amount || order.total_amount || 0;
        const orderDate = order.order_date || order.created_at || '';

        stats.total_orders += 1;
        stats.total_amount += orderAmount;
        stats.total_items += itemsCount;

        // อัปเดตวันที่ล่าสุด
        if (!stats.last_order_date || orderDate > stats.last_order_date) {
          stats.last_order_date = orderDate;
        }

        stats.orders.push({
          id: order.id,
          order_number: order.order_number,
          order_date: orderDate,
          status: order.status || 'pending',
          total_amount: orderAmount,
          items_count: itemsCount,
        });
      });

      const result = Array.from(customerMap.values())
        .filter(c => c.total_orders > 0) // แสดงเฉพาะลูกค้าที่มี orders
        .sort((a, b) => b.total_amount - a.total_amount);

      const endTime = performance.now();
      console.log(`✅ Processed ${result.length} customers with orders in ${(endTime - startTime).toFixed(2)}ms`);

      return result;
    } catch (error) {
      console.error('Error in getCustomerExportStats:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลรายละเอียดการส่งออกของลูกค้าเฉพาะราย
   */
  static async getCustomerExportDetails(customerId: string) {
    try {
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;

      const { data: orders, error: ordersError } = await supabase
        .from('customer_orders')
        .select(`
          *,
          order_items (
            *,
            products (
              product_name,
              sku_code
            )
          )
        `)
        .eq('customer_id', customerId)
        .order('order_date', { ascending: false });

      if (ordersError) throw ordersError;

      return {
        customer,
        orders: orders || [],
      };
    } catch (error) {
      console.error('Error in getCustomerExportDetails:', error);
      throw error;
    }
  }
}
