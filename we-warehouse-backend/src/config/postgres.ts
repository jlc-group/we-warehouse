import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL configuration for self-hosted warehouse database
const pgConfig = {
    host: process.env.PG_HOST || '192.168.0.41',
    port: parseInt(process.env.PG_PORT || '5432'),
    database: process.env.PG_DATABASE || 'wewarehouse_db',
    user: process.env.PG_USER || 'wewarehouse_user',
    password: process.env.PG_PASSWORD || '',
    max: 20, // Maximum number of connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
};

console.log('🐘 PostgreSQL Config:', {
    host: pgConfig.host,
    port: pgConfig.port,
    database: pgConfig.database,
    user: pgConfig.user,
});

// Create connection pool
const pool = new Pool(pgConfig);

// Handle pool errors
pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err);
});

pool.on('connect', () => {
    console.log('✅ New PostgreSQL client connected');
});

/**
 * Get a PostgreSQL connection from the pool
 */
export async function getPgConnection(): Promise<PoolClient> {
    try {
        const client = await pool.connect();
        return client;
    } catch (error) {
        console.error('❌ Failed to get PostgreSQL connection:', error);
        throw error;
    }
}

/**
 * Execute a query on the PostgreSQL database
 */
export async function pgQuery<T = any>(
    text: string,
    params?: any[]
): Promise<T[]> {
    try {
        const result = await pool.query(text, params);
        return result.rows as T[];
    } catch (error) {
        console.error('❌ PostgreSQL query error:', error);
        throw error;
    }
}

/**
 * Execute a query and return first row
 */
export async function pgQueryOne<T = any>(
    text: string,
    params?: any[]
): Promise<T | null> {
    const rows = await pgQuery<T>(text, params);
    return rows[0] || null;
}

/**
 * Test PostgreSQL connection
 */
export async function testPgConnection(): Promise<boolean> {
    try {
        await pool.query('SELECT 1 as test');
        console.log('✅ PostgreSQL connection test successful');
        return true;
    } catch (error) {
        console.error('❌ PostgreSQL connection test failed:', error);
        return false;
    }
}

/**
 * Close PostgreSQL pool
 */
export async function closePgPool(): Promise<void> {
    await pool.end();
    console.log('🔌 PostgreSQL pool closed');
}

// Handle process termination
process.on('SIGINT', async () => {
    await closePgPool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closePgPool();
    process.exit(0);
});

export { pool };
