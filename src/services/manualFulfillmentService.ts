/**
 * Manual Fulfillment Service
 * จัดการการสร้างงานจัดสินค้าแบบ Manual (ไม่มี PO จาก API)
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  FulfillmentTask,
  FulfillmentItem,
  FulfillmentItemLocation
} from '@/services/purchaseOrderService';

// ==================== Types ====================

export interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  phone?: string;
  address?: string;
}

export interface LocationStock {
  inventory_item_id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  location: string;
  available_stock: number;
  unit: string;
}

export interface ManualFulfillmentItemInput {
  product_name: string;
  product_code?: string;
  requested_quantity: number;
  unit_price: number;
  locations: {
    inventory_item_id: string;
    location: string;
    quantity: number;
    available_stock: number;
  }[];
}

export interface ManualFulfillmentInput {
  po_number: string;
  customer_code: string;
  customer_id?: string;
  warehouse_name: string;
  delivery_date: string;
  items: ManualFulfillmentItemInput[];
  notes?: string;
  created_by: string;
}

// ==================== Service Class ====================

export class ManualFulfillmentService {

  /**
   * ตรวจสอบว่า PO Number ซ้ำหรือไม่
   */
  static async validatePONumber(poNumber: string): Promise<{
    isValid: boolean;
    message?: string;
    existingTask?: any;
  }> {
    try {
      const { data: existingTasks, error } = await supabase
        .from('fulfillment_tasks')
        .select('id, po_number, status, source_type')
        .eq('po_number', poNumber)
        .neq('status', 'cancelled');

      if (error) throw error;

      if (existingTasks && existingTasks.length > 0) {
        const task = existingTasks[0];
        return {
          isValid: false,
          message: `PO Number "${poNumber}" มีอยู่แล้ว (สถานะ: ${task.status})`,
          existingTask: task
        };
      }

      return { isValid: true };

    } catch (error) {
      console.error('Error validating PO Number:', error);
      return {
        isValid: false,
        message: 'ไม่สามารถตรวจสอบ PO Number ได้'
      };
    }
  }

  /**
   * ดึงรายการลูกค้า
   */
  static async fetchCustomers(searchTerm: string = ''): Promise<Customer[]> {
    try {
      let query = supabase
        .from('customer_orders')
        .select('id, customer_code, customer_name, phone, address')
        .order('customer_name');

      if (searchTerm) {
        query = query.or(
          `customer_code.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // Remove duplicates by customer_code
      const uniqueCustomers = Array.from(
        new Map(
          (data || []).map(c => [c.customer_code, c])
        ).values()
      );

      return uniqueCustomers as Customer[];

    } catch (error) {
      console.error('Error fetching customers:', error);
      return [];
    }
  }

  /**
   * ค้นหาสินค้าจากหลาย Location
   */
  static async findProductLocations(
    productName: string,
    productCode?: string
  ): Promise<LocationStock[]> {
    try {
      let query = supabase
        .from('inventory_items')
        .select(`
          id,
          product_name,
          location,
          quantity,
          unit,
          products!inner (
            id,
            name,
            sku_code
          )
        `)
        .gt('quantity', 0)
        .order('location', { ascending: true, nullsFirst: false });

      // ค้นหาตามชื่อหรือรหัสสินค้า
      if (productCode) {
        query = query.or(
          `product_name.ilike.%${productName}%,products.sku_code.eq.${productCode}`
        );
      } else {
        query = query.ilike('product_name', `%${productName}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(item => ({
        inventory_item_id: item.id,
        product_id: item.products?.id || '',
        product_name: item.product_name,
        product_code: item.products?.sku_code || item.product_name,
        location: item.location || 'ไม่ระบุ',
        available_stock: item.quantity,
        unit: item.unit || 'ชิ้น'
      }));

    } catch (error) {
      console.error('Error finding product locations:', error);
      return [];
    }
  }

  /**
   * สร้างงานจัดสินค้าแบบ Manual
   */
  static async createManualFulfillment(
    input: ManualFulfillmentInput
  ): Promise<{ success: boolean; task?: FulfillmentTask; error?: string }> {
    try {
      // 1. ตรวจสอบ PO Number
      const validation = await this.validatePONumber(input.po_number);
      if (!validation.isValid) {
        return { success: false, error: validation.message };
      }

      // 2. คำนวณยอดรวม
      const total_amount = input.items.reduce(
        (sum, item) => sum + (item.requested_quantity * item.unit_price),
        0
      );

      // 3. สร้าง fulfillment_task
      const { data: savedTask, error: taskError } = await supabase
        .from('fulfillment_tasks')
        .insert({
          po_number: input.po_number,
          po_date: new Date().toISOString().split('T')[0],
          delivery_date: input.delivery_date,
          customer_code: input.customer_code,
          customer_id: input.customer_id,
          warehouse_name: input.warehouse_name,
          total_amount,
          status: 'pending',
          source_type: 'manual',
          notes: input.notes || `สร้างแบบ Manual โดย ${input.created_by}`,
          created_by: input.created_by,
          user_id: input.created_by
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // 4. สร้าง fulfillment_items และ fulfillment_item_locations
      for (const item of input.items) {
        // สร้าง fulfillment_item
        const { data: savedItem, error: itemError } = await supabase
          .from('fulfillment_items')
          .insert({
            fulfillment_task_id: savedTask.id,
            product_name: item.product_name,
            product_code: item.product_code || item.product_name,
            requested_quantity: item.requested_quantity,
            fulfilled_quantity: 0,
            unit_price: item.unit_price,
            total_amount: item.requested_quantity * item.unit_price,
            status: 'pending',
            // ถ้ามี location เดียว ให้เก็บไว้
            location: item.locations.length === 1 ? item.locations[0].location : null,
            inventory_item_id: item.locations.length === 1 ? item.locations[0].inventory_item_id : null,
            available_stock: item.locations.reduce((sum, loc) => sum + loc.available_stock, 0)
          })
          .select()
          .single();

        if (itemError) throw itemError;

        // สร้าง fulfillment_item_locations (ถ้ามีหลาย location)
        if (item.locations.length > 1) {
          const locationsData = item.locations.map(loc => ({
            fulfillment_item_id: savedItem.id,
            inventory_item_id: loc.inventory_item_id,
            location: loc.location,
            quantity: loc.quantity,
            available_stock: loc.available_stock,
            status: 'pending'
          }));

          const { error: locError } = await supabase
            .from('fulfillment_item_locations')
            .insert(locationsData);

          if (locError) throw locError;
        }
      }

      // 5. ดึงข้อมูล Task พร้อม Items
      const { data: fullTask, error: fetchError } = await supabase
        .from('fulfillment_tasks')
        .select(`
          *,
          fulfillment_items (
            id,
            fulfillment_task_id,
            product_name,
            product_code,
            requested_quantity,
            fulfilled_quantity,
            unit_price,
            total_amount,
            status,
            location,
            inventory_item_id,
            available_stock
          )
        `)
        .eq('id', savedTask.id)
        .single();

      if (fetchError) throw fetchError;

      const fulfillmentTask: FulfillmentTask = {
        id: fullTask.id,
        po_number: fullTask.po_number,
        po_date: fullTask.po_date,
        delivery_date: fullTask.delivery_date,
        customer_code: fullTask.customer_code,
        warehouse_name: fullTask.warehouse_name,
        total_amount: fullTask.total_amount,
        status: fullTask.status,
        items: fullTask.fulfillment_items || [],
        created_at: fullTask.created_at,
        updated_at: fullTask.updated_at
      };

      return { success: true, task: fulfillmentTask };

    } catch (error) {
      console.error('Error creating manual fulfillment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการสร้างงาน'
      };
    }
  }

  /**
   * Format currency
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format date
   */
  static formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(date);
    } catch {
      return dateString;
    }
  }
}

export default ManualFulfillmentService;