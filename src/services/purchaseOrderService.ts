/**
 * Purchase Order Service - Integration with JLCBaseApi
 * Handles fetching PO data and converting to warehouse fulfillment tasks
 */

import { supabase } from '@/integrations/supabase/client';

// API Configuration
const JLC_API_BASE = 'http://jhserver.dyndns.info:82';

// TypeScript Interfaces
export interface PurchaseOrderHeader {
  PO_Number: string;
  ARCODE: string;
  PO_Date: string;
  Delivery_Date: string;
  Warehouse_ID: string;
  Warehouse_Name: string;
  M_TotalAmount: string;
  M_NetAmount: string;
  M_VatAmount: string;
}

export interface PurchaseOrderDetail {
  ID: number;
  PO_Number: string;
  ARCode: string;
  Keydata: string;
  Quantity: string;
  UnitPrice: string;
  TotalAmount: string;
  Detail_Disc_Amount: string;
}

export interface PurchaseOrderFull {
  header: PurchaseOrderHeader;
  details: PurchaseOrderDetail[];
}

export interface POListParams {
  po_number?: string;
  arcode?: string;
  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD
  top?: number;
}

// Fulfillment Status enum
export type FulfillmentStatus =
  | 'pending'      // รอการจัดเตรียม
  | 'in_progress'  // กำลังจัดสินค้า
  | 'packed'       // จัดครบแล้ว รอส่ง (ยังยกเลิกได้)
  | 'shipped'      // จัดส่งแล้ว
  | 'delivered'    // ลูกค้าได้รับแล้ว
  | 'cancelled';   // ยกเลิก

// Source type
export type FulfillmentSource = 'api' | 'manual';

// Item status
export type FulfillmentItemStatus = 'pending' | 'picked' | 'completed' | 'cancelled';

export interface FulfillmentTask {
  id: string;
  po_number: string;
  po_date: string;
  delivery_date: string;
  customer_code: string;
  warehouse_name: string;
  total_amount: number;
  status: FulfillmentStatus;
  source_type?: FulfillmentSource;
  created_by?: string;
  customer_id?: string;
  items: FulfillmentItem[];
  created_at: string;
  updated_at: string;
}

export interface FulfillmentItem {
  id: string;
  fulfillment_task_id: string;
  product_name: string;
  product_code?: string;
  requested_quantity: number;
  fulfilled_quantity: number;
  unit_price: number;
  total_amount: number;
  status: FulfillmentItemStatus;
  inventory_item_id?: string;
  available_stock?: number;
  location?: string;
  picked_at?: string;
  picked_by?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  locations?: FulfillmentItemLocation[];
}

export interface FulfillmentItemLocation {
  id: string;
  fulfillment_item_id: string;
  inventory_item_id: string;
  location: string;
  quantity: number;
  available_stock: number;
  status: FulfillmentItemStatus;
}

/**
 * Purchase Order Service Class
 */
export class PurchaseOrderService {

