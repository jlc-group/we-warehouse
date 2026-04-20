/**
 * Shipment Service - จัดการสถานะการจัดส่ง
 */
import { getLocalPool } from '../config/localDatabase.js';

export interface ShipmentOrder {
    id: string;
    taxno: string;
    docno: string;
    taxdate: string;
    arcode: string;
    arname: string;
    total_amount: number;
    item_count: number;
    status: 'pending' | 'picked' | 'shipped' | 'confirmed' | 'cancelled';
    picked_at?: string;
    shipped_at?: string;
    confirmed_at?: string;
    picked_by?: string;
    confirmed_by?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export class ShipmentService {
    /**
     * ดึงรายการตาม status
     */
    static async getShipments(status?: string, taxdate?: string): Promise<ShipmentOrder[]> {
        const pool = getLocalPool();

        let query = 'SELECT * FROM shipment_orders WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
            query += ` AND status = $${paramIndex++}`;
            params.push(status);
        }

        if (taxdate) {
            query += ` AND taxdate = $${paramIndex++}`;
            params.push(taxdate);
        }

        query += ' ORDER BY created_at DESC';

        const { rows } = await pool.query(query, params);
        return rows;
    }

    /**
     * สร้างหรืออัพเดทรายการ shipment
     */
    static async upsertShipment(data: {
        taxno: string;
        docno: string;
        taxdate: string;
        arcode: string;
        arname: string;
        total_amount?: number;
        item_count?: number;
    }): Promise<ShipmentOrder> {
        const pool = getLocalPool();

        const { rows } = await pool.query(
            `INSERT INTO shipment_orders (taxno, docno, taxdate, arcode, arname, total_amount, item_count, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
             ON CONFLICT (taxno, docno) 
             DO UPDATE SET 
                arname = EXCLUDED.arname,
                total_amount = EXCLUDED.total_amount,
                item_count = EXCLUDED.item_count,
                updated_at = NOW()
             RETURNING *`,
            [data.taxno, data.docno, data.taxdate, data.arcode, data.arname, data.total_amount || 0, data.item_count || 0]
        );

        return rows[0];
    }

    /**
     * เปลี่ยนสถานะเป็น picked (หยิบแล้ว รอคอนเฟิร์ม)
     */
    static async markAsPicked(taxno: string, docno: string, pickedBy: string): Promise<{ success: boolean; message?: string }> {
        const pool = getLocalPool();

        const { rowCount } = await pool.query(
            `UPDATE shipment_orders 
             SET status = 'picked', picked_at = NOW(), picked_by = $3
             WHERE taxno = $1 AND docno = $2 AND status = 'pending'`,
            [taxno, docno, pickedBy]
        );

        if (rowCount === 0) {
            return { success: false, message: 'ไม่พบรายการ หรือสถานะไม่ใช่ pending' };
        }

        return { success: true };
    }

    /**
     * เปลี่ยนสถานะเป็น shipped (ส่งไป Csmile แล้ว)
     */
    static async markAsShipped(taxno: string, docno: string): Promise<{ success: boolean; message?: string }> {
        const pool = getLocalPool();

        const { rowCount } = await pool.query(
            `UPDATE shipment_orders 
             SET status = 'shipped', shipped_at = NOW()
             WHERE taxno = $1 AND docno = $2 AND status = 'picked'`,
            [taxno, docno]
        );

        if (rowCount === 0) {
            return { success: false, message: 'ไม่พบรายการ หรือสถานะไม่ใช่ picked' };
        }

        return { success: true };
    }

    /**
     * ยืนยันรายการ (confirmed)
     */
    static async confirm(taxno: string, docno: string, confirmedBy: string): Promise<{ success: boolean; message?: string }> {
        const pool = getLocalPool();

        const { rowCount } = await pool.query(
            `UPDATE shipment_orders 
             SET status = 'confirmed', confirmed_at = NOW(), confirmed_by = $3
             WHERE taxno = $1 AND docno = $2 AND status IN ('picked', 'shipped')`,
            [taxno, docno, confirmedBy]
        );

        if (rowCount === 0) {
            return { success: false, message: 'ไม่พบรายการ หรือสถานะไม่ถูกต้อง' };
        }

        return { success: true };
    }

    /**
     * ยกเลิกรายการ
     */
    static async cancel(taxno: string, docno: string): Promise<{ success: boolean; message?: string }> {
        const pool = getLocalPool();

        const { rowCount } = await pool.query(
            `UPDATE shipment_orders 
             SET status = 'cancelled'
             WHERE taxno = $1 AND docno = $2 AND status NOT IN ('confirmed')`,
            [taxno, docno]
        );

        if (rowCount === 0) {
            return { success: false, message: 'ไม่พบรายการ หรือยืนยันแล้วไม่สามารถยกเลิกได้' };
        }

        return { success: true };
    }

