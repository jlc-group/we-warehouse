/**
 * Update location data for testing LocationTasks page
 */
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123'
});

async function updateLocations() {
    const client = await pool.connect();
    try {
        // Update inbound_receipt_items with locations
        await client.query(`
            UPDATE inbound_receipt_items 
            SET location = 'J5/4' 
            WHERE location IS NULL
        `);
        console.log('✅ Updated inbound_receipt_items');

        // Check what we have
        const receipts = await client.query(`
            SELECT ir.document_number, iri.product_name, iri.location, iri.quantity_expected, iri.quantity_received
            FROM inbound_receipts ir
            JOIN inbound_receipt_items iri ON ir.id = iri.receipt_id
            LIMIT 5
        `);
        console.log('\n📦 Inbound Items with Location:');
        receipts.rows.forEach(r => {
            console.log(`  ${r.location}: ${r.product_name?.substring(0, 30)}... (${r.quantity_expected - r.quantity_received} pending)`);
        });

        // Check order_items with pending status
        const picks = await client.query(`
            SELECT oi.location, oi.product_name, oi.ordered_quantity_level3, co.order_number
            FROM order_items oi
            JOIN customer_orders co ON oi.order_id = co.id
            WHERE oi.status = 'PENDING' AND oi.location IS NOT NULL
            LIMIT 5
        `);
        console.log('\n📋 Pick Tasks by Location:');
        picks.rows.forEach(r => {
            console.log(`  ${r.location}: ${r.product_name?.substring(0, 30)}... qty=${r.ordered_quantity_level3} [${r.order_number}]`);
        });

        console.log('\n🧪 ทดสอบได้ที่: http://localhost:5178/mobile/tasks');
        console.log('   สแกน Location: J5/3, J5/4, I1/3, I8/4, R5/2\n');

    } finally {
        client.release();
        await pool.end();
    }
}

updateLocations();
