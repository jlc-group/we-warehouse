/**
 * Comprehensive Supabase Table Scanner
 * Checks ALL possible tables in Supabase
 */

const https = require('https');

const SUPABASE_URL = 'ogrcpzzmmudztwjfwjvu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

// ALL POSSIBLE TABLE NAMES - comprehensive list
const ALL_POSSIBLE_TABLES = [
    // Core tables
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
    'settings',

    // Common variations
    'warehouses',
    'locations',
    'items',
    'stock',
    'stocks',
    'movements',
    'orders',
    'customers',
    'suppliers',
    'categories',
    'purchase_orders',
    'purchase_order_items',
    'stock_transfers',
    'stock_adjustments',
    'departments',
    'audit_logs',
    'activity_logs',
    'system_logs',

    // User related
    'user_roles',
    'roles',
    'permissions',
    'user_permissions',
    'user_settings',
    'profiles',
    'user_profiles',

    // Product related
    'product_categories',
    'product_images',
    'product_variants',
    'product_units',
    'units',
    'unit_conversions',

    // Inventory related
    'inventory_counts',
    'inventory_snapshots',
    'inventory_history',
    'stock_counts',
    'stock_history',
    'bin_locations',
    'zones',
    'racks',
    'shelves',

    // Order related
    'order_statuses',
    'order_history',
    'shipments',
    'deliveries',
    'picking_lists',
    'packing_lists',

    // Transaction related
    'transactions',
    'receipts',
    'invoices',
    'payments',

    // Other possible tables
    'configs',
    'configurations',
    'migrations',
    'sessions',
    'tokens',
    'notifications',
    'alerts',
    'reports',
    'exports',
    'imports',
    'files',
    'attachments',
    'documents',
    'notes',
    'comments',
    'tags',
    'labels'
];

async function checkTable(tableName) {
    return new Promise((resolve) => {
        const options = {
            hostname: SUPABASE_URL,
            path: `/rest/v1/${tableName}?select=*&limit=1`,
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
                        const json = JSON.parse(data);
                        resolve({ table: tableName, exists: true, sample: json.length > 0 ? json[0] : null });
                    } catch (e) {
                        resolve({ table: tableName, exists: false });
                    }
                } else {
                    resolve({ table: tableName, exists: false });
                }
            });
        });

        req.on('error', () => resolve({ table: tableName, exists: false }));
        req.end();
    });
}

async function countTable(tableName) {
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
                        const json = JSON.parse(data);
                        resolve(json.length);
                    } catch (e) {
                        resolve(0);
                    }
                } else {
                    resolve(0);
                }
            });
        });

        req.on('error', () => resolve(0));
        req.end();
    });
}

async function main() {
    console.log('='.repeat(70));
    console.log('  COMPREHENSIVE SUPABASE TABLE SCAN');
    console.log('='.repeat(70));
    console.log(`\nTime: ${new Date().toLocaleString('th-TH')}`);
    console.log(`Checking ${ALL_POSSIBLE_TABLES.length} potential tables...\n`);

    const foundTables = [];
    const notFoundTables = [];

    for (const table of ALL_POSSIBLE_TABLES) {
        process.stdout.write(`  Checking ${table}... `);
        const result = await checkTable(table);

        if (result.exists) {
            const count = await countTable(table);
            console.log(`✅ EXISTS (${count} records)`);
            foundTables.push({ table, count });
        } else {
            console.log(`❌ not found`);
            notFoundTables.push(table);
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log('  SUMMARY');
    console.log('='.repeat(70));

    console.log('\n✅ TABLES FOUND IN SUPABASE:');
    console.log('-'.repeat(50));

    if (foundTables.length === 0) {
        console.log('  (no tables found)');
    } else {
        let totalRecords = 0;
        foundTables.forEach(t => {
            console.log(`  ${t.table.padEnd(30)} : ${t.count} records`);
            totalRecords += t.count;
        });
        console.log('-'.repeat(50));
        console.log(`  TOTAL: ${foundTables.length} tables, ${totalRecords} records`);
    }

    console.log('\n');
}

main().catch(console.error);
