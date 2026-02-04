// Run migration for task assignment
// Execute with: cd we-warehouse-backend && npx ts-node scripts/run-migration-004.ts

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
    host: process.env.LOCAL_PG_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_PG_PORT || '5432'),
    database: process.env.LOCAL_PG_DATABASE || 'wewarehouse_local',
    user: process.env.LOCAL_PG_USER || 'postgres',
    password: process.env.LOCAL_PG_PASSWORD || 'postgres123'
});

async function runMigration() {
    console.log('🚀 Running migration 004_add_task_assignment.sql...');

    const migrationPath = path.join(__dirname, '..', 'migrations', '004_add_task_assignment.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 SQL to execute:');
    console.log(sql);

    try {
        await pool.query(sql);
        console.log('✅ Migration completed successfully!');
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        // Check if error is "column already exists" - that's ok
        if (error.message.includes('already exists')) {
            console.log('ℹ️ Column already exists - migration may have been run before');
        }
    } finally {
        await pool.end();
    }
}

runMigration();
