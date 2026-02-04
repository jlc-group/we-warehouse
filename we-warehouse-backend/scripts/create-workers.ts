/**
 * สร้าง Worker Accounts สำหรับระบบคลังสินค้า
 * Run: cd we-warehouse-backend && npx ts-node scripts/create-workers.ts
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123'
});

interface WorkerData {
    email: string;
    full_name: string;
    role: string;
    password: string;
}

// รายชื่อพนักงานจริง
const workers: WorkerData[] = [
    {
        email: 'worker1@jlc.local',
        full_name: 'วรรณภา ศรีสุข',
        role: 'พนักงานคลัง',
        password: 'jlc123'
    },
    {
        email: 'worker2@jlc.local',
        full_name: 'สมชาย ใจดี',
        role: 'พนักงานคลัง',
        password: 'jlc123'
    },
    {
        email: 'worker3@jlc.local',
        full_name: 'อรุณี แก้วมณี',
        role: 'พนักงานคลัง',
        password: 'jlc123'
    },
    {
        email: 'supervisor@jlc.local',
        full_name: 'ประสิทธิ์ มานะ',
        role: 'หัวหน้าคลัง',
        password: 'jlc456'
    },
    {
        email: 'picker1@jlc.local',
        full_name: 'ธนากร สุขุม',
        role: 'พนักงานหยิบสินค้า',
        password: 'jlc123'
    },
    {
        email: 'picker2@jlc.local',
        full_name: 'นภาพร วงศ์ดี',
        role: 'พนักงานหยิบสินค้า',
        password: 'jlc123'
    }
];

async function createWorkers() {
    console.log('👥 Creating worker accounts...\n');

    for (const worker of workers) {
        try {
            // Check if user exists
            const existing = await pool.query('SELECT email FROM users WHERE email = $1', [worker.email]);

            if (existing.rows.length > 0) {
                // Update existing
                const passwordHash = await bcrypt.hash(worker.password, 10);
                await pool.query(`
                    UPDATE users SET 
                        full_name = $1,
                        role = $2,
                        password_hash = $3,
                        is_active = true
                    WHERE email = $4
                `, [worker.full_name, worker.role, passwordHash, worker.email]);
                console.log(`🔄 Updated: ${worker.full_name} (${worker.email})`);
            } else {
                // Insert new
                const passwordHash = await bcrypt.hash(worker.password, 10);
                await pool.query(`
                    INSERT INTO users (email, full_name, role, password_hash, is_active, created_at)
                    VALUES ($1, $2, $3, $4, true, NOW())
                `, [worker.email, worker.full_name, worker.role, passwordHash]);
                console.log(`✅ Created: ${worker.full_name} (${worker.email})`);
            }

            console.log(`   Role: ${worker.role}`);
            console.log(`   Password: ${worker.password}\n`);
        } catch (error: any) {
            console.error(`❌ Error ${worker.email}:`, error.message);
        }
    }

    // Show all users
    console.log('\n📋 All users in database:');
    const { rows } = await pool.query(`
        SELECT email, full_name, role, is_active 
        FROM users 
        ORDER BY role, full_name
    `);

    console.table(rows);

    await pool.end();
    console.log('\n✅ Done! Workers can now login at /mobile');
}

createWorkers().catch(console.error);
