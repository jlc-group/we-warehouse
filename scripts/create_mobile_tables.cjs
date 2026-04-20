/**
 * Create Mobile Tables Script
 * Run with: node scripts/create_mobile_tables.cjs
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123'
});

const createTablesSql = `
-- Inbound Receipts Table (for receiving goods from suppliers/PO)
CREATE TABLE IF NOT EXISTS inbound_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_number VARCHAR(100) NOT NULL UNIQUE,
    supplier_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    total_items INTEGER DEFAULT 0,
    notes TEXT,
    received_by VARCHAR(255),
    received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inbound Receipt Items Table (line items in receipt)
CREATE TABLE IF NOT EXISTS inbound_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID REFERENCES inbound_receipts(id) ON DELETE CASCADE,
    product_code VARCHAR(100),
    product_name VARCHAR(255),
    quantity_expected INTEGER DEFAULT 0,
    quantity_received INTEGER DEFAULT 0,
    unit_name VARCHAR(50) DEFAULT 'ชิ้น',
    location VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Movements Table (for movementService)
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID,
    sku VARCHAR(100),
    product_name VARCHAR(255),
    location VARCHAR(100),
    location_from VARCHAR(100),
    location_to VARCHAR(100),
    warehouse_id UUID,
    movement_type VARCHAR(50) NOT NULL,
    quantity_change INTEGER DEFAULT 0,
    quantity_before INTEGER DEFAULT 0,
    quantity_after INTEGER DEFAULT 0,
    reference_type VARCHAR(50) DEFAULT 'manual',
    reference_id VARCHAR(100),
    notes TEXT,
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inbound_receipts_document ON inbound_receipts(document_number);
CREATE INDEX IF NOT EXISTS idx_inbound_receipt_items_receipt ON inbound_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at);
`;

async function createTables() {
    try {
        console.log('🔌 Connecting to PostgreSQL...');
        const client = await pool.connect();

        console.log('📋 Creating tables...');
        await client.query(createTablesSql);

        console.log('✅ Tables created successfully!');

        // Verify tables exist
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('inbound_receipts', 'inbound_receipt_items', 'stock_movements')
        `);

        console.log('📊 Verified tables:', result.rows.map(r => r.table_name));

        client.release();
        await pool.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

createTables();
