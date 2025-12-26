
import { getConnection } from './config/database';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        console.log('Start Test...');
        const pool = await getConnection();
        console.log('Connected!');
        const res = await pool.request().query('SELECT 1 as val');
        console.log('Result:', res.recordset[0]);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit(0);
    }
}
test();
