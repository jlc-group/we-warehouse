/**
 * Create Sample Pick Orders for Mobile Testing
 * Run with: node scripts/create_sample_orders.cjs
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123'
});

async function createSampleOrders() {
    const client = await pool.connect();

    try {
        console.log('📦 Creating sample pick orders...\n');

        // Get some real inventory items with locations
        const invResult = await client.query(`
            SELECT id, sku, product_name, location, unit_level1_quantity, unit_level3_quantity
            FROM inventory_items 
            WHERE location IS NOT NULL AND location != ''
            AND (unit_level1_quantity > 0 OR unit_level3_quantity > 0)
            LIMIT 5
        `);

        if (invResult.rows.length === 0) {
            console.log('❌ No inventory items with stock found!');
            return;
        }

        console.log('📊 Found inventory items:');
        invResult.rows.forEach(item => {
            console.log(`   ${item.location}: ${item.product_name.substring(0, 40)}...`);
        });

        // Create a new test order
        const orderNumber = `PICK-${Date.now()}`;
        const orderResult = await client.query(`
            INSERT INTO customer_orders (
                order_number, order_date, order_type, priority, status, 
                total_amount, final_amount, currency, notes
            ) VALUES (
                $1, NOW(), 'SALE', 'HIGH', 'PENDING',
                5000, 5000, 'THB', 'ออเดอร์ทดสอบสำหรับ Mobile Pick'
            )
            RETURNING id, order_number
        `, [orderNumber]);

        const orderId = orderResult.rows[0].id;
        console.log(`\n✅ Created order: ${orderNumber}`);

        // Add items from inventory to order
        let lineNumber = 1;
        for (const inv of invResult.rows.slice(0, 3)) { // Take first 3 items
            const qty = Math.min(5, inv.unit_level3_quantity || inv.unit_level1_quantity || 1);

            await client.query(`
                INSERT INTO order_items (
                    order_id, line_number, sku, product_name, 
                    inventory_item_id, location,
                    ordered_quantity_level1, ordered_quantity_level2, ordered_quantity_level3,
                    picked_quantity_level1, picked_quantity_level2, picked_quantity_level3,
                    unit_level1_name, unit_level2_name, unit_level3_name,
                    unit_price, line_total, status
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    0, 0, $7,
                    0, 0, 0,
                    'ลัง', 'กล่อง', 'ชิ้น',
                    100, $7 * 100, 'PENDING'
                )
            `, [orderId, lineNumber, inv.sku, inv.product_name, inv.id, inv.location, qty]);

            console.log(`   ➕ Added: ${qty} pcs from ${inv.location}`);
            lineNumber++;
        }

        // Create second order for testing
        const orderNumber2 = `PICK-${Date.now() + 1}`;
        const orderResult2 = await client.query(`
            INSERT INTO customer_orders (
                order_number, order_date, order_type, priority, status, 
                total_amount, final_amount, currency, notes
            ) VALUES (
                $1, NOW(), 'SALE', 'NORMAL', 'PENDING',
                3000, 3000, 'THB', 'ออเดอร์ทดสอบ #2'
            )
            RETURNING id, order_number
        `, [orderNumber2]);

        const orderId2 = orderResult2.rows[0].id;
        console.log(`\n✅ Created order: ${orderNumber2}`);

        // Add remaining items to second order
        lineNumber = 1;
        for (const inv of invResult.rows.slice(3, 5)) {
            const qty = Math.min(3, inv.unit_level3_quantity || inv.unit_level1_quantity || 1);

            await client.query(`
                INSERT INTO order_items (
                    order_id, line_number, sku, product_name, 
                    inventory_item_id, location,
                    ordered_quantity_level1, ordered_quantity_level2, ordered_quantity_level3,
                    picked_quantity_level1, picked_quantity_level2, picked_quantity_level3,
                    unit_level1_name, unit_level2_name, unit_level3_name,
                    unit_price, line_total, status
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    0, 0, $7,
                    0, 0, 0,
                    'ลัง', 'กล่อง', 'ชิ้น',
                    100, $7 * 100, 'PENDING'
                )
            `, [orderId2, lineNumber, inv.sku, inv.product_name, inv.id, inv.location, qty]);

            console.log(`   ➕ Added: ${qty} pcs from ${inv.location}`);
            lineNumber++;
        }

        console.log('\n' + '='.repeat(50));
        console.log('🎉 Sample orders created successfully!\n');
        console.log('📱 ทดสอบได้ที่ Mobile Pick:');
        console.log(`   Order 1: ${orderNumber}`);
        console.log(`   Order 2: ${orderNumber2}`);
        console.log('\n💡 วิธีทดสอบ:');
        console.log('   1. ไปที่ http://localhost:5178/mobile/pick');
        console.log(`   2. พิมพ์ ${orderNumber}`);
        console.log('   3. จะเห็นรายการสินค้าพร้อม Location');
        console.log('   4. กดที่รายการเพื่อ Pick');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

createSampleOrders();
