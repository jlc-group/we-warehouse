/**
 * Supabase to Local PostgreSQL Migration Script
 * Exports data from Supabase cloud and imports to local PostgreSQL
 */

import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
const { Pool } = pg;

// Supabase connection
const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';
const supabase = createClient(supabaseUrl, supabaseKey);

// Local PostgreSQL connection
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres'
});

// Tables to migrate
const TABLES = [
    'users',
    'warehouse_locations',
    'products',
    'inventory_items',
    'inbound_receipts',
    'inbound_receipt_items',
    'customer_orders',
    'order_items',
    'stock_movements',
    'event_logs',
    'settings'
];

async function getTableSchema(tableName) {
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

    if (error) {
        console.log(`Table ${tableName} not found or empty`);
        return null;
    }

    if (!data || data.length === 0) {
        console.log(`Table ${tableName} is empty`);
        return { columns: [], data: [] };
    }

    return { columns: Object.keys(data[0]), sampleData: data[0] };
}

async function exportTable(tableName) {
    console.log(`Exporting ${tableName}...`);

    const { data, error } = await supabase
        .from(tableName)
        .select('*');

    if (error) {
        console.log(`Error exporting ${tableName}: ${error.message}`);
        return [];
    }

    console.log(`  - Found ${data?.length || 0} rows`);
    return data || [];
}

async function createTableIfNotExists(tableName, columns, sampleData) {
    const columnDefs = columns.map(col => {
        const sampleValue = sampleData[col];
        let type = 'TEXT';

        if (col === 'id') type = 'UUID PRIMARY KEY DEFAULT gen_random_uuid()';
        else if (col.endsWith('_at') || col.endsWith('_date')) type = 'TIMESTAMPTZ';
        else if (typeof sampleValue === 'number') {
            if (Number.isInteger(sampleValue)) type = 'INTEGER';
            else type = 'DECIMAL(15,4)';
        }
        else if (typeof sampleValue === 'boolean') type = 'BOOLEAN';
        else if (sampleValue && typeof sampleValue === 'object') type = 'JSONB';

        return `"${col}" ${type}`;
    }).join(',\n  ');

    const createSQL = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${columnDefs}\n);`;

    try {
        await pool.query(createSQL);
        console.log(`  - Created table ${tableName}`);
    } catch (err) {
        console.log(`  - Table ${tableName} may already exist: ${err.message}`);
    }
}

async function importTable(tableName, rows) {
    if (!rows || rows.length === 0) return;

    console.log(`Importing ${rows.length} rows to ${tableName}...`);

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const insertSQL = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

    let imported = 0;
    for (const row of rows) {
        try {
            const values = columns.map(col => {
                const val = row[col];
                if (val && typeof val === 'object') return JSON.stringify(val);
                return val;
            });
            await pool.query(insertSQL, values);
            imported++;
        } catch (err) {
            // Skip duplicates or errors
        }
    }

    console.log(`  - Imported ${imported} rows`);
}

async function migrate() {
    console.log('=== Supabase to Local PostgreSQL Migration ===\n');

    for (const table of TABLES) {
        try {
            const schema = await getTableSchema(table);
            if (!schema) continue;

            const data = await exportTable(table);

            if (data.length > 0) {
                await createTableIfNotExists(table, schema.columns, schema.sampleData);
                await importTable(table, data);
            }

            console.log('');
        } catch (err) {
            console.log(`Error with ${table}: ${err.message}\n`);
        }
    }

    console.log('=== Migration Complete ===');
    await pool.end();
}

migrate().catch(console.error);
