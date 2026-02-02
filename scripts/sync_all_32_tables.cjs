/**
 * COMPLETE SYNC - All 32 tables from Supabase to Local PostgreSQL
 */

const https = require('https');
const { Pool } = require('pg');

const SUPABASE_URL = 'ogrcpzzmmudztwjfwjvu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123'
});

// ALL 32 TABLES WITH DATA
const TABLES_WITH_DATA = [
    'backup_products_20250927',        // 392
    'customer_exports',                // 1000
    'customer_orders',                 // 5
    'customers',                       // 28
    'fulfillment_items',               // 9
    'fulfillment_items_multi_location',// 9
    'fulfillment_tasks',               // 5
    'fulfillment_tasks_with_items',    // 5
    'inventory_available',             // 784 (view?)
    'inventory_fifo_order',            // 767 (view?)
    'inventory_items',                 // 784
    'inventory_movements',             // 146
    'location_activity_logs',          // 5
    'location_qr_codes',               // 1000
    'meeting_rooms',                   // 5
    'migration_backup_log',            // 1
    'order_items',                     // 2
    'product_conversion_rates',        // 430
    'products',                        // 427
    'products_summary',                // 427 (view?)
    'products_with_conversions',       // 427 (view?)
    'products_with_counts',            // 427 (view?)
    'reservation_history',             // 1
    'reservation_summary_by_warehouse',// 1 (view?)
    'saved_datasets',                  // 1
    'stock_reservations',              // 1
    'system_events',                   // 1000
    'users',                           // 4
    'users_with_warehouse_view',       // 4 (view?)
    'warehouse_locations',             // 607
    'warehouse_locations_with_inventory', // 607 (view?)
    'warehouses'                       // 7
];

async function fetchFromSupabase(tableName) {
    return new Promise((resolve) => {
        const options = {
            hostname: SUPABASE_URL,
            path: `/rest/v1/${tableName}?select=*`,
            method: 'GET',
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            });
        });

        req.on('error', () => resolve(null));
        req.end();
    });
}

async function ensureTableExists(tableName, sampleRecord) {
    if (!sampleRecord) return false;

    const columns = Object.keys(sampleRecord);
    const columnDefs = columns.map(col => {
        const val = sampleRecord[col];
        let type = 'TEXT';

        if (col === 'id') type = 'UUID PRIMARY KEY DEFAULT gen_random_uuid()';
        else if (col.endsWith('_at') || col.endsWith('_date') || col === 'created' || col === 'updated') type = 'TIMESTAMPTZ';
        else if (typeof val === 'number') {
            if (Number.isInteger(val)) type = 'INTEGER';
            else type = 'DECIMAL(15,4)';
        }
        else if (typeof val === 'boolean') type = 'BOOLEAN';
        else if (val && typeof val === 'object') type = 'JSONB';

        return `"${col}" ${type}`;
    }).join(', ');

    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs})`);
        return true;
    } catch (e) {
        // Table might exist with different schema, try insert anyway
        return true;
    }
}

async function upsertRecords(tableName, records) {
    if (!records || records.length === 0) return { processed: 0, skipped: 0 };

    let processed = 0;
    let skipped = 0;

    for (const record of records) {
        try {
            const columns = Object.keys(record);
            const hasId = columns.includes('id');
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            const columnNames = columns.map(c => `"${c}"`).join(', ');

            let query;
            if (hasId) {
                const updateSet = columns.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');
                if (updateSet) {
                    query = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateSet}`;
                } else {
                    query = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                }
            } else {
                query = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders})`;
            }

            const values = columns.map(col => {
                const val = record[col];
                if (val && typeof val === 'object') return JSON.stringify(val);
                return val;
            });

            await pool.query(query, values);
            processed++;
        } catch (e) {
            skipped++;
        }
    }

    return { processed, skipped };
}

async function main() {
    console.log('='.repeat(70));
    console.log('  COMPLETE SUPABASE → LOCAL SYNC');
    console.log('  (All 32 tables with data)');
    console.log('='.repeat(70));
    console.log(`\nTime: ${new Date().toLocaleString('th-TH')}\n`);

    try {
        await pool.query('SELECT 1');
        console.log('✅ Connected to PostgreSQL!\n');
    } catch (e) {
        console.error('❌ Connection failed:', e.message);
        return;
    }

    const results = [];

    for (const table of TABLES_WITH_DATA) {
        process.stdout.write(`  ${table.padEnd(35)} `);

        const data = await fetchFromSupabase(table);

        if (!data || data.length === 0) {
            console.log('○ empty/no access');
            results.push({ table, supabase: 0, synced: 0, status: 'empty' });
            continue;
        }

        // Ensure table exists
        await ensureTableExists(table, data[0]);

        // Upsert
        const result = await upsertRecords(table, data);

        // Get local count
        let localCount = '?';
        try {
            const countRes = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
            localCount = countRes.rows[0].count;
        } catch (e) { }

        console.log(`✅ ${data.length} → ${localCount} (${result.processed} synced, ${result.skipped} skip)`);
        results.push({ table, supabase: data.length, local: localCount, synced: result.processed, skipped: result.skipped, status: 'ok' });
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('  FINAL SUMMARY');
    console.log('='.repeat(70));

    let totalSupabase = 0;
    let totalLocal = 0;

    console.log('\n  Table                              | Supabase | Local');
    console.log('  ' + '-'.repeat(60));

    for (const r of results) {
        if (r.status === 'ok') {
            totalSupabase += r.supabase;
            totalLocal += parseInt(r.local) || 0;
            console.log(`  ${r.table.padEnd(35)} | ${String(r.supabase).padStart(8)} | ${String(r.local).padStart(8)}`);
        }
    }

    console.log('  ' + '-'.repeat(60));
    console.log(`  TOTAL                              | ${String(totalSupabase).padStart(8)} | ${String(totalLocal).padStart(8)}`);

    console.log('\n✅ Complete sync finished!');
    await pool.end();
}

main().catch(e => {
    console.error('Error:', e);
    pool.end();
});
