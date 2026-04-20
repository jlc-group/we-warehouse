// Create test shipment orders for testing Task Assignment
import { Pool } from 'pg';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123'
});

async function createTestOrders() {
    console.log('🔧 Creating test shipment orders...\n');

    const testOrders = [
        {
            taxno: 'TEST2026-001',
            docno: 'DO2026-00001',
            taxdate: '2026-02-04',
            arcode: 'C001',
            arname: 'บริษัท ทดสอบ 1 จำกัด',
            total_amount: 15000,
            item_count: 5,
            status: 'pending'
        },
        {
            taxno: 'TEST2026-002',
            docno: 'DO2026-00002',
            taxdate: '2026-02-04',
            arcode: 'C002',
            arname: 'ร้านค้าปลีก ABC',
            total_amount: 8500,
            item_count: 3,
            status: 'pending'
        },
        {
            taxno: 'TEST2026-003',
            docno: 'DO2026-00003',
            taxdate: '2026-02-04',
            arcode: 'C003',
            arname: 'คุณสมชาย ใจดี',
            total_amount: 2300,
            item_count: 2,
            status: 'pending'
        },
        {
            taxno: 'TEST2026-004',
            docno: 'DO2026-00004',
            taxdate: '2026-02-04',
            arcode: 'C004',
            arname: 'บริษัท XYZ Trading จำกัด',
            total_amount: 45000,
            item_count: 12,
            status: 'pending'
        },
        {
            taxno: 'TEST2026-005',
            docno: 'DO2026-00005',
            taxdate: '2026-02-04',
            arcode: 'C005',
            arname: 'ร้านอาหาร บ้านสวน',
            total_amount: 6800,
            item_count: 4,
            status: 'pending'
        }
    ];

    try {
        for (const order of testOrders) {
            await pool.query(
                `INSERT INTO shipment_orders (taxno, docno, taxdate, arcode, arname, total_amount, item_count, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (taxno, docno) DO NOTHING`,
                [order.taxno, order.docno, order.taxdate, order.arcode, order.arname, order.total_amount, order.item_count, order.status]
            );
            console.log(`✅ Created: ${order.docno} - ${order.arname}`);
        }

        console.log('\n🎉 Test orders created successfully!');

        // Count total
        const { rows } = await pool.query('SELECT COUNT(*) as total FROM shipment_orders');
        console.log(`\n📊 Total orders in database: ${rows[0].total}`);

    } catch (error: any) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

createTestOrders();
