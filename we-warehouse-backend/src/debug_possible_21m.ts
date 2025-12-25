
import { getConnection, sql } from './config/database';

async function debug21M() {
    try {
        const pool = await getConnection();

        // Check 2: Total Discounts
        const discounts = await pool.request().query(`
      SELECT SUM(d.DISCAMOUNT) as total
      FROM CSSALESUB d
      JOIN CSSALE h ON d.DOCNO = h.DOCNO
      WHERE h.DOCDATE >= '2025-01-01' AND h.DOCDATE <= '2025-12-31'
      AND h.CANCELDATE IS NULL
    `);
        console.log('Total Discounts:', discounts.recordset[0].total);

    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}
debug21M();
