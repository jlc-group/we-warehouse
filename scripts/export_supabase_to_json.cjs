/**
 * Export Supabase Data to JSON Files
 * Saves all data from Supabase cloud to local JSON files
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'ogrcpzzmmudztwjfwjvu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const OUTPUT_DIR = path.join(__dirname, 'supabase_export');

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

async function main() {
    console.log('='.repeat(60));
    console.log('  SUPABASE DATA EXPORT TO JSON');
    console.log('='.repeat(60));
    console.log(`\nTime: ${new Date().toLocaleString('th-TH')}\n`);

    // Create output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const tables = [
        'inventory_items',
        'inventory_movements',
        'products',
        'warehouse_locations',
        'users',
        'customer_orders',
        'order_items',
        'inbound_receipts',
        'inbound_receipt_items'
    ];

    const summary = [];

    for (const table of tables) {
        console.log(`📥 Fetching ${table}...`);
        const data = await fetchFromSupabase(table);

        if (data === null) {
            console.log(`   ❌ Table not found`);
            continue;
        }

        const count = data.length;
        console.log(`   ✅ Found ${count} records`);

        // Save to JSON file
        const filePath = path.join(OUTPUT_DIR, `${table}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`   💾 Saved to ${filePath}`);

        summary.push({ table, count, file: `${table}.json` });
    }

    // Create summary file
    const summaryPath = path.join(OUTPUT_DIR, '_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify({
        exportDate: new Date().toISOString(),
        tables: summary,
        totalRecords: summary.reduce((acc, t) => acc + t.count, 0)
    }, null, 2), 'utf8');

    console.log('\n' + '='.repeat(60));
    console.log('  EXPORT SUMMARY');
    console.log('='.repeat(60));
    summary.forEach(t => console.log(`  ${t.table.padEnd(25)} : ${t.count} records`));
    console.log('-'.repeat(60));
    console.log(`  Total: ${summary.reduce((acc, t) => acc + t.count, 0)} records`);
    console.log(`\n✅ All data exported to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
