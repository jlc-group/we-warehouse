/**
 * Csmile Service - เตรียมไว้สำหรับเชื่อมต่อ Csmile API
 * 
 * TODO: เมื่อได้ API credentials จาก Csmile ให้ update:
 * 1. CSMILE_API_URL - URL ของ Csmile API
 * 2. CSMILE_API_KEY - API Key สำหรับ authentication
 * 3. ปรับ payload format ตาม API specification ของ Csmile
 */
import { getLocalPool } from '../config/localDatabase.js';

// Csmile API Configuration (TODO: ย้ายไป environment variables)
const CSMILE_API_URL = process.env.CSMILE_API_URL || 'https://api.csmile.example.com';
const CSMILE_API_KEY = process.env.CSMILE_API_KEY || '';
const CSMILE_ENABLED = process.env.CSMILE_ENABLED === 'true';

export interface CsmileShipmentPayload {
    taxno: string;
    docno: string;
    taxdate: string;
    customer_code: string;
    customer_name: string;
    total_amount: number;
    item_count: number;
    items?: Array<{
        product_code: string;
        product_name: string;
        quantity: number;
        unit: string;
    }>;
}

export interface CsmileResponse {
    success: boolean;
    tracking_number?: string;
    message?: string;
    error?: string;
}

export class CsmileService {
    /**
     * ตรวจสอบว่า Csmile integration เปิดใช้งานหรือไม่
     */
    static isEnabled(): boolean {
        return CSMILE_ENABLED && !!CSMILE_API_KEY;
    }

    /**
     * ส่งข้อมูล shipment ไปยัง Csmile
     * TODO: Implement actual API call when Csmile provides API spec
     */
    static async sendShipment(payload: CsmileShipmentPayload): Promise<CsmileResponse> {
        // หากยังไม่ได้เปิดใช้งาน Csmile integration
        if (!this.isEnabled()) {
            console.log('📦 Csmile integration not enabled. Skipping API call.');
            return {
                success: true,
                message: 'Csmile integration not enabled - shipment recorded locally only'
            };
        }

        try {
            console.log(`📤 Sending shipment to Csmile: ${payload.taxno}`);

            // TODO: Uncomment and adjust when Csmile API is available
            /*
            const response = await fetch(`${CSMILE_API_URL}/shipments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CSMILE_API_KEY}`,
                    'X-API-Key': CSMILE_API_KEY
                },
                body: JSON.stringify({
                    // Adjust payload format based on Csmile API spec
                    invoice_number: payload.taxno,
                    document_number: payload.docno,
                    invoice_date: payload.taxdate,
                    customer: {
                        code: payload.customer_code,
                        name: payload.customer_name
                    },
                    total: payload.total_amount,
                    item_count: payload.item_count,
                    items: payload.items
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Csmile API error');
            }

            return {
                success: true,
                tracking_number: result.tracking_number,
                message: 'Shipment sent to Csmile successfully'
            };
            */

            // Placeholder response
            return {
                success: true,
                message: 'Csmile API integration pending - shipment recorded locally'
            };

        } catch (error: any) {
            console.error('❌ Csmile API error:', error);
            return {
                success: false,
                error: error.message || 'Failed to send shipment to Csmile'
            };
        }
    }

    /**
     * ส่งหลาย shipments ไป Csmile
     */
    static async bulkSendShipments(payloads: CsmileShipmentPayload[]): Promise<{
        success: number;
        failed: number;
        results: CsmileResponse[];
    }> {
        let success = 0;
        let failed = 0;
        const results: CsmileResponse[] = [];

        for (const payload of payloads) {
            const result = await this.sendShipment(payload);
            results.push(result);

            if (result.success) {
                success++;
            } else {
                failed++;
            }
        }

        return { success, failed, results };
    }

    /**
     * ดึงรายการ shipped จาก database และส่งไป Csmile
     */
    static async syncShippedOrders(taxdate: string): Promise<{
        success: number;
        failed: number;
    }> {
        const pool = getLocalPool();

        // ดึงรายการที่ shipped แล้วแต่ยังไม่ได้ส่งไป Csmile
        const { rows } = await pool.query(
            `SELECT * FROM shipment_orders 
             WHERE status = 'shipped' 
             AND taxdate = $1
             AND (notes IS NULL OR notes NOT LIKE '%csmile_synced%')
             ORDER BY created_at`,
            [taxdate]
        );

        if (rows.length === 0) {
            return { success: 0, failed: 0 };
        }

        const payloads: CsmileShipmentPayload[] = rows.map(row => ({
            taxno: row.taxno,
            docno: row.docno,
            taxdate: row.taxdate,
            customer_code: row.arcode,
            customer_name: row.arname,
            total_amount: row.total_amount,
            item_count: row.item_count
        }));

        const result = await this.bulkSendShipments(payloads);

        // Mark successful ones as synced
        for (let i = 0; i < rows.length; i++) {
            if (result.results[i].success) {
                await pool.query(
                    `UPDATE shipment_orders 
                     SET notes = COALESCE(notes, '') || ' [csmile_synced:${new Date().toISOString()}]'
                     WHERE id = $1`,
                    [rows[i].id]
                );
            }
        }

        return { success: result.success, failed: result.failed };
    }

    /**
     * ตรวจสอบการเชื่อมต่อ Csmile API
     */
    static async healthCheck(): Promise<{ connected: boolean; message: string }> {
        if (!this.isEnabled()) {
            return {
                connected: false,
                message: 'Csmile integration not configured'
            };
        }

        try {
            // TODO: Implement health check endpoint
            /*
            const response = await fetch(`${CSMILE_API_URL}/health`, {
                headers: { 'X-API-Key': CSMILE_API_KEY }
            });

            if (response.ok) {
                return { connected: true, message: 'Csmile API connected' };
            }
            */

            return {
                connected: false,
                message: 'Csmile API health check not implemented'
            };

        } catch (error: any) {
            return {
                connected: false,
                message: error.message || 'Connection failed'
            };
        }
    }
}
