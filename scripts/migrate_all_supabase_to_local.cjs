/**
 * Complete Supabase to Local PostgreSQL Migration Script
 * Exports all data from Supabase cloud and imports to local PostgreSQL
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
    password: 'postgres'
});

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
                        const parsed = JSON.parse(data);
                        resolve(parsed);
                    } catch (e) {
                        console.log(`  Parse error for ${tableName}`);
                        resolve([]);
                    }
                } else {
                    resolve(null); // Table doesn't exist
                }
            });
        });

        req.on('error', (e) => {
            console.log(`  Error fetching ${tableName}: ${e.message}`);
            resolve([]);
        });
        req.end();
    });
}

// Generic table insert function
async function upsertRecords(tableName, records) {
    if (!records || records.length === 0) return { inserted: 0, skipped: 0 };

    let inserted = 0;
    let skipped = 0;

    for (const record of records) {
        try {
            const columns = Object.keys(record);
            const values = columns.map((_, i) => `$${i + 1}`).join(', ');
            const columnNames = columns.map(c => `"${c}"`).join(', ');

            const query = `
                INSERT INTO "${tableName}" (${columnNames})
                VALUES (${values})
                ON CONFLICT (id) DO UPDATE SET
                ${columns.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')}
            `;

            const recordValues = columns.map(col => {
                const val = record[col];
                if (val && typeof val === 'object') return JSON.stringify(val);
                return val;
            });

            await pool.query(query, recordValues);
            inserted++;
        } catch (e) {
            // Try insert without upsert
            try {
                const columns = Object.keys(record);
                const values = columns.map((_, i) => `$${i + 1}`).join(', ');
                const columnNames = columns.map(c => `"${c}"`).join(', ');

                const query = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${values}) ON CONFLICT DO NOTHING`;

                const recordValues = columns.map(col => {
                    const val = record[col];
                    if (val && typeof val === 'object') return JSON.stringify(val);
                    return val;
                });

                await pool.query(query, recordValues);
                inserted++;
            } catch (e2) {
                skipped++;
            }
        }
    }

    return { inserted, skipped };
}

async function main() {
    console.log('='.repeat(60));
    console.log('  SUPABASE → LOCAL POSTGRESQL MIGRATION');
    console.log('='.repeat(60));
    console.log(`\nTime: ${new Date().toLocaleString('th-TH')}\n`);

    // Tables to check and migrate
    const tablesToCheck = [
        'inventory_items',
        'inventory_movements',
        'products',
        'warehouse_locations',
        'users',
        'customer_orders',
        'order_items',
        'inbound_receipts',
        'inbound_receipt_items',
        'stock_movements',
        'event_logs',
        'settings'
    ];

    console.log('📊 Checking Supabase tables (using GET method)...\n');

    const tableSummary = [];

    for (const table of tablesToCheck) {
        const data = await fetchFromSupabase(table);
        const exists = data !== null;
        const count = exists ? data.length : 0;

        tableSummary.push({ table, count, exists, data });
        const status = count > 0 ? '✓' : (exists ? '○' : '✗');
        console.log(`  ${status} ${table.padEnd(25)} : ${exists ? count + ' records' : 'not found'}`);
    }

    const tablesToMigrate = tableSummary.filter(t => t.count > 0);

    if (tablesToMigrate.length === 0) {
        console.log('\n❌ No data found in Supabase to migrate!');
        await pool.end();
        return;
    }

    console.log(`\n📦 Found ${tablesToMigrate.length} tables with data to migrate:`);
    tablesToMigrate.forEach(t => console.log(`   - ${t.table} (${t.count} records)`));

    console.log('\n🚀 Starting migration...\n');

    const results = [];

    for (const { table, count, data } of tablesToMigrate) {
        console.log(`\n━━━ Migrating: ${table} (${count} records) ━━━`);

        if (data && data.length > 0) {
            // Insert/Update to local DB
            console.log('  Inserting to local PostgreSQL...');
            const result = await upsertRecords(table, data);
            console.log(`  ✅ Inserted/Updated: ${result.inserted}, Skipped: ${result.skipped}`);
            results.push({ table, ...result, total: count });
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('  MIGRATION SUMMARY');
    console.log('='.repeat(60));

    for (const r of results) {
        console.log(`  ${r.table}: ${r.inserted}/${r.total} migrated`);
    }

    // Verify local counts
    console.log('\n📊 Verification - Local DB counts:');
    for (const { table } of tablesToMigrate) {
        try {
            const result = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
            console.log(`  ${table}: ${result.rows[0].count}`);
        } catch (e) {
            console.log(`  ${table}: (table may not exist in local)`);
        }
    }

    console.log('\n✅ Migration complete!');
    await pool.end();
}

main().catch(e => {
    console.error('Migration failed:', e);
    pool.end();
});
