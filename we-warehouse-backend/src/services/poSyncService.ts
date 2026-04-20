/**
 * PO Sync Service
 * Sync Purchase Orders from JLC API to Local PostgreSQL Database
 */
import { getLocalPool } from '../config/localDatabase.js';

// JLC API Base URL
const JLC_API_BASE = process.env.VITE_JLC_API_BASE || 'http://jhserver.dyndns.info:82';

// Interfaces matching JLC API response
interface PurchaseOrderHeader {
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

interface PurchaseOrderDetail {
    ID: number;
    PO_Number: string;
    ARCode: string;
    Keydata: string;
    Quantity: string;
    UnitPrice: string;
    TotalAmount: string;
    Detail_Disc_Amount: string;
}

interface PurchaseOrderFull {
    header: PurchaseOrderHeader;
    details: PurchaseOrderDetail[];
}

interface SyncResult {
    success: boolean;
    synced: number;
    errors: string[];
    details: {
        po_number: string;
        status: 'created' | 'updated' | 'skipped' | 'error';
        message?: string;
    }[];
}

export class POSyncService {

    /**
     * Fetch PO list from JLC API
     */
    static async fetchPOList(params: {
        date_from?: string;
        date_to?: string;
        top?: number;
    } = {}): Promise<PurchaseOrderHeader[]> {
        try {
            const queryParams = new URLSearchParams();
            if (params.date_from) queryParams.append('date_from', params.date_from);
            if (params.date_to) queryParams.append('date_to', params.date_to);
            if (params.top) queryParams.append('top', params.top.toString());

            const url = `${JLC_API_BASE}/jhdb/purchase-orders?${queryParams.toString()}`;
            console.log(`🔄 Fetching PO list from: ${url}`);

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

            const data = await response.json() as PurchaseOrderHeader[];
            console.log(`✅ Fetched ${data.length} POs from JLC API`);
            return data;

        } catch (error) {
            console.error('❌ Error fetching PO list:', error);
            throw error;
        }
    }

    /**
     * Fetch PO details from JLC API
     */
    static async fetchPODetails(po_number: string): Promise<PurchaseOrderFull> {
        try {
            const url = `${JLC_API_BASE}/jhdb/purchase-orders/${encodeURIComponent(po_number)}`;
            console.log(`🔄 Fetching PO details: ${po_number}`);

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

            const data = await response.json() as PurchaseOrderFull;
            return data;

        } catch (error) {
            console.error(`❌ Error fetching PO details for ${po_number}:`, error);
            throw error;
        }
    }

    /**
     * Find or create customer by ARCODE
     */
    static async findOrCreateCustomer(arcode: string): Promise<string> {
        const pool = getLocalPool();

        // Try to find existing customer
        const { rows } = await pool.query(
            'SELECT id FROM customers WHERE customer_code = $1',
            [arcode]
        );

        if (rows.length > 0) {
            return rows[0].id;
        }

        // Create new customer
        const { rows: newRows } = await pool.query(
            `INSERT INTO customers (customer_code, customer_name, is_active, created_at, updated_at)
             VALUES ($1, $2, true, NOW(), NOW())
             RETURNING id`,
            [arcode, `Customer ${arcode}`]
        );

        console.log(`✅ Created new customer: ${arcode}`);
        return newRows[0].id;
    }

    /**
     * Find inventory location for a product
     */
    static async findProductLocation(productName: string): Promise<string | null> {
        const pool = getLocalPool();

        // Try exact match first
        const { rows } = await pool.query(
            `SELECT location FROM inventory_items 
             WHERE product_name ILIKE $1 AND quantity_pieces > 0
             ORDER BY quantity_pieces DESC
             LIMIT 1`,
            [`%${productName}%`]
        );

        if (rows.length > 0) {
            return rows[0].location;
        }

        // No location found
        return null;
    }

