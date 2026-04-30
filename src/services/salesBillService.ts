// Sales Bill Service - Phase 1: Sales Team Operations
import { localDb } from '@/integrations/local/client';
import {
  SalesBill,
  SalesBillInsert,
  SalesBillUpdate,
  SalesBillItem,
  SalesBillItemInsert,
  SalesBillItemUpdate,
  SalesBillWithCustomer,
  SalesBillWithItems,
  SalesBillFormData,
  SalesBillFilters,
  SalesBillStatus
} from '@/integrations/local/types-3phase';
import { toast } from '@/components/ui/sonner';

export class SalesBillService {

  // =====================================================
  // Sales Bills CRUD Operations
  // =====================================================

  /**
   * Create a new sales bill with items
   */
  static async createSalesBill(data: SalesBillFormData): Promise<SalesBill> {
    console.log('📝 Creating sales bill:', data);

    try {
      // Start transaction
      const { data: salesBill, error: billError } = await localDb
        .from('sales_bills')
        .insert({
          customer_id: data.customer_id,
          bill_type: data.bill_type,
          priority: data.priority,
          customer_po_number: data.customer_po_number,
          payment_terms: data.payment_terms,
          due_date: data.due_date,

          // Shipping address
          shipping_address_line1: data.shipping_address_line1,
          shipping_address_line2: data.shipping_address_line2,
          shipping_district: data.shipping_district,
          shipping_province: data.shipping_province,
          shipping_postal_code: data.shipping_postal_code,
          shipping_contact_person: data.shipping_contact_person,
          shipping_phone: data.shipping_phone,

          // Notes
          sales_notes: data.sales_notes,
          internal_notes: data.internal_notes,

          // Auto-calculated totals (will be updated after items are added)
          subtotal: 0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 0,

          status: 'draft'
        })
        .select()
        .single();

      if (billError) {
        console.error('❌ Error creating sales bill:', billError);
        throw billError;
      }

      console.log('✅ Sales bill created:', salesBill);

      // Add items if provided
      if (data.items && data.items.length > 0) {
        await this.addItemsToSalesBill(salesBill.id, data.items);

        // Recalculate totals after adding items
        await this.recalculateBillTotals(salesBill.id);
      }

      toast.success('สร้างใบขายสำเร็จ', {
        description: `สร้างใบขาย ${salesBill.bill_number} พร้อม ${data.items?.length || 0} รายการ`
      });

      return salesBill;
    } catch (error) {
      console.error('❌ Sales bill creation failed:', error);
      toast.error('ไม่สามารถสร้างใบขายได้', {
        description: 'กรุณาลองใหม่อีกครั้ง'
      });
      throw error;
    }
  }

