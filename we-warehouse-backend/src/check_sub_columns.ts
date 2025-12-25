
import { getConnection, sql } from './config/database';

async function checkColumns() {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
      SELECT TOP 1 * FROM CSSALESUB
    `);
        console.log("Columns:", Object.keys(result.recordset[0]));
        console.log("Sample Row:", result.recordset[0]);
    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
}
checkColumns();
