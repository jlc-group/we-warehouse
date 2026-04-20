/**
 * Sync Local PostgreSQL → Supabase Cloud (Backup)
 *
 * Pushes local data back to Supabase as a backup.
 * Use case: keep Supabase as a snapshot of local DB at any point.
 *
 * Usage:
 *   1. Set credentials below (or via env vars)
 *   2. node scripts/sync_local_to_supabase.cjs              (sync all default tables)
 *   3. node scripts/sync_local_to_supabase.cjs products     (sync only one table)
 *
 * Requires: pg, https (built-in)
 */

const https = require('https');
const { Pool } = require('pg');

// ============ Config ============
const SUPABASE_URL = process.env.SUPABASE_URL || 'ogrcpzzmmudztwjfwjvu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'wewarehouse_local',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres123',
});

// Tables to sync (in dependency order — parents first)
const DEFAULT_TABLES = [
    'departments',
    'roles',
    'users',
    'warehouses',
    'warehouse_locations',
    'products',
    'product_conversion_rates',
    'customers',
    'inventory_items',
    'customer_orders',
    'order_items',
    'inbound_receipts',
    'inbound_receipt_items',
    'fulfillment_tasks',
    'shipment_orders',
    'system_events',
    'location_qr_codes',
];

// ============ Helpers ============

function chunk(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

function supabaseRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const data = body ? JSON.stringify(body) : null;
        const options = {
            hostname: SUPABASE_URL,
            path: `/rest/v1/${path}`,
            method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates,return=minimal',
                ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
            },
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ ok: true, status: res.statusCode });
                } else {
                    resolve({ ok: false, status: res.statusCode, error: body });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

async function syncTable(tableName) {
    console.log(`\n━━━ ${tableName} ━━━`);

    // 1. Read from local
    let rows;
    try {
        const result = await pool.query(`SELECT * FROM "${tableName}"`);
        rows = result.rows;
    } catch (e) {
        console.log(`  ✗ Read local failed: ${e.message}`);
        return { table: tableName, synced: 0, failed: 0, skipped: true };
    }

    if (rows.length === 0) {
        console.log(`  ○ No data (skipped)`);
        return { table: tableName, synced: 0, failed: 0 };
    }

    console.log(`  ↑ Pushing ${rows.length} rows to Supabase...`);

    // 2. Push to Supabase in batches of 100 (avoid payload limit)
    const batches = chunk(rows, 100);
    let synced = 0;
    let failed = 0;

    for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const result = await supabaseRequest('POST', tableName, batch);
        if (result.ok) {
            synced += batch.length;
            process.stdout.write(`\r  ✓ Synced ${synced}/${rows.length}`);
        } else {
            failed += batch.length;
            console.log(`\n  ✗ Batch ${i + 1} failed (${result.status}): ${result.error?.substring(0, 200)}`);
        }
    }
    console.log('');

    return { table: tableName, synced, failed };
}

// ============ Main ============

async function main() {
    const arg = process.argv[2];
    const tables = arg ? [arg] : DEFAULT_TABLES;

    console.log('='.repeat(60));
    console.log('  LOCAL POSTGRESQL → SUPABASE SYNC (BACKUP)');
    console.log('='.repeat(60));
    console.log(`Time: ${new Date().toLocaleString('th-TH')}`);
    console.log(`Source: ${pool.options.host}:${pool.options.port}/${pool.options.database}`);
    console.log(`Target: ${SUPABASE_URL}`);
    console.log(`Tables: ${tables.length}`);

    const results = [];
    for (const table of tables) {
        const result = await syncTable(table);
        results.push(result);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('  SUMMARY');
    console.log('='.repeat(60));
    let totalSynced = 0;
    let totalFailed = 0;
    for (const r of results) {
        const status = r.skipped ? 'SKIPPED' : r.failed > 0 ? `${r.synced} ok, ${r.failed} FAIL` : `${r.synced} ok`;
        console.log(`  ${r.table.padEnd(30)} ${status}`);
        totalSynced += r.synced;
        totalFailed += r.failed;
    }
    console.log('-'.repeat(60));
    console.log(`  TOTAL: ${totalSynced} synced, ${totalFailed} failed`);
    console.log('='.repeat(60));

    await pool.end();
    process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((e) => {
    console.error('FATAL:', e);
    pool.end();
    process.exit(1);
});