  /**
   * Get sales bills with optional filters
   */
  static async getSalesBills(filters?: SalesBillFilters): Promise<SalesBillWithCustomer[]> {
    console.log('🔍 Fetching sales bills with filters:', filters);

    let query = localDb
      .from('sales_bills')
      .select(`
        *,
        customer:customers(
          id,
          customer_name,
          customer_code,
          customer_type,
          phone,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    if (filters?.date_from) {
      query = query.gte('bill_date', filters.date_from);
    }

    if (filters?.date_to) {
      query = query.lte('bill_date', filters.date_to);
    }

    if (filters?.search_term) {
      const searchTerm = filters.search_term.toLowerCase();
      query = query.or(`
        bill_number.ilike.%${searchTerm}%,
        customer_po_number.ilike.%${searchTerm}%,
        sales_notes.ilike.%${searchTerm}%
      `);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching sales bills:', error);
      throw error;
    }

    console.log(`✅ Found ${data.length} sales bills`);
    return data;
  }

  /**
   * Get single sales bill with full details
   */
  static async getSalesBillWithItems(billId: string): Promise<SalesBillWithItems | null> {
    console.log('🔍 Fetching sales bill with items:', billId);

    const { data, error } = await localDb
      .from('sales_bills')
      .select(`
        *,
        customer:customers(
          id,
          customer_name,
          customer_code,
          customer_type,
          phone,
          email
        ),
        sales_bill_items(*)
      `)
      .eq('id', billId)
      .single();

    if (error) {
      console.error('❌ Error fetching sales bill with items:', error);
      throw error;
    }

    console.log('✅ Sales bill with items fetched');
    return data;
  }

  /**
   * Update sales bill
   */
  static async updateSalesBill(billId: string, updates: SalesBillUpdate): Promise<SalesBill> {
    console.log('📝 Updating sales bill:', billId, updates);

    const { data, error } = await localDb
      .from('sales_bills')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', billId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating sales bill:', error);
      throw error;
    }

    console.log('✅ Sales bill updated');
    toast.success('อัปเดตใบขายสำเร็จ');
    return data;
  }

  /**
   * Update sales bill status
   */
  static async updateSalesBillStatus(billId: string, status: SalesBillStatus): Promise<void> {
    console.log('📝 Updating sales bill status:', billId, status);

    const { error } = await localDb
      .from('sales_bills')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', billId);

    if (error) {
      console.error('❌ Error updating sales bill status:', error);
      throw error;
    }

    console.log('✅ Sales bill status updated');
  }

  /**
   * Send sales bill to warehouse
   */
  static async sendToWarehouse(billId: string): Promise<void> {
    console.log('📦 Sending sales bill to warehouse:', billId);

    // Validate bill can be sent
    const bill = await this.getSalesBillWithItems(billId);
    if (!bill) {
      throw new Error('Sales bill not found');
    }

    if (bill.status !== 'confirmed') {
      throw new Error('Only confirmed bills can be sent to warehouse');
    }

    if (!bill.sales_bill_items || bill.sales_bill_items.length === 0) {
      throw new Error('Cannot send bill with no items to warehouse');
    }

    await this.updateSalesBillStatus(billId, 'sent_to_warehouse');

    toast.success('ส่งใบขายให้คลังแล้ว', {
      description: `ใบขาย ${bill.bill_number} ได้ส่งไปยังทีมคลังเรียบร้อย`
    });
  }

  // =====================================================
  // Sales Bill Items Operations
  // =====================================================

  /**
   * Add items to sales bill
   */
  static async addItemsToSalesBill(billId: string, items: SalesBillItemInsert[]): Promise<SalesBillItem[]> {
    console.log('📝 Adding items to sales bill:', billId, items.length);

    const itemsToInsert = items.map((item, index) => ({
      ...item,
      sales_bill_id: billId,
      line_number: index + 1
    }));

    const { data, error } = await localDb
      .from('sales_bill_items')
      .insert(itemsToInsert)
      .select();

    if (error) {
      console.error('❌ Error adding items to sales bill:', error);
      throw error;
    }

    console.log(`✅ Added ${data.length} items to sales bill`);
    return data;
  }

  /**
   * Update sales bill item
   */
  static async updateSalesBillItem(itemId: string, updates: SalesBillItemUpdate): Promise<SalesBillItem> {
    console.log('📝 Updating sales bill item:', itemId, updates);

    const { data, error } = await localDb
      .from('sales_bill_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating sales bill item:', error);
      throw error;
    }

    console.log('✅ Sales bill item updated');

    // Recalculate bill totals
    await this.recalculateBillTotals(data.sales_bill_id);

    return data;
  }

  /**
   * Remove item from sales bill
   */
  static async removeSalesBillItem(itemId: string): Promise<void> {
    console.log('🗑️ Removing sales bill item:', itemId);

    // Get item to get bill ID for recalculation
    const { data: item } = await localDb
      .from('sales_bill_items')
      .select('sales_bill_id')
      .eq('id', itemId)
      .single();

    const { error } = await localDb
      .from('sales_bill_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('❌ Error removing sales bill item:', error);
      throw error;
    }

    console.log('✅ Sales bill item removed');

    // Recalculate bill totals if we have the bill ID
    if (item?.sales_bill_id) {
      await this.recalculateBillTotals(item.sales_bill_id);
    }
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Recalculate bill totals based on items
   */
  static async recalculateBillTotals(billId: string): Promise<void> {
    console.log('🧮 Recalculating bill totals:', billId);

    const { data: items, error } = await localDb
      .from('sales_bill_items')
      .select('line_total, discount_amount')
      .eq('sales_bill_id', billId);

    if (error) {
      console.error('❌ Error fetching items for total calculation:', error);
      return;
    }

    const subtotal = items.reduce((sum, item) => sum + (item.line_total || 0), 0);
    const totalDiscount = items.reduce((sum, item) => sum + (item.discount_amount || 0), 0);
    const taxAmount = subtotal * 0.07; // 7% VAT (adjust as needed)
    const totalAmount = subtotal - totalDiscount + taxAmount;

    const { error: updateError } = await localDb
      .from('sales_bills')
      .update({
        subtotal,
        discount_amount: totalDiscount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', billId);

    if (updateError) {
      console.error('❌ Error updating bill totals:', updateError);
    } else {
      console.log('✅ Bill totals recalculated');
    }
  }

  /**
   * Get bills ready for warehouse assignment
   */
  static async getBillsForWarehouse(): Promise<SalesBillWithCustomer[]> {
    console.log('📦 Fetching bills ready for warehouse');

    return this.getSalesBills({
      status: 'sent_to_warehouse'
    });
  }

  /**
   * Get sales statistics
   */
  static async getSalesStatistics(dateFrom?: string, dateTo?: string) {
    console.log('📊 Fetching sales statistics');

    let query = localDb
      .from('sales_bills')
      .select('status, total_amount, created_at');

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching sales statistics:', error);
      throw error;
    }

    // Calculate statistics
    const totalBills = data.length;
    const totalAmount = data.reduce((sum, bill) => sum + (bill.total_amount || 0), 0);
    const billsByStatus = data.reduce((acc: Record<string, number>, bill) => {
      acc[bill.status] = (acc[bill.status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalBills,
      totalAmount,
      billsByStatus,
      averageBillValue: totalBills > 0 ? totalAmount / totalBills : 0
    };
  }

  /**
   * Validate sales bill data
   */
  static validateSalesBillData(data: SalesBillFormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.customer_id) {
      errors.push('กรุณาเลือกลูกค้า');
    }

    if (!data.items || data.items.length === 0) {
      errors.push('กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ');
    }

    if (data.items) {
      data.items.forEach((item, index) => {
        if (!item.product_name) {
          errors.push(`รายการที่ ${index + 1}: กรุณาระบุชื่อสินค้า`);
        }

        if (item.unit_price <= 0) {
          errors.push(`รายการที่ ${index + 1}: ราคาต้องมากกว่า 0`);
        }

        const totalQuantity = (item.quantity_level1 || 0) +
                             (item.quantity_level2 || 0) +
                             (item.quantity_level3 || 0);

        if (totalQuantity <= 0) {
          errors.push(`รายการที่ ${index + 1}: กรุณาระบุจำนวนสินค้า`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}