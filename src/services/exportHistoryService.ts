import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfDay } from 'date-fns';

export interface ExportHistoryItem {
  id: string;
  export_date: string;
  export_time: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit: string;
  location: string;
  customer_name: string;
  customer_code: string;
  order_number: string;
  notes: string | null;
  status: string;
  created_by: string | null;
}

export type DateFilter = 'all' | 'today' | '7days' | '30days';

export class ExportHistoryService {
  /**
   * ดึงประวัติการส่งออกทั้งหมด
   */
  static async getExportHistory(
    dateFilter: DateFilter = 'all',
    searchTerm: string = ''
  ): Promise<ExportHistoryItem[]> {
    try {
      console.log(`📊 Fetching export history (filter: ${dateFilter}, search: "${searchTerm}")`);
      const startTime = performance.now();

      // คำนวณช่วงวันที่
      let startDate: Date | undefined;
      const now = new Date();

      switch (dateFilter) {
        case 'today':
          startDate = startOfDay(now);
          break;
        case '7days':
          startDate = subDays(now, 7);
          break;
        case '30days':
          startDate = subDays(now, 30);
          break;
        default:
          startDate = undefined;
      }

      // ดึงข้อมูลจากตาราง customer_exports (ตารางที่เก็บข้อมูลการส่งออกจริง)
      let query = supabase
        .from('customer_exports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      // กรองตามวันที่
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching export history:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.log('No export history found');
        return [];
      }

      console.log(`Found ${data.length} export records`);

      // แปลงข้อมูลเป็น ExportHistoryItem
      const exportItems: ExportHistoryItem[] = data.map((item: any) => {
        const createdAt = new Date(item.created_at);

        return {
          id: item.id,
          export_date: item.created_at,
          export_time: format(createdAt, 'HH:mm'),
          product_name: item.product_name || 'ไม่ระบุ',
          product_code: item.product_code || item.sku || '',
          quantity: item.quantity_exported || 0,
          unit: item.unit_level3_name || 'ชิ้น',
          location: item.from_location || '-',
          customer_name: item.customer_name || 'ไม่ระบุลูกค้า',
          customer_code: item.customer_code || '-',
          order_number: item.order_number || '-',
          notes: item.notes,
          status: 'exported',
          created_by: item.user_id,
        };
      });

      // กรองตามคำค้นหา
      let filteredItems = exportItems;
      if (searchTerm.trim() !== '') {
        const searchLower = searchTerm.toLowerCase();
        filteredItems = exportItems.filter(
          (item) =>
            item.product_name.toLowerCase().includes(searchLower) ||
            item.product_code.toLowerCase().includes(searchLower) ||
            item.customer_name.toLowerCase().includes(searchLower) ||
            item.location.toLowerCase().includes(searchLower)
        );
      }

      const endTime = performance.now();
      console.log(
        `✅ Loaded ${filteredItems.length} export records in ${(endTime - startTime).toFixed(2)}ms`
      );

      return filteredItems;
    } catch (error) {
      console.error('Error in getExportHistory:', error);
      throw error;
    }
  }

  /**
   * สรุปสถิติการส่งออก
   */
  static getExportSummary(items: ExportHistoryItem[]) {
    const totalItems = items.length;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueProducts = new Set(items.map((item) => item.product_code)).size;
    const uniqueCustomers = new Set(items.map((item) => item.customer_code)).size;

    return {
      totalItems,
      totalQuantity,
      uniqueProducts,
      uniqueCustomers,
    };
  }
}
