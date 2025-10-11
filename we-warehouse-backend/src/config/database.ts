import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

// แยก server name จาก instance name (ถ้ามี \SQLEXPRESS)
const serverStr = process.env.DB_SERVER || '';
const portNum = parseInt(process.env.DB_PORT || '3306');
const [serverName] = serverStr.split('\\'); // ใช้แค่ชื่อ server ไม่เอา \SQLEXPRESS

console.log('🔍 Database Config:', {
  server: serverName,
  port: portNum,
  database: process.env.DB_DATABASE,
  DB_PORT_ENV: process.env.DB_PORT
});

const config: sql.config = {
  server: serverName, // ชื่อ server เฉยๆ ไม่มี port
  port: portNum, // ระบุ port ที่นี่
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || '',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  requestTimeout: 30000,
  connectionTimeout: 30000,
};

let pool: sql.ConnectionPool | null = null;

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  try {
    pool = await new sql.ConnectionPool(config).connect();
    console.log('✅ Connected to SQL Server database:', process.env.DB_DATABASE);

    // Test the connection
    await pool.request().query('SELECT 1 AS test');
    console.log('✅ Database connection test successful');

    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔌 Database connection closed');
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

export { sql };
