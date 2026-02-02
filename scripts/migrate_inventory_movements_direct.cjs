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
                        resolve(JSON.parse(data));
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
    console.log('Migrating inventory_movements from Supabase to Local PostgreSQL...\n');

    // 1. Create table if not exists
    console.log('Creating table...');
    await pool.query(`
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
    CREATE INDEX IF NOT EXISTS idx_inv_movements_date ON inventory_movements(created_at);
    CREATE INDEX IF NOT EXISTS idx_inv_movements_type ON inventory_movements(movement_type);
  `);
    console.log('Table created!\n');

    // 2. Fetch from Supabase
    console.log('Fetching from Supabase...');
    const movements = await fetchFromSupabase('inventory_movements');
    console.log(`Found ${movements.length} records\n`);

    if (movements.length === 0) {
        console.log('No records to migrate');
        await pool.end();
        return;
    }

    // 3. Insert each record
    let inserted = 0;
    let skipped = 0;

    for (const m of movements) {
        try {
            await pool.query(`
        INSERT INTO inventory_movements (
          id, inventory_item_id, movement_type, 
          quantity_level1_change, quantity_level2_change, quantity_level3_change,
          reference_type, reference_id, notes, user_id,
          created_at, updated_at,
          quantity_boxes_before, quantity_loose_before,
          quantity_boxes_after, quantity_loose_after,
          quantity_boxes_change, quantity_loose_change,
          location_before, location_after, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (id) DO NOTHING
      `, [
                m.id,
                m.inventory_item_id,
                m.movement_type,
                m.quantity_level1_change || 0,
                m.quantity_level2_change || 0,
                m.quantity_level3_change || 0,
                m.reference_type,
                m.reference_id,
                m.notes,
                m.user_id,
                m.created_at,
                m.updated_at,
                m.quantity_boxes_before || 0,
                m.quantity_loose_before || 0,
                m.quantity_boxes_after || 0,
                m.quantity_loose_after || 0,
                m.quantity_boxes_change || 0,
                m.quantity_loose_change || 0,
                m.location_before,
                m.location_after,
                m.created_by
            ]);
            inserted++;
        } catch (e) {
            skipped++;
            // console.log(`Skipped: ${e.message}`);
        }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Inserted: ${inserted}`);
    console.log(`   Skipped: ${skipped}`);

    // 4. Verify
    const result = await pool.query('SELECT COUNT(*) FROM inventory_movements');
    console.log(`   Total in local DB: ${result.rows[0].count}`);

    await pool.end();
}

main().catch(console.error);
