/**
 * MIRROR Supabase → Local PostgreSQL
 * - Pagination (bypasses 1000-row limit)
 * - TRUNCATE + INSERT inside a transaction per table
 * - Verifies row count match after each table
 *
 * Safety:
 *  - pg_dump backup should be taken BEFORE running this.
 *  - Transaction auto-rolls back on any error per table.
 *  - Foreign keys handled via session_replication_role = replica.
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
    password: 'postgres123',
});

const PAGE_SIZE = 1000;

const TABLES = [
    'inventory_items',
    'inventory_movements',
    'products',
    'warehouse_locations',
    'users',
    'customer_orders',
    'order_items',
    'inbound_receipts',
    'inbound_receipt_items',
    'warehouses',
    'customers',
    'shipments',
];

// Tables where local-only rows must NOT be deleted during mirror.
// For these, we UPSERT instead of TRUNCATE+INSERT so local-only users
// (e.g. package_staff01 created via AdminPage) survive repeated mirrors.
const PRESERVE_LOCAL_ONLY = new Set(['users']);

function supabaseRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SUPABASE_URL,
            path,
            method: 'GET',
            headers: {
                apikey: ANON_KEY,
                Authorization: `Bearer ${ANON_KEY}`,
                Prefer: 'count=exact',
                Range: `0-${PAGE_SIZE - 1}`,
            },
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const rows = JSON.parse(data);
                        // Parse total from Content-Range header: "0-999/2500"
                        const cr = res.headers['content-range'] || '';
                        const total = cr.includes('/') ? parseInt(cr.split('/')[1], 10) : rows.length;
                        resolve({ rows, total });
                    } catch (e) {
                        reject(new Error(`JSON parse: ${e.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 200)}`));
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function fetchAllFromSupabase(table) {
    // First request: also gets total count
    const firstPath = `/rest/v1/${table}?select=*&order=id`;
    const first = await supabaseRequest(firstPath);
    let all = first.rows;
    const total = first.total;

    // Pages from PAGE_SIZE onwards
    let offset = PAGE_SIZE;
    while (offset < total) {
        const path = `/rest/v1/${table}?select=*&order=id`;
        // Use Range header via separate call with custom offset
        const rows = await new Promise((resolve, reject) => {
            const req = https.request(
                {
                    hostname: SUPABASE_URL,
                    path,
                    method: 'GET',
                    headers: {
                        apikey: ANON_KEY,
                        Authorization: `Bearer ${ANON_KEY}`,
                        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
                    },
                },
                (res) => {
                    let data = '';
                    res.on('data', (c) => (data += c));
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(e);
                        }
                    });
                }
            );
            req.on('error', reject);
            req.end();
        });
        if (!rows || rows.length === 0) break;
        all = all.concat(rows);
        offset += PAGE_SIZE;
    }

    return { rows: all, total };
}

async function getLocalColumns(client, table) {
    const res = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = $1 AND table_schema = 'public'
         ORDER BY ordinal_position`,
        [table]
    );
    return res.rows.map((r) => r.column_name);
}

async function mirrorTable(table) {
    console.log(`\n━━━ ${table} ━━━`);

    // 1. Fetch ALL from Supabase
    let supabaseData;
    try {
        supabaseData = await fetchAllFromSupabase(table);
    } catch (err) {
        console.log(`  ⚠️  Skipped (Supabase error): ${err.message}`);
        return { table, status: 'skipped', reason: err.message };
    }
    const supaRows = supabaseData.rows;
    const supaTotal = supabaseData.total;
    console.log(`  📥 Supabase total: ${supaTotal}, fetched: ${supaRows.length}`);

    if (supaRows.length !== supaTotal) {
        console.log(`  ⚠️  Warning: fetched (${supaRows.length}) ≠ total (${supaTotal})`);
    }

    const client = await pool.connect();
    try {
        // 2. Get local columns (to filter out any Supabase-only columns)
        const localCols = await getLocalColumns(client, table);
        if (localCols.length === 0) {
            console.log(`  ⚠️  Table does not exist locally — skipping`);
            return { table, status: 'skipped', reason: 'table not found locally' };
        }

        const preserveLocal = PRESERVE_LOCAL_ONLY.has(table);

        // 3. BEGIN tx + disable FK
        await client.query('BEGIN');
        await client.query(`SET LOCAL session_replication_role = 'replica'`);

        if (!preserveLocal) {
            // Normal mirror: TRUNCATE then INSERT
            await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
        } else {
            console.log(`  🛡️  Preserve mode: UPSERT only (local-only rows kept)`);
        }

        let inserted = 0;
        if (supaRows.length > 0) {
            // Build column list from first row ∩ local columns
            const firstRowCols = Object.keys(supaRows[0]);
            const cols = firstRowCols.filter((c) => localCols.includes(c));
            const colList = cols.map((c) => `"${c}"`).join(', ');

            // For preserve-local tables we need UPSERT (ON CONFLICT DO UPDATE on id)
            // For normal mirror tables, a plain INSERT is enough since we just TRUNCATEd
            const updateSet = preserveLocal
                ? cols.filter((c) => c !== 'id').map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')
                : '';
            const conflictClause = preserveLocal
                ? (updateSet ? `ON CONFLICT (id) DO UPDATE SET ${updateSet}` : `ON CONFLICT (id) DO NOTHING`)
                : '';

            // Batch inserts in chunks of 500
            const CHUNK = 500;
            for (let i = 0; i < supaRows.length; i += CHUNK) {
                const chunk = supaRows.slice(i, i + CHUNK);
                const values = [];
                const placeholders = [];
                let p = 1;
                for (const row of chunk) {
                    const rowPlaceholders = cols.map(() => `$${p++}`);
                    placeholders.push(`(${rowPlaceholders.join(', ')})`);
                    for (const c of cols) values.push(row[c] ?? null);
                }
                const sql = `INSERT INTO "${table}" (${colList}) VALUES ${placeholders.join(', ')} ${conflictClause}`;
                await client.query(sql, values);
                inserted += chunk.length;
            }
        }

        // 4. Verify count
        const { rows: cntRes } = await client.query(`SELECT COUNT(*)::int AS n FROM "${table}"`);
        const localCount = cntRes[0].n;

        if (preserveLocal) {
            // In preserve mode local count >= supabase count (local-only rows are kept)
            if (localCount < supaRows.length) {
                await client.query('ROLLBACK');
                console.log(`  ❌ Count too low — ROLLED BACK. local=${localCount} vs expected≥${supaRows.length}`);
                return { table, status: 'rolled_back', localCount, expected: supaRows.length };
            }
            const localOnly = localCount - supaRows.length;
            await client.query('COMMIT');
            console.log(`  ✅ Mirrored (preserve): ${supaRows.length} upserted, ${localOnly} local-only kept (total ${localCount})`);
            return { table, status: 'ok', count: localCount, supaTotal, localOnly };
        }

        if (localCount !== supaRows.length) {
            await client.query('ROLLBACK');
            console.log(`  ❌ Count mismatch — ROLLED BACK. local=${localCount} vs expected=${supaRows.length}`);
            return { table, status: 'rolled_back', localCount, expected: supaRows.length };
        }

        await client.query('COMMIT');
        console.log(`  ✅ Mirrored: ${localCount} rows (matches Supabase)`);
        return { table, status: 'ok', count: localCount, supaTotal };
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        console.log(`  ❌ Error — ROLLED BACK: ${err.message}`);
        return { table, status: 'error', reason: err.message };
    } finally {
        client.release();
    }
}

(async () => {
    console.log('🪞  MIRROR Supabase → Local PostgreSQL');
    console.log('    (Each table: TRUNCATE + INSERT inside transaction)');
    console.log('━'.repeat(70));

    try {
        const c = await pool.connect();
        await c.query('SELECT 1');
        c.release();
        console.log('✅ Connected to PostgreSQL');
    } catch (err) {
        console.error('❌ PG connection failed:', err.message);
        process.exit(1);
    }

    const results = [];
    for (const t of TABLES) {
        results.push(await mirrorTable(t));
    }

    console.log('\n' + '═'.repeat(70));
    console.log('  FINAL SUMMARY');
    console.log('═'.repeat(70));
    console.log('  Table                        | Local  | Supabase | Status');
    console.log('  ' + '─'.repeat(66));
    for (const r of results) {
        const tableName = r.table.padEnd(28);
        const local = (r.count ?? r.localCount ?? '-').toString().padStart(6);
        const supa = (r.supaTotal ?? r.expected ?? '-').toString().padStart(8);
        const icon =
            r.status === 'ok' ? '✅ ok' :
            r.status === 'skipped' ? `⚠️  ${r.reason}` :
            r.status === 'rolled_back' ? '❌ rolled back' :
            `❌ ${r.reason}`;
        console.log(`  ${tableName} | ${local} | ${supa} | ${icon}`);
    }

    const ok = results.filter((r) => r.status === 'ok').length;
    const bad = results.filter((r) => r.status !== 'ok' && r.status !== 'skipped').length;
    console.log('  ' + '─'.repeat(66));
    console.log(`  Tables mirrored: ${ok}/${TABLES.length}   Failures: ${bad}`);

    await pool.end();
    process.exit(bad > 0 ? 1 : 0);
})();
