/**
 * Shipment Sync Service
 * ดึงข้อมูล invoices/orders จาก JHCSMILE (SQL Server) มาใส่ shipment_orders (PostgreSQL)
 */
import { getConnection } from '../config/database.js';
import { getLocalPool } from '../config/localDatabase.js';

interface JLCInvoice {
    TAXNO: string;
    DOCNO: string;
    TAXDATE: Date;
    ARCODE: string;
    ARNAME: string;
    TOTAL: number;
    ITEMCOUNT: number;
}

interface SyncResult {
    success: boolean;
    synced: number;
    skipped: number;
    errors: string[];
}

export class ShipmentSyncService {

    /**
     * Sync invoices from JHCSMILE to local shipment_orders
     */
    static async syncFromJLC(options: {
        date_from?: string;
        date_to?: string;
        top?: number;
    } = {}): Promise<SyncResult> {
        const result: SyncResult = {
            success: true,
            synced: 0,
            skipped: 0,
            errors: []
        };

        try {
            console.log('🔄 Starting shipment sync from JHCSMILE...');

            // Get MSSQL connection
            const mssqlPool = await getConnection();
            const localPool = getLocalPool();

            // Build query - adjust table name based on actual JHCSMILE schema
            // Common table names: ARTRAN, INVOICE, SALEHEAD, etc.
            let query = `
                SELECT TOP ${options.top || 50}
                    TAXNO,
                    DOCNO,
                    TAXDATE,
                    ARCODE,
                    ARNAME,
                    CAST(TOTAL AS FLOAT) AS TOTAL,
                    (SELECT COUNT(*) FROM SALELINE WHERE SALELINE.DOCNO = SALEHEAD.DOCNO) AS ITEMCOUNT
                FROM SALEHEAD
                WHERE 1=1
            `;

            if (options.date_from) {
                query += ` AND TAXDATE >= '${options.date_from}'`;
            }
            if (options.date_to) {
                query += ` AND TAXDATE <= '${options.date_to}'`;
            }

            // Default: last 7 days
            if (!options.date_from && !options.date_to) {
                query += ` AND TAXDATE >= DATEADD(day, -7, GETDATE())`;
            }

            query += ` ORDER BY TAXDATE DESC`;

            console.log('📝 Query:', query);

            const mssqlResult = await mssqlPool.request().query(query);
            const invoices: JLCInvoice[] = mssqlResult.recordset;

            console.log(`📦 Found ${invoices.length} invoices from JHCSMILE`);

            // Insert each invoice into local shipment_orders
            for (const inv of invoices) {
                try {
                    // Format date
                    const taxdate = inv.TAXDATE instanceof Date
                        ? inv.TAXDATE.toISOString().split('T')[0]
                        : inv.TAXDATE;

                    await localPool.query(`
                        INSERT INTO shipment_orders (taxno, docno, taxdate, arcode, arname, total_amount, item_count, status)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                        ON CONFLICT (taxno, docno) DO UPDATE SET
                            arname = EXCLUDED.arname,
                            total_amount = EXCLUDED.total_amount,
                            item_count = EXCLUDED.item_count,
                            updated_at = NOW()
                    `, [
                        inv.TAXNO,
                        inv.DOCNO,
                        taxdate,
                        inv.ARCODE,
                        inv.ARNAME,
                        inv.TOTAL || 0,
                        inv.ITEMCOUNT || 0
                    ]);

                    result.synced++;
                    console.log(`  ✅ ${inv.DOCNO} - ${inv.ARNAME}`);
                } catch (err: any) {
                    result.errors.push(`${inv.DOCNO}: ${err.message}`);
                    result.skipped++;
                }
            }

            console.log(`\n🎉 Sync completed: ${result.synced} synced, ${result.skipped} skipped`);

        } catch (error: any) {
            console.error('❌ Sync error:', error.message);
            result.success = false;
            result.errors.push(error.message);
        }

        return result;
    }
}