    /**
     * Bulk pick - หยิบหลายรายการพร้อมกัน
     */
    static async bulkPick(items: { taxno: string; docno: string }[], pickedBy: string): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        for (const item of items) {
            const result = await this.markAsPicked(item.taxno, item.docno, pickedBy);
            if (result.success) {
                success++;
            } else {
                failed++;
            }
        }

        return { success, failed };
    }

    /**
     * Bulk ship - ส่งหลายรายการพร้อมกัน
     */
    static async bulkShip(items: { taxno: string; docno: string }[]): Promise<{ success: number; failed: number }> {
        let success = 0;
        let failed = 0;

        for (const item of items) {
            const result = await this.markAsShipped(item.taxno, item.docno);
            if (result.success) {
                success++;
            } else {
                failed++;
            }
        }

        return { success, failed };
    }

    // ==================== Task Assignment Methods ====================

    /**
     * Assign orders to a worker (by DOCNO)
     */
    static async assignToWorker(
        orderDocnos: string[],
        workerEmail: string,
        priority: string = 'normal'
    ): Promise<{ success: boolean; assigned: number; message?: string }> {
        const pool = getLocalPool();

        try {
            const { rowCount } = await pool.query(
                `UPDATE shipment_orders 
                 SET assigned_to = $1, assigned_at = NOW(), priority = $2
                 WHERE docno = ANY($3::text[]) AND (status = 'pending' OR status IS NULL)`,
                [workerEmail, priority, orderDocnos]
            );

            return {
                success: true,
                assigned: rowCount || 0,
                message: `Assigned ${rowCount} orders to ${workerEmail}`
            };
        } catch (error: any) {
            return { success: false, assigned: 0, message: error.message };
        }
    }

    /**
     * Get tasks assigned to a specific worker
     */
    static async getMyTasks(workerEmail: string): Promise<ShipmentOrder[]> {
        const pool = getLocalPool();

        const { rows } = await pool.query(
            `SELECT * FROM shipment_orders 
             WHERE assigned_to = $1 
             AND status IN ('pending', 'picked')
             ORDER BY 
                CASE priority 
                    WHEN 'urgent' THEN 1 
                    WHEN 'high' THEN 2 
                    WHEN 'normal' THEN 3 
                    WHEN 'low' THEN 4 
                END,
                assigned_at ASC`,
            [workerEmail]
        );

        return rows;
    }

    /**
     * Get all unassigned orders (for admin view)
     */
    static async getUnassignedOrders(): Promise<ShipmentOrder[]> {
        const pool = getLocalPool();

        const { rows } = await pool.query(
            `SELECT * FROM shipment_orders 
             WHERE assigned_to IS NULL 
             AND status = 'pending'
             ORDER BY taxdate DESC, created_at DESC`
        );

        return rows;
    }

    /**
     * Get all assigned orders with worker info (for admin view)
     */
    static async getAssignedOrders(): Promise<ShipmentOrder[]> {
        const pool = getLocalPool();

        const { rows } = await pool.query(
            `SELECT * FROM shipment_orders 
             WHERE assigned_to IS NOT NULL 
             AND status IN ('pending', 'picked')
             ORDER BY assigned_at DESC`
        );

        return rows;
    }

    /**
     * Start picking - mark order as being picked
     */
    static async startPicking(orderId: string, workerEmail: string): Promise<{ success: boolean; message?: string }> {
        const pool = getLocalPool();

        const { rowCount } = await pool.query(
            `UPDATE shipment_orders 
             SET status = 'picked', picked_at = NOW(), picked_by = $2
             WHERE id = $1 AND assigned_to = $2 AND status = 'pending'`,
            [orderId, workerEmail]
        );

        if (rowCount === 0) {
            return { success: false, message: 'Order not found or not assigned to you' };
        }

        return { success: true };
    }

    /**
     * Unassign order
     */
    static async unassignOrder(orderId: string): Promise<{ success: boolean; message?: string }> {
        const pool = getLocalPool();

        const { rowCount } = await pool.query(
            `UPDATE shipment_orders 
             SET assigned_to = NULL, assigned_at = NULL
             WHERE id = $1 AND status = 'pending'`,
            [orderId]
        );

        if (rowCount === 0) {
            return { success: false, message: 'Order not found or already picked' };
        }

        return { success: true };
    }

    /**
     * Get list of workers (all users for now)
     */
    static async getWorkersList(): Promise<{ email: string; full_name: string }[]> {
        const pool = getLocalPool();

        try {
            // Get all users - roles might be in Thai
            const { rows } = await pool.query(
                `SELECT email, full_name FROM users ORDER BY full_name`
            );
            return rows;
        } catch (error) {
            // If users table doesn't exist, return empty
            console.log('Workers list: users table not found');
            return [];
        }
    }
}
