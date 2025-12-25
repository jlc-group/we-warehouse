
import { getConnection, sql } from './config/database';

async function checkCN2024() {
    try {
        const pool = await getConnection();

        console.log("--- Checking CN/CS for Year 2024 ---");

        // Query using the REFIRMED logic:
        // 1. Source: CSSALESUB (joined with CSSALE for date/cancel status)
        // 2. Filter: PRODUCTSET != 2 (to avoid double counting)
        // 3. Prefix: CN or CS
        const result = await pool.request().query(`
      SELECT 
        LEFT(h.DOCNO, 2) as docPrefix,
        COUNT(DISTINCT h.DOCNO) as docCount,
        SUM(d.NETAMOUNT) as totalNet
      FROM CSSALESUB d
      JOIN CSSALE h ON d.DOCNO = h.DOCNO
      WHERE h.DOCDATE >= '2024-01-01' AND h.DOCDATE <= '2024-12-31'
      AND h.CANCELDATE IS NULL
      AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
      AND LEFT(h.DOCNO, 2) IN ('CS', 'CN')
      GROUP BY LEFT(h.DOCNO, 2)
    `);

        console.table(result.recordset);

        // Calculate Grand Total
        const total = result.recordset.reduce((acc, row) => acc + (row.totalNet || 0), 0);
        const count = result.recordset.reduce((acc, row) => acc + (row.docCount || 0), 0);

        console.log(`\nGRAND TOTAL 2024 CN/CS: ${total.toLocaleString()} THB (Docs: ${count})`);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}
checkCN2024();
