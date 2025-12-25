
import { getConnection, sql } from './config/database';

async function analyzeDocTypes() {
    try {
        const pool = await getConnection();

        console.log('\n--- DEBUG: Breakdown by DocType (2025) ---');
        const result = await pool.request().query(`
      SELECT 
        LEFT(DOCNO, 2) as DocPrefix,
        COUNT(*) as DocCount,
        SUM(CAST(TOTALAMOUNT as DECIMAL(18,2))) as SumTotalAmount,
        SUM(CAST(SUMAMOUNT1 as DECIMAL(18,2))) as SumPreVat
      FROM CSSALE
      WHERE YEAR(DOCDATE) = 2025 
        AND CANCELDATE IS NULL
      GROUP BY LEFT(DOCNO, 2)
      ORDER BY SumTotalAmount DESC
    `);
        console.table(result.recordset);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

analyzeDocTypes();
