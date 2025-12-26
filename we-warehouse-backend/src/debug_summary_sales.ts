
import { getConnection, sql } from './config/database';
import dotenv from 'dotenv';
dotenv.config();

async function debugSafeSales() {
    try {
        const pool = await getConnection();
        console.log('\n--- Debugging Sales (Excluding PRODUCSET=2) ---');

        // 1. Check for duplicates in SAFE rows (SA/Normal Items)
        // These are the rows that actually contribute to the total.
        console.log('Checking for duplicates in Non-Set items...');
        const dupSafe = await pool.request().query(`
             SELECT DOCNO, LINEID, COUNT(*) as cnt
             FROM CSSALESUB
             WHERE (PRODUCTSET IS NULL OR PRODUCTSET != 2)
             GROUP BY DOCNO, LINEID
             HAVING COUNT(*) > 1
        `);

        if (dupSafe.recordset.length > 0) {
            console.log('!!! FOUND DUPLICATES IN CALCULATED ITEMS !!!');
            console.table(dupSafe.recordset.slice(0, 10));
        } else {
            console.log('✅ No duplicates found in calculated items (ProductSet != 2).');
        }

        // 2. Breakdown of Sales 2025
        const result = await pool.request().query(`
            SELECT 
                LEFT(h.DOCNO, 2) as prefix,
                COUNT(DISTINCT h.DOCNO) as doc_count,
                SUM(CAST(d.NETAMOUNT as DECIMAL(18,2))) as total_net_amount
            FROM CSSALE h
            JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
            WHERE h.DOCDATE >= '2025-01-01' AND h.DOCDATE <= '2025-12-31'
            AND h.CANCELDATE IS NULL
            AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
            GROUP BY LEFT(h.DOCNO, 2)
            ORDER BY total_net_amount DESC
        `);

        console.table(result.recordset);

        // 3. Find specific documents with unusually high value
        console.log('\n--- Top 10 Highest Value Documents (2025) ---');
        const topDocs = await pool.request().query(`
            SELECT TOP 10
                h.DOCNO,
                SUM(d.NETAMOUNT) as doc_total
            FROM CSSALE h
            JOIN CSSALESUB d ON h.DOCNO = d.DOCNO
            WHERE h.DOCDATE >= '2025-01-01' AND h.DOCDATE <= '2025-12-31'
            AND h.CANCELDATE IS NULL
            AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
            GROUP BY h.DOCNO
            ORDER BY doc_total DESC
        `);
        console.table(topDocs.recordset);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
debugSafeSales();
