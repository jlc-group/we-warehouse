import { supabase } from '@/integrations/supabase/client';

export type SeverityLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
export type EventCategory =
  | 'warehouse_transfer'
  | 'inventory'
  | 'stock_movement'
  | 'order'
  | 'system'
  | 'user'
  | 'location';

export interface LogEventParams {
  event_type: string;
  event_category: EventCategory;
  event_title: string;
  event_description?: string;
  severity_level?: SeverityLevel;
  location_context?: string;
  user_id?: string;
  metadata?: Record<string, any>;
  notes?: string;
}

/**
 * Service สำหรับบันทึกเหตุการณ์ต่างๆ ลงในตาราง system_events
 * เพื่อการติดตามและ audit trail
 */
export class EventLoggingService {
  /**
   * บันทึกเหตุการณ์ลงในระบบ
   */
  static async logEvent(params: LogEventParams): Promise<boolean> {
    try {
      // Include notes in metadata if provided, since notes column doesn't exist in schema
      const metadata = params.metadata || {};
      if (params.notes) {
        metadata.notes = params.notes;
      }

      const { error } = await supabase
        .from('system_events')
        .insert({
          event_type: params.event_type,
          event_category: params.event_category,
          event_title: params.event_title,
          event_description: params.event_description || null,
          severity_level: params.severity_level || 'INFO',
          location_context: params.location_context || null,
          user_id: params.user_id || null,
          metadata: metadata,
          created_at: new Date().toISOString()
        } as any);

      if (error) {
        console.error('Error logging event:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception logging event:', error);
      return false;
    }
  }

  /**
   * บันทึกการสร้าง warehouse transfer
   */
  static async logTransferCreated(params: {
    transfer_id: string;
    transfer_number: string;
    title: string;
    source_warehouse_name: string;
    target_warehouse_name: string;
    total_items: number;
    priority: string;
    created_by?: string;
  }): Promise<boolean> {
    return this.logEvent({
      event_type: 'transfer_created',
      event_category: 'warehouse_transfer',
      event_title: `สร้างใบย้ายสินค้า ${params.transfer_number}`,
      event_description: params.title,
      severity_level: 'INFO',
      user_id: params.created_by,
      metadata: {
        transfer_id: params.transfer_id,
        transfer_number: params.transfer_number,
        source_warehouse: params.source_warehouse_name,
        target_warehouse: params.target_warehouse_name,
        total_items: params.total_items,
        priority: params.priority
      },
      notes: `ย้ายสินค้าจาก ${params.source_warehouse_name} ไปยัง ${params.target_warehouse_name} (${params.total_items} รายการ)`
    });
  }

  /**
   * บันทึกการอัปเดตสถานะ warehouse transfer
   */
  static async logTransferStatusUpdate(params: {
    transfer_id: string;
    transfer_number: string;
    old_status: string;
    new_status: string;
    updated_by?: string;
    notes?: string;
  }): Promise<boolean> {
    const statusMessages: Record<string, { title: string; severity: SeverityLevel }> = {
      pending: { title: 'ส่งเพื่อรอการอนุมัติ', severity: 'INFO' },
      approved: { title: 'อนุมัติแล้ว', severity: 'SUCCESS' },
      in_progress: { title: 'เริ่มดำเนินการย้าย', severity: 'INFO' },
      completed: { title: 'ย้ายสินค้าเสร็จสิ้น', severity: 'SUCCESS' },
      cancelled: { title: 'ยกเลิกการย้าย', severity: 'WARNING' },
      draft: { title: 'บันทึกฉบับร่าง', severity: 'INFO' }
    };

    const statusInfo = statusMessages[params.new_status] || { title: params.new_status, severity: 'INFO' };

    return this.logEvent({
      event_type: 'transfer_status_update',
      event_category: 'warehouse_transfer',
      event_title: `${params.transfer_number}: ${statusInfo.title}`,
      event_description: `เปลี่ยนสถานะจาก "${params.old_status}" เป็น "${params.new_status}"`,
      severity_level: statusInfo.severity,
      user_id: params.updated_by,
      metadata: {
        transfer_id: params.transfer_id,
        transfer_number: params.transfer_number,
        old_status: params.old_status,
        new_status: params.new_status
      },
      notes: params.notes
    });
  }

  /**
   * บันทึกการย้ายสินค้าจริง (execute transfer)
   */
  static async logTransferExecuted(params: {
    transfer_id: string;
    transfer_number: string;
    source_warehouse_name: string;
    target_warehouse_name: string;
    items_moved: number;
    duration_minutes?: number;
    executed_by?: string;
  }): Promise<boolean> {
    return this.logEvent({
      event_type: 'transfer_executed',
      event_category: 'warehouse_transfer',
      event_title: `ย้ายสินค้าสำเร็จ: ${params.transfer_number}`,
      event_description: `ย้ายสินค้า ${params.items_moved} รายการจาก ${params.source_warehouse_name} ไปยัง ${params.target_warehouse_name}`,
      severity_level: 'SUCCESS',
      user_id: params.executed_by,
      metadata: {
        transfer_id: params.transfer_id,
        transfer_number: params.transfer_number,
        source_warehouse: params.source_warehouse_name,
        target_warehouse: params.target_warehouse_name,
        items_moved: params.items_moved,
        duration_minutes: params.duration_minutes
      },
      notes: params.duration_minutes
        ? `ใช้เวลา ${params.duration_minutes} นาที`
        : undefined
    });
  }

  /**
   * บันทึกข้อผิดพลาดในการย้ายสินค้า
   */
  static async logTransferError(params: {
    transfer_id?: string;
    transfer_number?: string;
    error_message: string;
    error_details?: any;
    user_id?: string;
  }): Promise<boolean> {
    return this.logEvent({
      event_type: 'transfer_error',
      event_category: 'warehouse_transfer',
      event_title: `ข้อผิดพลาดในการย้ายสินค้า${params.transfer_number ? `: ${params.transfer_number}` : ''}`,
      event_description: params.error_message,
      severity_level: 'ERROR',
      user_id: params.user_id,
      metadata: {
        transfer_id: params.transfer_id,
        transfer_number: params.transfer_number,
        error_details: params.error_details
      },
      notes: typeof params.error_details === 'string'
        ? params.error_details
        : JSON.stringify(params.error_details)
    });
  }

  /**
   * บันทึกการเพิ่มรายการสินค้าใน transfer
   */
  static async logItemsAddedToTransfer(params: {
    transfer_id: string;
    transfer_number: string;
    items_added: number;
    user_id?: string;
  }): Promise<boolean> {
    return this.logEvent({
      event_type: 'transfer_items_added',
      event_category: 'warehouse_transfer',
      event_title: `เพิ่มรายการสินค้าใน ${params.transfer_number}`,
      event_description: `เพิ่มสินค้า ${params.items_added} รายการในใบย้ายสินค้า`,
      severity_level: 'INFO',
      user_id: params.user_id,
      metadata: {
        transfer_id: params.transfer_id,
        transfer_number: params.transfer_number,
        items_added: params.items_added
      }
    });
  }

  /**
   * บันทึกการแก้ไขข้อมูลสินค้า
   */
  static async logProductUpdated(params: {
    sku: string;
    product_name: string;
    changes: Record<string, { old: any; new: any }>;
    notes?: string;
    user_id?: string;
  }): Promise<boolean> {
    // สร้างคำอธิบายการเปลี่ยนแปลง
    const changeDescriptions = Object.entries(params.changes).map(([field, change]) => {
      const fieldNames: Record<string, string> = {
        product_name: 'ชื่อสินค้า',
        unit_level1_name: 'ชื่อหน่วยระดับ 1',
        unit_level2_name: 'ชื่อหน่วยระดับ 2',
        unit_level3_name: 'ชื่อหน่วยระดับ 3',
        unit_level1_rate: 'อัตราแปลงระดับ 1',
        unit_level2_rate: 'อัตราแปลงระดับ 2'
      };
      const fieldName = fieldNames[field] || field;
      return `${fieldName}: "${change.old}" → "${change.new}"`;
    });

    return this.logEvent({
      event_type: 'product_updated',
      event_category: 'inventory',
      event_title: `แก้ไขข้อมูลสินค้า ${params.sku}`,
      event_description: `แก้ไข ${params.product_name} - ${changeDescriptions.join(', ')}`,
      severity_level: 'INFO',
      user_id: params.user_id,
      metadata: {
        sku: params.sku,
        product_name: params.product_name,
        changes: params.changes,
        change_count: Object.keys(params.changes).length
      },
      notes: params.notes
    });
  }
}
