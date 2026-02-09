import { localDb } from '@/integrations/local/client';

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
   * ดึงข้อมูลสรุปการส่งออกของลูกค้าทั้งหมดจากตาราง customer_exports
   */
  static async getCustomerExportStats(
    startDate?: string,
    endDate?: string
  ): Promise<CustomerExportStats[]> {
    try {
      console.log('📊 Fetching customer export stats from customer_exports...');
      const startTime = performance.now();

      // Step 1: ดึงข้อมูล customers ทั้งหมด
      const { data: customers, error: customersError } = await localDb
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

      // Step 2: ดึงข้อมูลการส่งออกจาก customer_exports
      let exportsQuery = localDb
        .from('customer_exports')
        .select('*')
        .order('created_at', { ascending: false });

      // กรองตามวันที่
      if (startDate) {
        exportsQuery = exportsQuery.gte('created_at', startDate);
      }
      if (endDate) {
        exportsQuery = exportsQuery.lte('created_at', endDate);
      }

      const { data: exports, error: exportsError } = await exportsQuery;

      if (exportsError) {
        console.error('Error fetching customer exports:', exportsError);
        throw exportsError;
      }

      console.log(`Found ${exports?.length || 0} export records`);

      if (!exports || exports.length === 0) {
        // ถ้าไม่มีการส่งออก ให้คืนข้อมูลว่าง
        return customers.map((c: any) => ({
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

      // Step 3: จัดกลุ่มตาม customer
      const customerMap = new Map<string, CustomerExportStats>();

      // Initialize all customers
      customers.forEach((customer: any) => {
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

      // Step 4: จัดกลุ่มการส่งออกตามลูกค้าและวันที่
      // สร้าง unique key สำหรับแยก "order" (วันที่ + ลูกค้า + PO)
      const orderGroupMap = new Map<string, {
        customer_id: string;
        export_date: string;
        po_reference: string | null;
        exports: any[];
      }>();

      exports.forEach((exp: any) => {
        const exportDate = exp.created_at?.split('T')[0] || '';
        const groupKey = `${exp.customer_id}_${exportDate}_${exp.po_reference || 'NO_PO'}`;

        if (!orderGroupMap.has(groupKey)) {
          orderGroupMap.set(groupKey, {
            customer_id: exp.customer_id || '',
            export_date: exportDate,
            po_reference: exp.po_reference,
            exports: []
          });
        }

        orderGroupMap.get(groupKey)!.exports.push(exp);
      });

      // Step 5: รวมข้อมูลสำหรับแต่ละลูกค้า
      orderGroupMap.forEach((orderGroup) => {
        const stats = customerMap.get(orderGroup.customer_id);
        if (!stats) {
          // ถ้าไม่มีลูกค้าในระบบ ให้สร้างใหม่
          const firstExport = orderGroup.exports[0];
          customerMap.set(orderGroup.customer_id, {
            customer_id: orderGroup.customer_id,
            customer_name: firstExport.customer_name || 'Unknown',
            customer_code: firstExport.customer_code || 'N/A',
            total_orders: 0,
            total_amount: 0,
            total_items: 0,
            last_order_date: null,
            orders: [],
          });
        }

        const customerStats = customerMap.get(orderGroup.customer_id)!;

        // คำนวณยอดรวมของ order นี้
        const orderTotal = orderGroup.exports.reduce((sum, exp) => sum + (exp.total_value || 0), 0);
        const itemsCount = orderGroup.exports.length;

        customerStats.total_orders += 1;
        customerStats.total_amount += orderTotal;
        customerStats.total_items += itemsCount;

        // อัปเดตวันที่ล่าสุด
        if (!customerStats.last_order_date || orderGroup.export_date > customerStats.last_order_date) {
          customerStats.last_order_date = orderGroup.export_date;
        }

        // สร้าง "order" จากการส่งออกแต่ละกลุ่ม
        const firstExport = orderGroup.exports[0];
        customerStats.orders.push({
          id: firstExport.id,
          order_number: orderGroup.po_reference || `EXP-${orderGroup.export_date}`,
          order_date: orderGroup.export_date,
          status: 'delivered', // การส่งออกถือว่าส่งแล้ว
          total_amount: orderTotal,
          items_count: itemsCount,
        });
      });

      const result = Array.from(customerMap.values())
        .filter(c => c.total_orders > 0) // แสดงเฉพาะลูกค้าที่มีการส่งออก
        .sort((a, b) => b.total_amount - a.total_amount);

      const endTime = performance.now();
      console.log(`✅ Processed ${result.length} customers with exports in ${(endTime - startTime).toFixed(2)}ms`);

      return result;
    } catch (error) {
      console.error('Error in getCustomerExportStats:', error);
      throw error;
    }
  }

  /**
   * ดึงข้อมูลรายละเอียดการส่งออกของลูกค้าเฉพาะราย (จาก customer_exports)
   */
  static async getCustomerExportDetails(customerId: string) {
    try {
      const { data: customer, error: customerError } = await localDb
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) throw customerError;

      // ดึงข้อมูลการส่งออกจาก customer_exports แทน customer_orders
      const { data: exports, error: exportsError } = await (localDb as any)
        .from('customer_exports')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (exportsError) throw exportsError;

      // จัดกลุ่มการส่งออกตามวันที่และ PO
      const orderGroups = new Map<string, any[]>();

      exports?.forEach((exp: any) => {
        const exportDate = exp.created_at?.split('T')[0] || '';
        const groupKey = `${exportDate}_${exp.po_reference || 'NO_PO'}`;

        if (!orderGroups.has(groupKey)) {
          orderGroups.set(groupKey, []);
        }
        orderGroups.get(groupKey)!.push(exp);
      });

      // แปลงเป็นรูปแบบ orders
      const orders = Array.from(orderGroups.entries()).map(([key, items]) => {
        const firstItem = items[0];
        const totalValue = items.reduce((sum, item) => sum + (item.total_value || 0), 0);

        return {
          id: firstItem.id,
          order_number: firstItem.po_reference || `EXP-${key.split('_')[0]}`,
          order_date: firstItem.created_at?.split('T')[0],
          status: 'delivered',
          total_amount: totalValue,
          final_amount: totalValue,
          created_at: firstItem.created_at,
          order_items: items.map(item => ({
            id: item.id,
            product_name: item.product_name,
            product_code: item.product_code,
            quantity: item.quantity_exported,
            unit_price: item.unit_price,
            total: item.total_value,
            products: {
              product_name: item.product_name,
              sku_code: item.product_code
            }
          }))
        };
      });

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
