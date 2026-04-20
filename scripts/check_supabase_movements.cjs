const https = require('https');

const SUPABASE_URL = 'ogrcpzzmmudztwjfwjvu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

// Check for movement-related tables in Supabase
const tables = ['inventory_movements', 'stock_movements', 'movement_logs', 'inventory_logs'];

async function checkTable(tableName) {
    return new Promise((resolve) => {
        const options = {
            hostname: SUPABASE_URL,
            path: `/rest/v1/${tableName}?select=*&limit=5`,
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
                console.log(`\n=== Table: ${tableName} ===`);
                console.log(`Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`Records found: ${json.length}`);
                        if (json.length > 0) {
                            console.log('Sample:', JSON.stringify(json[0], null, 2));
                        }
                    } catch (e) {
                        console.log('Data:', data.substring(0, 200));
                    }
                } else {
                    console.log('Not found or error');
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.log(`Error: ${e.message}`);
            resolve();
        });

        req.end();
    });
}

// Also check inventory_items for recent updates
async function checkRecentInventory() {
    return new Promise((resolve) => {
        const options = {
            hostname: SUPABASE_URL,
            path: '/rest/v1/inventory_items?select=id,product_name,location,updated_at&order=updated_at.desc&limit=5',
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
                console.log('\n=== Recent Inventory Updates ===');
                console.log(`Status: ${res.statusCode}`);
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        console.log(`Records found: ${json.length}`);
                        json.forEach((item, i) => {
                            console.log(`${i + 1}. ${item.product_name} @ ${item.location} - ${item.updated_at}`);
                        });
                    } catch (e) {
                        console.log('Parse error');
                    }
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.log(`Error: ${e.message}`);
            resolve();
        });

        req.end();
    });
}

async function main() {
    console.log('Checking Supabase Cloud for movement data...\n');

    for (const table of tables) {
        await checkTable(table);
    }

    await checkRecentInventory();
}

main();
