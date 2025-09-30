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
  | 'completed'    // จัดสินค้าเสร็จ
  | 'shipped'      // จัดส่งแล้ว
  | 'cancelled';   // ยกเลิก

export interface FulfillmentTask {
  id: string;
  po_number: string;
  po_date: string;
  delivery_date: string;
  customer_code: string;
  warehouse_name: string;
  total_amount: number;
  status: FulfillmentStatus;
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
  status: 'pending' | 'partial' | 'completed';
  inventory_item_id?: string;
  available_stock?: number;
  location?: string;
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
      let { data: inventoryData, error } = await supabase
        .from('inventory_items')
        .select(`
          id,
          product_name,
          quantity,
          location,
          products (
            id,
            name,
            sku_code
          )
        `)
        .eq('product_name', productKeydata)
        .gt('quantity', 0)
        .limit(1)
        .single();

      // If no exact match, try partial match (case insensitive)
      if (error || !inventoryData) {
        const { data: partialMatchData, error: partialError } = await supabase
          .from('inventory_items')
          .select(`
            id,
            product_name,
            quantity,
            location,
            products (
              id,
              name,
              sku_code
            )
          `)
          .ilike('product_name', `%${productKeydata}%`)
          .gt('quantity', 0)
          .limit(1);

        if (partialError || !partialMatchData || partialMatchData.length === 0) {
          console.warn(`No inventory found for product: ${productKeydata}`);
          return null;
        }
        inventoryData = partialMatchData[0];
      }

      return {
        inventory_item_id: inventoryData.id,
        product_code: inventoryData.products?.sku_code || productKeydata,
        available_stock: inventoryData.quantity,
        location: inventoryData.location || 'ไม่ระบุ'
      };

    } catch (error) {
      console.error('Error finding inventory item:', error);
      return null;
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
        product_code: inventoryInfo?.product_code || detail.Keydata,
        requested_quantity: parseFloat(detail.Quantity),
        fulfilled_quantity: 0,
        unit_price: parseFloat(detail.UnitPrice),
        total_amount: parseFloat(detail.TotalAmount),
        status: 'pending' as const,
        inventory_item_id: inventoryInfo?.inventory_item_id,
        available_stock: inventoryInfo?.available_stock || 0,
        location: inventoryInfo?.location
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
      completed: 'bg-green-100 text-green-800',
      shipped: 'bg-purple-100 text-purple-800',
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
      completed: 'จัดสินค้าเสร็จ',
      shipped: 'จัดส่งแล้ว',
      cancelled: 'ยกเลิก'
    };
    return labels[status] || labels.pending;
  }
}

export default PurchaseOrderService;