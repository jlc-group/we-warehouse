
import { getConnection, sql } from './config/database';

async function inspectDuplicates() {
    try {
        const pool = await getConnection();

        console.log('\n--- DEBUG: Inspecting SA-681225-001 ---');
        const result = await pool.request().query(`
      SELECT 
        LINEID,
        PRODUCTCODE,
        PRODUCTNAME,
        QUANTITY,
        UNITPRICE,
        NETAMOUNT,
        PRODUCTSET,
        REFLINEID,
        REFDOCNO
      FROM CSSALESUB
      WHERE DOCNO = 'SA-681225-001'
      ORDER BY LINEID
    `);
        console.table(result.recordset);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

inspectDuplicates();
