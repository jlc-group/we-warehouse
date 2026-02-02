/**
 * Import Supabase Data to Local PostgreSQL
 * Uses correct credentials and handles UPSERT
 */

const https = require('https');
const { Pool } = require('pg');

const SUPABASE_URL = 'ogrcpzzmmudztwjfwjvu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

// CORRECT credentials from user
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123'
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

async function upsertRecords(tableName, records) {
    if (!records || records.length === 0) return { inserted: 0, updated: 0, skipped: 0 };

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const record of records) {
        try {
            const columns = Object.keys(record);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
            const columnNames = columns.map(c => `"${c}"`).join(', ');
            const updateSet = columns.filter(c => c !== 'id').map(c => `"${c}" = EXCLUDED."${c}"`).join(', ');

            const query = `
                INSERT INTO "${tableName}" (${columnNames})
                VALUES (${placeholders})
                ON CONFLICT (id) DO UPDATE SET ${updateSet}
            `;

            const values = columns.map(col => {
                const val = record[col];
                if (val && typeof val === 'object') return JSON.stringify(val);
                return val;
            });

            const result = await pool.query(query, values);
            if (result.rowCount > 0) {
                inserted++;
            }
        } catch (e) {
            // Try simple insert
            try {
                const columns = Object.keys(record);
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                const columnNames = columns.map(c => `"${c}"`).join(', ');

                const query = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

                const values = columns.map(col => {
                    const val = record[col];
                    if (val && typeof val === 'object') return JSON.stringify(val);
                    return val;
                });

                await pool.query(query, values);
                inserted++;
            } catch (e2) {
                skipped++;
                if (skipped <= 3) {
                    console.log(`    Skip: ${e2.message.substring(0, 80)}`);
                }
            }
        }
    }

    return { inserted, updated, skipped };
}

async function main() {
    console.log('='.repeat(60));
    console.log('  SUPABASE → LOCAL POSTGRESQL SYNC');
    console.log('='.repeat(60));
    console.log(`\nTime: ${new Date().toLocaleString('th-TH')}\n`);

    // Test connection
    try {
        await pool.query('SELECT 1');
        console.log('✅ Connected to PostgreSQL successfully!\n');
    } catch (e) {
        console.error('❌ Failed to connect:', e.message);
        return;
    }

    const tables = [
        'inventory_items',
        'inventory_movements',
        'products',
        'warehouse_locations',
        'users',
        'customer_orders',
        'order_items'
    ];

    console.log('📊 Current Local DB Status:');
    for (const table of tables) {
        try {
            const result = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
            console.log(`  ${table.padEnd(25)} : ${result.rows[0].count} records`);
        } catch (e) {
            console.log(`  ${table.padEnd(25)} : table not found`);
        }
    }

    console.log('\n🚀 Starting sync from Supabase...\n');

    const results = [];

    for (const table of tables) {
        console.log(`━━━ Syncing: ${table} ━━━`);

        // Fetch from Supabase
        console.log('  Fetching from Supabase...');
        const data = await fetchFromSupabase(table);

        if (data === null) {
            console.log('  ⚠️ Table not found in Supabase');
            continue;
        }

        console.log(`  Found ${data.length} records in Supabase`);

        if (data.length > 0) {
            console.log('  Upserting to local PostgreSQL...');
            const result = await upsertRecords(table, data);
            console.log(`  ✅ Done: ${result.inserted} processed, ${result.skipped} skipped`);
            results.push({ table, supabase: data.length, ...result });
        } else {
            results.push({ table, supabase: 0, inserted: 0, skipped: 0 });
        }

        console.log('');
    }

    // Final counts
    console.log('='.repeat(60));
    console.log('  FINAL RESULTS');
    console.log('='.repeat(60));

    for (const table of tables) {
        try {
            const result = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
            console.log(`  ${table.padEnd(25)} : ${result.rows[0].count} records`);
        } catch (e) {
            console.log(`  ${table.padEnd(25)} : error`);
        }
    }

    console.log('\n✅ Sync complete!');
    await pool.end();
}

main().catch(e => {
    console.error('Error:', e);
    pool.end();
});
