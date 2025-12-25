
import { getConnection, sql } from './config/database';

async function analyzeSubJoinWithCN() {
    try {
        const pool = await getConnection();

        console.log('\n--- DEBUG: Details Breakdown with Join & CN Subtraction (2025) ---');

        // We assume NETAMOUNT is Pre-VAT. Legacy total might be Pre-VAT or Post-VAT.
        // Let's calculate both.

        const result = await pool.request().query(`
      SELECT 
        SUM(
          CASE 
            WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.NETAMOUNT as DECIMAL(18,2))
            ELSE CAST(d.NETAMOUNT as DECIMAL(18,2))
          END
        ) as NetPreVat,
        SUM(
          CASE 
            WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.NETAMOUNT as DECIMAL(18,2)) * 1.07
            ELSE CAST(d.NETAMOUNT as DECIMAL(18,2)) * 1.07
          END
        ) as NetIncVat
      FROM CSSALESUB d
      JOIN CSSALE h ON d.DOCNO = h.DOCNO
      WHERE YEAR(h.DOCDATE) = 2025
        AND h.CANCELDATE IS NULL
    `);
        const row = result.recordset[0];
        console.table(row);

        const legacyTotal = 3984232832.5; // From previous step
        const diffPre = row.NetPreVat - legacyTotal;
        const diffInc = row.NetIncVat - legacyTotal;

        console.log(`\nLegacy Total:       ${legacyTotal.toLocaleString()}`);
        console.log(`Local Pre-VAT:      ${row.NetPreVat.toLocaleString()} (Diff: ${diffPre.toLocaleString()})`);
        console.log(`Local Inc-VAT:      ${row.NetIncVat.toLocaleString()} (Diff: ${diffInc.toLocaleString()})`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

analyzeSubJoinWithCN();