    /**
     * Sync a single PO to local database
     */
    static async syncSinglePO(po_number: string): Promise<{
        status: 'created' | 'updated' | 'error';
        message?: string;
    }> {
        const pool = getLocalPool();

        try {
            // Check if PO already exists
            const { rows: existingRows } = await pool.query(
                'SELECT id FROM customer_orders WHERE order_number = $1',
                [po_number]
            );

            if (existingRows.length > 0) {
                console.log(`⏭️ PO ${po_number} already exists, skipping...`);
                return { status: 'updated', message: 'Already exists' };
            }

            // Fetch PO details from JLC
            const poData = await this.fetchPODetails(po_number);
            const { header, details } = poData;

            // Find or create customer
            const customerId = await this.findOrCreateCustomer(header.ARCODE);

            // Create customer_order
            const { rows: orderRows } = await pool.query(
                `INSERT INTO customer_orders (
                    order_number, customer_id, customer_po_number,
                    order_date, due_date, total_amount, status, priority,
                    internal_notes, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                RETURNING id`,
                [
                    header.PO_Number,
                    customerId,
                    header.PO_Number,
                    header.PO_Date,
                    header.Delivery_Date,
                    parseFloat(header.M_TotalAmount) || 0,
                    'PENDING',
                    'NORMAL',
                    `Synced from JLC API - Warehouse: ${header.Warehouse_Name}`
                ]
            );

            const orderId = orderRows[0].id;
            console.log(`✅ Created order: ${header.PO_Number} (ID: ${orderId})`);

            // Create order_items
            for (let i = 0; i < details.length; i++) {
                const detail = details[i];
                const location = await this.findProductLocation(detail.Keydata);

                await pool.query(
                    `INSERT INTO order_items (
                        order_id, line_number, product_name, sku,
                        quantity_requested, unit_price, location, status,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
                    [
                        orderId,
                        i + 1,
                        detail.Keydata,
                        detail.Keydata.substring(0, 50), // Use first 50 chars as SKU
                        parseFloat(detail.Quantity) || 0,
                        parseFloat(detail.UnitPrice) || 0,
                        location || 'UNASSIGNED',
                        'PENDING'
                    ]
                );
            }

            console.log(`✅ Created ${details.length} order items for PO ${po_number}`);

            return { status: 'created', message: `${details.length} items` };

        } catch (error: any) {
            console.error(`❌ Error syncing PO ${po_number}:`, error);
            return { status: 'error', message: error.message };
        }
    }

    /**
     * Sync all POs from JLC API to local database
     */
    static async syncAllPOs(params: {
        date_from?: string;
        date_to?: string;
        top?: number;
    } = {}): Promise<SyncResult> {
        const result: SyncResult = {
            success: true,
            synced: 0,
            errors: [],
            details: []
        };

        try {
            // Default: last 7 days
            if (!params.date_from) {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                params.date_from = sevenDaysAgo.toISOString().split('T')[0];
            }

            if (!params.date_to) {
                params.date_to = new Date().toISOString().split('T')[0];
            }

            console.log(`🔄 Starting PO sync: ${params.date_from} to ${params.date_to}`);

            // Fetch PO list
            const poList = await this.fetchPOList(params);

            // Sync each PO
            for (const po of poList) {
                const syncResult = await this.syncSinglePO(po.PO_Number);

                result.details.push({
                    po_number: po.PO_Number,
                    status: syncResult.status,
                    message: syncResult.message
                });

                if (syncResult.status === 'created') {
                    result.synced++;
                } else if (syncResult.status === 'error') {
                    result.errors.push(`${po.PO_Number}: ${syncResult.message}`);
                }
            }

            console.log(`✅ Sync complete: ${result.synced} new POs, ${result.errors.length} errors`);

        } catch (error: any) {
            result.success = false;
            result.errors.push(error.message);
            console.error('❌ Sync failed:', error);
        }

        return result;
    }
}

export default POSyncService;
