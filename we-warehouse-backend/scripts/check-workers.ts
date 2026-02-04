// Check users table and create test workers
import { Pool } from 'pg';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123'
});

async function checkAndCreateWorkers() {
    console.log('👥 Checking users table...\n');

    try {
        // Check if users table exists and has data
        const { rows: users } = await pool.query('SELECT email, full_name, role FROM users LIMIT 10');
        console.log('Existing users:', users);

        if (users.length === 0) {
            console.log('\n⚠️ No users found, creating test workers...');
            await createTestWorkers();
        }
    } catch (error: any) {
        if (error.message.includes('does not exist')) {
            console.log('❌ Users table does not exist! Creating...');
            await createUsersTable();
            await createTestWorkers();
        } else {
            console.error('Error:', error.message);
        }
    } finally {
        await pool.end();
    }
}

async function createUsersTable() {
    console.log('\n📋 Creating users table...');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            full_name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'worker',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    `);
    console.log('✅ Users table created!');
}

async function createTestWorkers() {
    console.log('\n👷 Creating test workers...');

    const workers = [
        { email: 'worker1@warehouse.local', full_name: 'พนักงาน 1 - สมชาย', role: 'worker' },
        { email: 'worker2@warehouse.local', full_name: 'พนักงาน 2 - สมหญิง', role: 'worker' },
        { email: 'worker3@warehouse.local', full_name: 'พนักงาน 3 - สมศักดิ์', role: 'worker' },
        { email: 'supervisor@warehouse.local', full_name: 'หัวหน้า - วิชัย', role: 'supervisor' },
        { email: 'admin@warehouse.local', full_name: 'Admin - ผู้ดูแลระบบ', role: 'admin' }
    ];

    for (const w of workers) {
        await pool.query(
            `INSERT INTO users (email, full_name, role) VALUES ($1, $2, $3)
             ON CONFLICT (email) DO NOTHING`,
            [w.email, w.full_name, w.role]
        );
        console.log(`✅ ${w.full_name} (${w.email})`);
    }

    console.log('\n🎉 Workers created!');
}

checkAndCreateWorkers();