  /**
   * Fetch list of purchase orders
   */
  static async fetchPOList(params: POListParams = {}): Promise<PurchaseOrderHeader[]> {
    try {
      const queryParams = new URLSearchParams();

      if (params.po_number) queryParams.append('po_number', params.po_number);
      if (params.arcode) queryParams.append('arcode', params.arcode);
      if (params.date_from) queryParams.append('date_from', params.date_from);
      if (params.date_to) queryParams.append('date_to', params.date_to);
      if (params.top) queryParams.append('top', params.top.toString());

      const url = `${JLC_API_BASE}/jhdb/purchase-orders?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      const data: PurchaseOrderHeader[] = await response.json();
      return data;

    } catch (error) {
      console.error('Error fetching PO list:', error);
      throw new Error(`Failed to fetch purchase orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch detailed purchase order by PO number
   */
  static async fetchPODetails(po_number: string): Promise<PurchaseOrderFull> {
    try {
      const url = `${JLC_API_BASE}/jhdb/purchase-orders/${encodeURIComponent(po_number)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Purchase Order ${po_number} not found`);
        }
        throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
      }

      const data: PurchaseOrderFull = await response.json();
      return data;

    } catch (error) {
      console.error('Error fetching PO details:', error);
      throw new Error(`Failed to fetch PO details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find matching inventory items for PO product
   */
  static async findInventoryItemForProduct(productKeydata: string): Promise<{
    inventory_item_id?: string;
    product_code?: string;
    available_stock?: number;
    location?: string;
  } | null> {
    try {
      // First, try to find exact match by product name
      const initialResult = await supabase
        .from('inventory_items')
        .select('id, product_name, sku, unit_level3_quantity, location')
        .eq('product_name', productKeydata)
        .gt('unit_level3_quantity', 0)
        .limit(1)
        .single();

      let inventoryData = initialResult.data;
      const error = initialResult.error;

      // If no exact match, try multiple fallback strategies
      if (error || !inventoryData) {
        // Strategy 1: Partial match with stock
        const { data: partialMatchData, error: partialError } = await supabase
          .from('inventory_items')
          .select('id, product_name, sku, unit_level3_quantity, location')
          .ilike('product_name', `%${productKeydata}%`)
          .gt('unit_level3_quantity', 0)
          .order('unit_level3_quantity', { ascending: false, nullsFirst: false })
          .limit(1);

        if (!partialError && partialMatchData && partialMatchData.length > 0) {
          inventoryData = partialMatchData[0];
        } else {
          // Strategy 2: Any item with stock and location (for demo purposes)
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('inventory_items')
            .select('id, product_name, sku, unit_level3_quantity, location')
            .gt('unit_level3_quantity', 0)
            .not('location', 'is', null)
            .order('unit_level3_quantity', { ascending: false, nullsFirst: false })
            .limit(1);

          if (!fallbackError && fallbackData && fallbackData.length > 0) {
            inventoryData = fallbackData[0];
            console.warn(`Using fallback inventory for product: ${productKeydata} -> ${inventoryData.product_name}`);
          } else {
            // Strategy 3: Any item regardless of stock (last resort)
            const { data: lastResortData, error: lastResortError } = await supabase
              .from('inventory_items')
              .select('id, product_name, sku, unit_level3_quantity, location')
              .order('created_at', { ascending: false, nullsFirst: false })
              .limit(1);

            if (!lastResortError && lastResortData && lastResortData.length > 0) {
              inventoryData = lastResortData[0];
              console.warn(`Using last resort inventory for product: ${productKeydata} -> ${inventoryData.product_name} (no stock)`);
            } else {
              console.warn(`No inventory found for product: ${productKeydata}`);
              // Return default values instead of null
              return {
                inventory_item_id: undefined,
                product_code: productKeydata,
                available_stock: 0,
                location: '❌ ไม่มีในระบบสต็อก'
              };
            }
          }
        }
      }

      return {
        inventory_item_id: inventoryData.id,
        product_code: inventoryData.sku || productKeydata,
        available_stock: inventoryData.unit_level3_quantity || 0,
        location: inventoryData.location || 'ไม่ระบุ'
      };

    } catch (error) {
      console.error('Error finding inventory item:', error);
      // Return default values on error instead of null
      return {
        inventory_item_id: undefined,
        product_code: productKeydata,
        available_stock: 0,
        location: '⚠️ เกิดข้อผิดพลาดในการค้นหา'
      };
    }
  }

  /**
   * ค้นหาสินค้าจากทุก location (สำหรับเลือกหลาย location)
   */
  static async findAllInventoryLocationsForProduct(productKeydata: string): Promise<Array<{
    inventory_item_id: string;
    product_code: string;
    available_stock: number;
    location: string;
  }>> {
    try {
      // ค้นหาทุก location ที่มีสินค้านี้และมีสต็อก - แยก query เป็น 2 แบบ

      // พยายามค้นหาแบบ exact match ก่อน
      let { data: inventoryData, error } = await supabase
        .from('inventory_items')
        .select('id, product_name, sku, unit_level3_quantity, location')
        .eq('product_name', productKeydata)
        .gt('unit_level3_quantity', 0);

      // ถ้าไม่เจอ ลองค้นหาแบบ partial match
      if (!inventoryData || inventoryData.length === 0) {
        const result = await supabase
          .from('inventory_items')
          .select('id, product_name, sku, unit_level3_quantity, location')
          .ilike('product_name', `%${productKeydata}%`)
          .gt('unit_level3_quantity', 0);

        inventoryData = result.data;
        error = result.error;
      }

      if (error) throw error;

      if (!inventoryData || inventoryData.length === 0) {
        console.warn(`No inventory locations found for product: ${productKeydata}`);
        return [];
      }

      // Sort in JavaScript instead of SQL
      const sortedData = inventoryData.sort((a, b) => (b.unit_level3_quantity || 0) - (a.unit_level3_quantity || 0));

      return sortedData.map(item => ({
        inventory_item_id: item.id,
        product_code: item.sku || productKeydata,
        available_stock: item.unit_level3_quantity || 0,
        location: item.location || 'ไม่ระบุ'
      }));

    } catch (error) {
      console.error('Error finding inventory locations:', error);
      return [];
    }
  }

  /**
   * Convert PO to Fulfillment Task format with inventory linking
   */
  static async convertPOToFulfillmentTask(po: PurchaseOrderFull): Promise<FulfillmentTask> {
    const { header, details } = po;

    // Process items with inventory linking
    const items: FulfillmentItem[] = [];

    for (let index = 0; index < details.length; index++) {
      const detail = details[index];
      const inventoryInfo = await this.findInventoryItemForProduct(detail.Keydata);

      const item: FulfillmentItem = {
        id: `fi_${detail.ID}_${index}`,
        fulfillment_task_id: `ft_${header.PO_Number}_${Date.now()}`,
        product_name: detail.Keydata,
        product_code: inventoryInfo?.product_code || detail.Keydata || '⚠️ ไม่มีรหัส',
        requested_quantity: parseFloat(detail.Quantity),
        fulfilled_quantity: 0,
        unit_price: parseFloat(detail.UnitPrice),
        total_amount: parseFloat(detail.TotalAmount),
        status: 'pending' as const,
        inventory_item_id: inventoryInfo?.inventory_item_id || undefined,
        available_stock: inventoryInfo?.available_stock ?? 0, // Use ?? to handle 0 correctly
        location: inventoryInfo?.location || '❌ ไม่พบในสต็อก'
      };

      items.push(item);
    }

    const fulfillmentTask: FulfillmentTask = {
      id: `ft_${header.PO_Number}_${Date.now()}`,
      po_number: header.PO_Number,
      po_date: header.PO_Date,
      delivery_date: header.Delivery_Date,
      customer_code: header.ARCODE,
      warehouse_name: header.Warehouse_Name,
      total_amount: parseFloat(header.M_TotalAmount),
      status: 'pending',
      items,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return fulfillmentTask;
  }

  /**
   * Format currency display
   */
  static formatCurrency(amount: string | number): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2
    }).format(numAmount);
  }

  /**
   * Format date display
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

  /**
   * Get fulfillment status color for UI
   */
  static getStatusColor(status: FulfillmentStatus): string {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      packed: 'bg-orange-100 text-orange-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  }

  /**
   * Get fulfillment status label in Thai
   */
  static getStatusLabel(status: FulfillmentStatus): string {
    const labels = {
      pending: 'รอดำเนินการ',
      in_progress: 'กำลังจัดสินค้า',
      packed: 'จัดครบแล้ว',
      shipped: 'จัดส่งแล้ว',
      delivered: 'ส่งถึงแล้ว',
      cancelled: 'ยกเลิก'
    };
    return labels[status] || labels.pending;
  }

  /**
   * Get item status label in Thai
   */
  static getItemStatusLabel(status: FulfillmentItemStatus): string {
    const labels = {
      pending: 'รอจัด',
      picked: 'จัดแล้ว',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก'
    };
    return labels[status] || labels.pending;
  }

  /**
   * Get source type label in Thai
   */
  static getSourceTypeLabel(sourceType: FulfillmentSource): string {
    return sourceType === 'api' ? 'จาก PO' : 'สร้างเอง';
  }

  /**
   * Get source type badge variant
   */
  static getSourceTypeBadge(sourceType: FulfillmentSource): string {
    return sourceType === 'api' ? 'default' : 'secondary';
  }
}

export default PurchaseOrderService;