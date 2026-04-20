const https = require('https');

const SUPABASE_URL = 'ogrcpzzmmudztwjfwjvu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

// Potential tables that might exist in Supabase
const potentialTables = [
    'inventory_items',
    'inventory_movements',
    'products',
    'warehouse_locations',
    'users',
    'customer_orders',
    'order_items',
    'inbound_receipts',
    'inbound_receipt_items',
    'purchase_orders',
    'purchase_order_items',
    'stock_transfers',
    'stock_adjustments',
    'warehouses',
    'departments',
    'event_logs',
    'audit_logs',
    'settings',
    'categories',
    'suppliers'
];

async function checkTable(tableName) {
    return new Promise((resolve) => {
        const options = {
            hostname: SUPABASE_URL,
            path: `/rest/v1/${tableName}?select=count`,
            method: 'HEAD',
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`,
                'Prefer': 'count=exact'
            }
        };

        const req = https.request(options, (res) => {
            const count = res.headers['content-range'];
            if (res.statusCode === 200) {
                const total = count ? count.split('/')[1] : '?';
                resolve({ table: tableName, exists: true, count: total });
            } else {
                resolve({ table: tableName, exists: false, count: 0 });
            }
        });

        req.on('error', (e) => {
            resolve({ table: tableName, exists: false, count: 0, error: e.message });
        });

        req.end();
    });
}

async function main() {
    console.log('Checking ALL Supabase tables...\n');
    console.log('Table Name                    | Exists | Records');
    console.log('------------------------------|--------|--------');

    for (const table of potentialTables) {
        const result = await checkTable(table);
        const existsStr = result.exists ? '  ✓   ' : '  ✗   ';
        const countStr = result.exists ? result.count.toString().padStart(6) : '     -';
        console.log(`${table.padEnd(30)}|${existsStr}|${countStr}`);
    }
}

main();
