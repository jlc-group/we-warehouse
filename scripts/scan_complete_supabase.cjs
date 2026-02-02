/**
 * COMPLETE Supabase Table Scanner - From Dashboard Screenshots
 * User provided actual table list from Supabase dashboard
 */

const https = require('https');

const SUPABASE_URL = 'ogrcpzzmmudztwjfwjvu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

// ALL TABLES FROM USER'S SUPABASE DASHBOARD SCREENSHOTS
const ALL_SUPABASE_TABLES = [
    // From Screenshot 3 (aging_report to fulfillment_tasks_with_items)
    'aging_report',
    'backup_product_conversion_rates',
    'backup_products_20250927',
    'bookings',
    'customer_exports',
    'customer_orders',
    'customer_payment_summary',
    'customers',
    'event_attendees',
    'fulfillment_item_locations',
    'fulfillment_items',
    'fulfillment_items_multi_location',
    'fulfillment_orders',
    'fulfillment_stock_movements',
    'fulfillment_tasks',
    'fulfillment_tasks_with_items',

    // From Screenshot 2 (inbound_qc_logs to products_with_counts)
    'inbound_qc_logs',
    'inbound_receipt_items',
    'inbound_receipts',
    'inventory_available',
    'inventory_fifo_order',
    'inventory_items',
    'inventory_movements',
    'location_activity_logs',
    'location_activity_recent',
    'location_activity_summary',
    'location_qr_codes',
    'meeting_rooms',
    'migration_backup_log',
    'monthly_summaries',
    'order_items',
    'processed_sheets_data',
    'product_audit_log',
    'product_conversion_rates',
    'products',
    'products_summary',
    'products_with_conversions',
    'products_with_counts',

    // From Screenshot 1 (projects to warehouses)
    'projects',
    'recent_stock_movements',
    'reservation_history',
    'reservation_summary_by_warehouse',
    'sales_bill_items',
    'sales_bills',
    'saved_datasets',
    'shipment_items',
    'shipment_tracking',
    'shipments',
    'stock_reservations',
    'sync_history',
    'system_events',
    'users',
    'users_with_warehouse_view',
    'v_recent_inbound_receipts',
    'warehouse_assignments',
    'warehouse_locations',
    'warehouse_locations_with_inventory',
    'warehouse_transfers',
    'warehouse_transfers_view',
    'warehouses'
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
                        const json = JSON.parse(data);
                        resolve({ exists: true, data: json, count: json.length });
                    } catch (e) {
                        resolve({ exists: false, data: [], count: 0 });
                    }
                } else {
                    resolve({ exists: false, data: [], count: 0, status: res.statusCode });
                }
            });
        });

        req.on('error', () => resolve({ exists: false, data: [], count: 0 }));
        req.end();
    });
}

async function main() {
    console.log('='.repeat(70));
    console.log('  COMPLETE SUPABASE TABLE SCAN');
    console.log('  (From Dashboard Screenshots - ' + ALL_SUPABASE_TABLES.length + ' tables)');
    console.log('='.repeat(70));
    console.log(`\nTime: ${new Date().toLocaleString('th-TH')}\n`);

    const results = {
        tablesWithData: [],
        emptyTables: [],
        viewsOrNoAccess: []
    };

    for (const table of ALL_SUPABASE_TABLES) {
        process.stdout.write(`  ${table.padEnd(40)} `);
        const result = await fetchFromSupabase(table);

        if (result.exists) {
            if (result.count > 0) {
                console.log(`✅ ${result.count} records`);
                results.tablesWithData.push({ table, count: result.count });
            } else {
                console.log(`○  empty`);
                results.emptyTables.push(table);
            }
        } else {
            console.log(`⚠️  view/no access (${result.status || 'error'})`);
            results.viewsOrNoAccess.push(table);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('  SUMMARY');
    console.log('='.repeat(70));

    console.log('\n✅ TABLES WITH DATA (' + results.tablesWithData.length + '):');
    console.log('-'.repeat(50));
    let totalRecords = 0;
    results.tablesWithData.forEach(t => {
        console.log(`  ${t.table.padEnd(40)} : ${t.count}`);
        totalRecords += t.count;
    });
    console.log('-'.repeat(50));
    console.log(`  TOTAL RECORDS: ${totalRecords}`);

    console.log('\n○ EMPTY TABLES (' + results.emptyTables.length + '):');
    results.emptyTables.forEach(t => console.log(`  - ${t}`));

    console.log('\n⚠️ VIEWS/NO ACCESS (' + results.viewsOrNoAccess.length + '):');
    results.viewsOrNoAccess.forEach(t => console.log(`  - ${t}`));

    console.log('\n');
}

main().catch(console.error);
