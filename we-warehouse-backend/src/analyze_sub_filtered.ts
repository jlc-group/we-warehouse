
import { getConnection, sql } from './config/database';

async function analyzeSubFiltered() {
    try {
        const pool = await getConnection();

        console.log('\n--- DEBUG: Details with PRODUCTSET Filter (2025) ---');

        // Filter out PRODUCTSET = 2 (Components)
        // We keep PRODUCTSET = 0 (Normal items) and PRODUCTSET = 1 (Parent items)
        // Assuming 0 = Single Item, 1 = Parent Set, 2 = Component

        // Note: We need to check what normal items have. 
        // Let's check a normal item first.

        const result = await pool.request().query(`
      SELECT 
        SUM(
          CASE 
            WHEN LEFT(h.DOCNO, 2) IN ('CN', 'CS') THEN -CAST(d.NETAMOUNT as DECIMAL(18,2))
            ELSE CAST(d.NETAMOUNT as DECIMAL(18,2))
          END
        ) as NetPreVat
      FROM CSSALESUB d
      JOIN CSSALE h ON d.DOCNO = h.DOCNO
      WHERE YEAR(h.DOCDATE) = 2025
        AND h.CANCELDATE IS NULL
        AND (d.PRODUCTSET IS NULL OR d.PRODUCTSET != 2)
    `);

        console.table(result.recordset);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

analyzeSubFiltered();
