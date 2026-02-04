// Check shipment_orders data
import { Pool } from 'pg';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123'
});

async function checkData() {
    console.log('📊 Checking shipment_orders data...\n');

    // Count all orders
    const { rows: countAll } = await pool.query('SELECT COUNT(*) as total FROM shipment_orders');
    console.log(`Total orders: ${countAll[0].total}`);

    // Count by status
    const { rows: byStatus } = await pool.query(`
        SELECT status, COUNT(*) as count FROM shipment_orders GROUP BY status
    `);
    console.log('\nBy Status:');
    byStatus.forEach(r => console.log(`  ${r.status}: ${r.count}`));

    // Count unassigned pending
    const { rows: unassigned } = await pool.query(`
        SELECT COUNT(*) as count FROM shipment_orders 
        WHERE assigned_to IS NULL AND status = 'pending'
    `);
    console.log(`\nUnassigned pending orders: ${unassigned[0].count}`);

    // Sample data
    const { rows: sample } = await pool.query(`
        SELECT docno, arname, status, assigned_to, priority FROM shipment_orders LIMIT 5
    `);
    console.log('\nSample orders:');
    sample.forEach(r => console.log(`  ${r.docno} - ${r.arname} - ${r.status} - assigned: ${r.assigned_to}`));

    await pool.end();
}

checkData().catch(console.error);
