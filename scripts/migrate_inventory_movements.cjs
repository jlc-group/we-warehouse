const https = require('https');

const SUPABASE_URL = 'ogrcpzzmmudztwjfwjvu.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

async function fetchAll(tableName) {
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
                        resolve(json);
                    } catch (e) {
                        resolve([]);
                    }
                } else {
                    resolve([]);
                }
            });
        });

        req.on('error', () => resolve([]));
        req.end();
    });
}

async function main() {
    console.log('Fetching inventory_movements from Supabase...\n');

    const movements = await fetchAll('inventory_movements');
    console.log(`Found ${movements.length} records\n`);

    if (movements.length > 0) {
        // Output as SQL INSERT statements
        console.log('-- SQL to insert into local DB:');
        console.log('-- First create the table if not exists');
        console.log(`
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID,
    movement_type TEXT,
    quantity_level1_change INTEGER DEFAULT 0,
    quantity_level2_change INTEGER DEFAULT 0,
    quantity_level3_change INTEGER DEFAULT 0,
    reference_type TEXT,
    reference_id TEXT,
    notes TEXT,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    quantity_boxes_before INTEGER DEFAULT 0,
    quantity_loose_before INTEGER DEFAULT 0,
    quantity_boxes_after INTEGER DEFAULT 0,
    quantity_loose_after INTEGER DEFAULT 0,
    quantity_boxes_change INTEGER DEFAULT 0,
    quantity_loose_change INTEGER DEFAULT 0,
    location_before TEXT,
    location_after TEXT,
    created_by TEXT
);
`);

        movements.forEach((m, i) => {
            const values = [
                m.id ? `'${m.id}'` : 'gen_random_uuid()',
                m.inventory_item_id ? `'${m.inventory_item_id}'` : 'NULL',
                m.movement_type ? `'${m.movement_type}'` : 'NULL',
                m.quantity_level1_change || 0,
                m.quantity_level2_change || 0,
                m.quantity_level3_change || 0,
                m.reference_type ? `'${m.reference_type}'` : 'NULL',
                m.reference_id ? `'${m.reference_id}'` : 'NULL',
                m.notes ? `'${m.notes.replace(/'/g, "''")}'` : 'NULL',
                m.user_id ? `'${m.user_id}'` : 'NULL',
                m.created_at ? `'${m.created_at}'` : 'NOW()',
                m.updated_at ? `'${m.updated_at}'` : 'NOW()',
                m.quantity_boxes_before || 0,
                m.quantity_loose_before || 0,
                m.quantity_boxes_after || 0,
                m.quantity_loose_after || 0,
                m.quantity_boxes_change || 0,
                m.quantity_loose_change || 0,
                m.location_before ? `'${m.location_before}'` : 'NULL',
                m.location_after ? `'${m.location_after.replace(/'/g, "''")}'` : 'NULL',
                m.created_by ? `'${m.created_by}'` : 'NULL'
            ];

            console.log(`INSERT INTO inventory_movements (id, inventory_item_id, movement_type, quantity_level1_change, quantity_level2_change, quantity_level3_change, reference_type, reference_id, notes, user_id, created_at, updated_at, quantity_boxes_before, quantity_loose_before, quantity_boxes_after, quantity_loose_after, quantity_boxes_change, quantity_loose_change, location_before, location_after, created_by) VALUES (${values.join(', ')});`);
        });

        console.log('\n-- Total: ' + movements.length + ' records');
    }
}

main();
