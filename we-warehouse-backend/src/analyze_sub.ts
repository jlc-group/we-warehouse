
import { getConnection, sql } from './config/database';

async function analyzeSubItems() {
    try {
        const pool = await getConnection();

        console.log('\n--- DEBUG: Details Breakdown (2025) ---');

        // Sum NETAMOUNT from CSSALESUB
        const result = await pool.request().query(`
      SELECT 
        COUNT(*) as ItemCount,
        SUM(CAST(NETAMOUNT as DECIMAL(18,2))) as SumNetAmount,
        SUM(CAST(NETAMOUNT as DECIMAL(18,2)) * 1.07) as EstTotalAmount
      FROM CSSALESUB
      WHERE YEAR(DOCDATE) = 2025
    `);
        console.table(result.recordset);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

analyzeSubItems();
