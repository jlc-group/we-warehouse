/**
 * Complete Supabase to Local Sync - ALL TABLES
 * Syncs all discovered tables from Supabase
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

// ALL tables found in Supabase
const ALL_TABLES = [
    'inventory_items',
    'inventory_movements',
    'products',
    'warehouse_locations',
    'users',
    'customer_orders',
    'order_items',
    'inbound_receipts',
    'inbound_receipt_items',
    'warehouses',      // 7 records - NEW!
    'customers',       // 28 records - NEW!
    'shipments'        // 0 records
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
        else if (col.endsWith('_at') || col.endsWith('_date')) type = 'TIMESTAMPTZ';
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
        console.log(`    Table creation error: ${e.message}`);
        return false;
    }
}

async function upsertRecords(tableName, records) {
    if (!records || records.length === 0) return { processed: 0, skipped: 0 };

    let processed = 0;
    let skipped = 0;

    for (const record of records) {
        try {
            const columns = Object.keys(record);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            const columnNames = columns.map(c => `"${c}"`).join(', ');
            const updateSet = columns.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');

            let query;
            if (updateSet) {
                query = `
                    INSERT INTO "${tableName}" (${columnNames})
                    VALUES (${placeholders})
                    ON CONFLICT (id) DO UPDATE SET ${updateSet}
                `;
            } else {
                query = `
                    INSERT INTO "${tableName}" (${columnNames})
                    VALUES (${placeholders})
                    ON CONFLICT (id) DO NOTHING
                `;
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
            if (skipped <= 2) {
                console.log(`    Error: ${e.message.substring(0, 100)}`);
            }
        }
    }

    return { processed, skipped };
}

async function main() {
    console.log('='.repeat(70));
    console.log('  COMPLETE SUPABASE → LOCAL POSTGRESQL SYNC');
    console.log('  (ALL 12 TABLES)');
    console.log('='.repeat(70));
    console.log(`\nTime: ${new Date().toLocaleString('th-TH')}\n`);

    // Test connection
    try {
        await pool.query('SELECT 1');
        console.log('✅ Connected to PostgreSQL!\n');
    } catch (e) {
        console.error('❌ Connection failed:', e.message);
        return;
    }

    const results = [];

    for (const table of ALL_TABLES) {
        console.log(`\n━━━ ${table} ━━━`);

        // Fetch from Supabase
        const data = await fetchFromSupabase(table);

        if (data === null) {
            console.log('  ⚠️ Not found in Supabase');
            results.push({ table, supabase: 0, synced: 0, status: 'not found' });
            continue;
        }

        console.log(`  📥 Supabase: ${data.length} records`);

        if (data.length === 0) {
            results.push({ table, supabase: 0, synced: 0, status: 'empty' });
            continue;
        }

        // Ensure table exists
        const tableCreated = await ensureTableExists(table, data[0]);
        if (!tableCreated) {
            console.log('  ⚠️ Could not create/verify table');
        }

        // Upsert records
        const result = await upsertRecords(table, data);
        console.log(`  ✅ Synced: ${result.processed}, Skipped: ${result.skipped}`);

        // Verify local count
        try {
            const countResult = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
            console.log(`  📊 Local DB: ${countResult.rows[0].count} records`);
            results.push({ table, supabase: data.length, synced: result.processed, local: parseInt(countResult.rows[0].count), status: 'ok' });
        } catch (e) {
            results.push({ table, supabase: data.length, synced: result.processed, local: '?', status: 'verify error' });
        }
    }

    // Final Summary
    console.log('\n' + '='.repeat(70));
    console.log('  FINAL SUMMARY');
    console.log('='.repeat(70));
    console.log('\n  Table                        | Supabase | Local  | Status');
    console.log('  ' + '-'.repeat(66));

    results.forEach(r => {
        const statusIcon = r.status === 'ok' ? '✅' : (r.status === 'empty' ? '○' : '⚠️');
        console.log(`  ${r.table.padEnd(28)} | ${String(r.supabase).padStart(8)} | ${String(r.local || r.synced).padStart(6)} | ${statusIcon}`);
    });

    const totalSupabase = results.reduce((acc, r) => acc + r.supabase, 0);
    const totalLocal = results.filter(r => r.local).reduce((acc, r) => acc + (parseInt(r.local) || 0), 0);

    console.log('  ' + '-'.repeat(66));
    console.log(`  TOTAL                        | ${String(totalSupabase).padStart(8)} | ${String(totalLocal).padStart(6)} |`);

    console.log('\n✅ Complete sync finished!');
    await pool.end();
}

main().catch(e => {
    console.error('Error:', e);
    pool.end();
});
