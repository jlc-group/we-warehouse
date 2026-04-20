/**
 * Insert Sample Data for Mobile Testing
 * Run with: node scripts/insert_sample_data.cjs
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123'
});

async function insertSampleData() {
    const client = await pool.connect();

    try {
        console.log('📦 Inserting sample inbound receipt...');

        // Create sample inbound receipt (PO)
        const receiptResult = await client.query(`
            INSERT INTO inbound_receipts (document_number, supplier_name, status, total_items, notes)
            VALUES ('PO-2026-0001', 'บริษัท ซัพพลาย จำกัด', 'pending', 3, 'ใบสั่งซื้อทดสอบ')
            ON CONFLICT (document_number) DO NOTHING
            RETURNING id
        `);

        if (receiptResult.rows.length > 0) {
            const receiptId = receiptResult.rows[0].id;
            console.log('✅ Created receipt:', receiptId);

            // Insert receipt items
            await client.query(`
                INSERT INTO inbound_receipt_items (receipt_id, product_code, product_name, quantity_expected, quantity_received)
                VALUES 
                    ($1, 'SCH-T5A-2G_M01', 'ซองบรรจุ วอเตอร์เมลอน แทททู ลิป เซรั่ม 01', 100, 0),
                    ($1, 'BOX-L8A-6G-M01_WHT', 'กล่องบรรจุ วอเตอร์เมลอน อีอี คูชั่น แมตต์', 50, 0),
                    ($1, 'SET-BEAUTY-001', 'เซ็ตความงาม ของขวัญ', 30, 0)
            `, [receiptId]);

            console.log('✅ Created 3 receipt items');
        } else {
            console.log('ℹ️ Receipt PO-2026-0001 already exists');
        }

        // Create another sample PO
        const receipt2Result = await client.query(`
            INSERT INTO inbound_receipts (document_number, supplier_name, status, total_items, notes)
            VALUES ('PO-2026-0002', 'โรงงาน ABC', 'pending', 2, 'สินค้าใหม่จากโรงงาน')
            ON CONFLICT (document_number) DO NOTHING
            RETURNING id
        `);

        if (receipt2Result.rows.length > 0) {
            const receipt2Id = receipt2Result.rows[0].id;
            console.log('✅ Created receipt2:', receipt2Id);

            await client.query(`
                INSERT INTO inbound_receipt_items (receipt_id, product_code, product_name, quantity_expected, quantity_received)
                VALUES 
                    ($1, 'NEW-PROD-001', 'สินค้าใหม่ A', 200, 0),
                    ($1, 'NEW-PROD-002', 'สินค้าใหม่ B', 150, 0)
            `, [receipt2Id]);

            console.log('✅ Created 2 receipt items for PO-2026-0002');
        }

        console.log('\n📊 Summary:');

        const receiptsCount = await client.query('SELECT COUNT(*) as count FROM inbound_receipts');
        const itemsCount = await client.query('SELECT COUNT(*) as count FROM inbound_receipt_items');

        console.log(`   inbound_receipts: ${receiptsCount.rows[0].count}`);
        console.log(`   inbound_receipt_items: ${itemsCount.rows[0].count}`);

        console.log('\n✅ Sample data inserted successfully!');
        console.log('\n💡 ทดสอบได้ที่ Mobile App:');
        console.log('   /mobile/receive → สแกน PO-2026-0001 หรือ PO-2026-0002');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

insertSampleData();
