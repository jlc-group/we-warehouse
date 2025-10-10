/**
 * Inbound Receipt Service
 * จัดการระบบรับเข้าสินค้า (Goods Receipt)
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TypeScript Interfaces
// =====================================================

export type ReceiptType = 'po_fg' | 'po_pk' | 'manual' | 'return' | 'adjustment';
export type ReceiptStatus = 'draft' | 'received' | 'qc_pending' | 'qc_approved' | 'qc_rejected' | 'completed' | 'cancelled';
export type ItemStatus = 'pending' | 'received' | 'stocked' | 'rejected';
export type QCStatus = 'pending' | 'approved' | 'rejected' | 'partial';
export type QCResult = 'pass' | 'fail' | 'conditional';

export interface InboundReceipt {
  id: string;
  receipt_number: string;
  receipt_date: string;
  receipt_type: ReceiptType;
  supplier_code?: string;
  supplier_name?: string;
  po_number?: string;
  po_date?: string;
  delivery_note_number?: string;
  delivery_date?: string;
  carrier_name?: string;
  tracking_number?: string;
  status: ReceiptStatus;
  warehouse_id?: string;
  warehouse_name?: string;
  total_items: number;
  total_quantity: number;
  notes?: string;
  internal_notes?: string;
  qc_notes?: string;
  received_by?: string;
  qc_by?: string;
  approved_by?: string;
  received_at?: string;
  qc_completed_at?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface InboundReceiptItem {
  id: string;
  inbound_receipt_id: string;
  line_number: number;
  product_id?: string;
  product_code?: string;
  product_name: string;
  sku?: string;
  ordered_quantity_level1: number;
  ordered_quantity_level2: number;
  ordered_quantity_level3: number;
  received_quantity_level1: number;
  received_quantity_level2: number;
  received_quantity_level3: number;
  unit_level1_name: string;
  unit_level2_name: string;
  unit_level3_name: string;
  unit_level1_rate: number;
  unit_level2_rate: number;
  total_received_pieces: number;
  location?: string;
  lot_number?: string;
  batch_number?: string;
  manufacturing_date?: string;
  expiry_date?: string;
  qc_status: QCStatus;
  qc_approved_qty: number;
  qc_rejected_qty: number;
  qc_notes?: string;
  unit_price?: number;
  total_amount?: number;
  status: ItemStatus;
  notes?: string;
  inventory_item_id?: string;
  created_at: string;
  updated_at: string;
}

export interface InboundQCLog {
  id: string;
  inbound_receipt_id: string;
  inbound_receipt_item_id?: string;
  qc_result: QCResult;
  qc_criteria?: string;
  qc_findings?: string;
  qc_notes?: string;
  qc_score?: number;
  max_score?: number;
  photo_urls?: string[];
  qc_inspector_id?: string;
  qc_inspector_name?: string;
  qc_performed_at: string;
  created_at: string;
}

export interface CreateInboundReceiptInput {
  receipt_type: ReceiptType;
  supplier_code?: string;
  supplier_name?: string;
  po_number?: string;
  po_date?: string;
  delivery_note_number?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  notes?: string;
  items: CreateInboundReceiptItemInput[];
}

export interface CreateInboundReceiptItemInput {
  product_id?: string;
  product_code?: string;
  product_name: string;
  sku?: string;
  received_quantity_level1: number;
  received_quantity_level2: number;
  received_quantity_level3: number;
  unit_level1_name?: string;
  unit_level2_name?: string;
  unit_level3_name?: string;
  unit_level1_rate?: number;
  unit_level2_rate?: number;
  location?: string;
  lot_number?: string;
  batch_number?: string;
  manufacturing_date?: string;
  expiry_date?: string;
  unit_price?: number;
  notes?: string;
}

// =====================================================
// Service Class
// =====================================================

export class InboundReceiptService {
  /**
   * สร้างรายการรับเข้าสินค้าใหม่
   */
  static async createReceipt(input: CreateInboundReceiptInput, userId?: string): Promise<{ success: boolean; receipt?: InboundReceipt; error?: string }> {
    try {
      // 1. สร้าง receipt header
      const { data: receipt, error: receiptError } = await supabase
        .from('inbound_receipts')
        .insert({
          receipt_type: input.receipt_type,
          supplier_code: input.supplier_code,
          supplier_name: input.supplier_name,
          po_number: input.po_number,
          po_date: input.po_date,
          delivery_note_number: input.delivery_note_number,
          warehouse_id: input.warehouse_id,
          warehouse_name: input.warehouse_name,
          status: 'draft',
          notes: input.notes,
          created_by: userId,
          updated_by: userId
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // 2. สร้าง receipt items
      const itemsToInsert = input.items.map((item, index) => ({
        inbound_receipt_id: receipt.id,
        line_number: index + 1,
        product_id: item.product_id,
        product_code: item.product_code,
        product_name: item.product_name,
        sku: item.sku,
        received_quantity_level1: item.received_quantity_level1 || 0,
        received_quantity_level2: item.received_quantity_level2 || 0,
        received_quantity_level3: item.received_quantity_level3 || 0,
        unit_level1_name: item.unit_level1_name || 'ลัง',
        unit_level2_name: item.unit_level2_name || 'กล่อง',
        unit_level3_name: item.unit_level3_name || 'ชิ้น',
        unit_level1_rate: item.unit_level1_rate || 144,
        unit_level2_rate: item.unit_level2_rate || 12,
        location: item.location,
        lot_number: item.lot_number,
        batch_number: item.batch_number,
        manufacturing_date: item.manufacturing_date,
        expiry_date: item.expiry_date,
        unit_price: item.unit_price,
        total_amount: item.unit_price
          ? item.unit_price * (
            (item.received_quantity_level1 || 0) * (item.unit_level1_rate || 144) +
            (item.received_quantity_level2 || 0) * (item.unit_level2_rate || 12) +
            (item.received_quantity_level3 || 0)
          )
          : null,
        status: 'pending',
        qc_status: 'pending',
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from('inbound_receipt_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      return { success: true, receipt };
    } catch (error: any) {
      console.error('Error creating inbound receipt:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ดึงรายการรับเข้าทั้งหมด พร้อม filter
   */
  static async getReceipts(filters?: {
    status?: ReceiptStatus;
    receipt_type?: ReceiptType;
    po_number?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<{ success: boolean; receipts?: InboundReceipt[]; error?: string }> {
    try {
      let query = supabase
        .from('inbound_receipts')
        .select('*')
        .order('receipt_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.receipt_type) {
        query = query.eq('receipt_type', filters.receipt_type);
      }

      if (filters?.po_number) {
        query = query.eq('po_number', filters.po_number);
      }

      if (filters?.date_from) {
        query = query.gte('receipt_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('receipt_date', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, receipts: data || [] };
    } catch (error: any) {
      console.error('Error fetching receipts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ดึงรายละเอียดรายการรับเข้า พร้อม items
   */
  static async getReceiptById(receiptId: string): Promise<{ success: boolean; receipt?: InboundReceipt; items?: InboundReceiptItem[]; error?: string }> {
    try {
      // Get receipt header
      const { data: receipt, error: receiptError } = await supabase
        .from('inbound_receipts')
        .select('*')
        .eq('id', receiptId)
        .single();

      if (receiptError) throw receiptError;

      // Get receipt items
      const { data: items, error: itemsError } = await supabase
        .from('inbound_receipt_items')
        .select('*')
        .eq('inbound_receipt_id', receiptId)
        .order('line_number', { ascending: true });

      if (itemsError) throw itemsError;

      return { success: true, receipt, items: items || [] };
    } catch (error: any) {
      console.error('Error fetching receipt details:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * อัปเดตสถานะรายการรับเข้า
   */
  static async updateReceiptStatus(
    receiptId: string,
    status: ReceiptStatus,
    userId?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        status,
        updated_by: userId
      };

      // Set timestamps based on status
      if (status === 'received') {
        updateData.received_at = new Date().toISOString();
        updateData.received_by = userId;
      } else if (status === 'qc_approved') {
        updateData.qc_completed_at = new Date().toISOString();
        updateData.qc_by = userId;
      } else if (status === 'completed') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = userId;
      }

      if (notes) {
        updateData.qc_notes = notes;
      }

      const { error } = await supabase
        .from('inbound_receipts')
        .update(updateData)
        .eq('id', receiptId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error updating receipt status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * เข้าสต็อก - เพิ่มสินค้าเข้า inventory_items
   */
  static async stockReceiptItems(
    receiptId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. ดึงข้อมูล receipt items
      const { data: items, error: itemsError } = await supabase
        .from('inbound_receipt_items')
        .select('*')
        .eq('inbound_receipt_id', receiptId)
        .eq('status', 'received');

      if (itemsError) throw itemsError;
      if (!items || items.length === 0) {
        return { success: false, error: 'No items to stock' };
      }

      // 2. สำหรับแต่ละ item - เช็คว่ามี inventory_item อยู่แล้วหรือไม่
      for (const item of items) {
        // ถ้ามี location + product_id + lot_number ตรงกัน -> อัปเดตจำนวน
        // ถ้าไม่มี -> สร้างใหม่

        const { data: existingItem, error: checkError } = await supabase
          .from('inventory_items')
          .select('id, unit_level1_quantity, unit_level2_quantity, unit_level3_quantity')
          .eq('location', item.location || '')
          .eq('product_id', item.product_id || '')
          .eq('lot_number', item.lot_number || '')
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingItem) {
          // อัปเดตจำนวนเพิ่ม
          const { error: updateError } = await supabase
            .from('inventory_items')
            .update({
              unit_level1_quantity: (existingItem.unit_level1_quantity || 0) + (item.received_quantity_level1 || 0),
              unit_level2_quantity: (existingItem.unit_level2_quantity || 0) + (item.received_quantity_level2 || 0),
              unit_level3_quantity: (existingItem.unit_level3_quantity || 0) + (item.received_quantity_level3 || 0)
            })
            .eq('id', existingItem.id);

          if (updateError) throw updateError;

          // อัปเดต inventory_item_id ใน receipt item
          await supabase
            .from('inbound_receipt_items')
            .update({ inventory_item_id: existingItem.id, status: 'stocked' })
            .eq('id', item.id);
        } else {
          // สร้างใหม่
          const { data: newItem, error: insertError } = await supabase
            .from('inventory_items')
            .insert({
              product_id: item.product_id,
              product_name: item.product_name,
              sku: item.sku,
              location: item.location,
              unit_level1_quantity: item.received_quantity_level1,
              unit_level2_quantity: item.received_quantity_level2,
              unit_level3_quantity: item.received_quantity_level3,
              unit_level1_name: item.unit_level1_name,
              unit_level2_name: item.unit_level2_name,
              unit_level3_name: item.unit_level3_name,
              unit_level1_rate: item.unit_level1_rate,
              unit_level2_rate: item.unit_level2_rate,
              lot_number: item.lot_number,
              batch_number: item.batch_number,
              manufacturing_date: item.manufacturing_date,
              expiry_date: item.expiry_date,
              user_id: userId
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // อัปเดต inventory_item_id ใน receipt item
          await supabase
            .from('inbound_receipt_items')
            .update({ inventory_item_id: newItem.id, status: 'stocked' })
            .eq('id', item.id);
        }
      }

      // 3. อัปเดตสถานะ receipt เป็น completed
      await this.updateReceiptStatus(receiptId, 'completed', userId);

      return { success: true };
    } catch (error: any) {
      console.error('Error stocking receipt items:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * บันทึก QC Log
   */
  static async createQCLog(
    receiptId: string,
    qcResult: QCResult,
    qcNotes?: string,
    itemId?: string,
    inspectorId?: string,
    inspectorName?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('inbound_qc_logs')
        .insert({
          inbound_receipt_id: receiptId,
          inbound_receipt_item_id: itemId,
          qc_result: qcResult,
          qc_notes: qcNotes,
          qc_inspector_id: inspectorId,
          qc_inspector_name: inspectorName,
          qc_performed_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error creating QC log:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ลบรายการรับเข้า (soft delete by setting status to cancelled)
   */
  static async cancelReceipt(receiptId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('inbound_receipts')
        .update({ status: 'cancelled', updated_by: userId })
        .eq('id', receiptId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error cancelling receipt:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export default
export default InboundReceiptService;
