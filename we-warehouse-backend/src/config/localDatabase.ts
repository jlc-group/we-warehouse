/**
 * Local PostgreSQL Database Configuration
 * Connection to wewarehouse_local database
 */
import pg from 'pg';

const { Pool } = pg;

// PostgreSQL connection config
const localDbConfig = {
    host: process.env.LOCAL_PG_HOST || 'localhost',
    port: parseInt(process.env.LOCAL_PG_PORT || '5432'),
    database: process.env.LOCAL_PG_DATABASE || 'wewarehouse_local',
    user: process.env.LOCAL_PG_USER || 'postgres',
    password: process.env.LOCAL_PG_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Connection pool
let pool: pg.Pool | null = null;

export const getLocalPool = (): pg.Pool => {
    if (!pool) {
        pool = new Pool(localDbConfig);

        pool.on('error', (err) => {
            console.error('❌ Local PostgreSQL pool error:', err);
        });

        pool.on('connect', () => {
            console.log('✅ Connected to local PostgreSQL');
        });
    }
    return pool;
};

export const testLocalConnection = async (): Promise<boolean> => {
    try {
        const client = await getLocalPool().connect();
        const result = await client.query('SELECT NOW()');
        client.release();
        console.log('✅ Local PostgreSQL connection test passed:', result.rows[0].now);
        return true;
    } catch (error) {
        console.error('❌ Local PostgreSQL connection test failed:', error);
        return false;
    }
};

export const closeLocalPool = async (): Promise<void> => {
    if (pool) {
        await pool.end();
        pool = null;
    }
};
