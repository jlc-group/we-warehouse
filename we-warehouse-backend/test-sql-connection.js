/**
 * ทดสอบการเชื่อมต่อ SQL Server
 * Run: node test-sql-connection.js
 */

import sql from 'mssql';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  server: process.env.DB_SERVER || 'JHSERVER.DYNDNS.INFO\\SQLEXPRESS',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'readonly_user',
  password: process.env.DB_PASSWORD || 'vjkogmjkoyho',
  database: process.env.DB_DATABASE || 'JHCSMILE',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    port: parseInt(process.env.DB_PORT || '3306'), // Force port here too
    connectTimeout: 15000,
    requestTimeout: 15000,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

console.log('🔍 SQL Server Connection Test\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📋 Configuration:');
console.log(`   Server: ${config.server}`);
console.log(`   Port: ${config.port}`);
console.log(`   Database: ${config.database}`);
console.log(`   User: ${config.user}`);
console.log(`   Instance: ${config.options.instanceName}`);
console.log(`   Timeout: ${config.options.connectTimeout}ms\n`);

async function testConnection() {
  let pool;
  
  try {
    console.log('⏳ Attempting to connect...\n');
    const startTime = Date.now();
    
    pool = await sql.connect(config);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Connected successfully! (${duration}ms)\n`);
    
    // Test query
    console.log('📊 Testing query: SELECT @@VERSION\n');
    const result = await pool.request().query('SELECT @@VERSION as version');
    
    console.log('✅ Query successful!\n');
    console.log('SQL Server Version:');
    console.log(result.recordset[0].version);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Test CSSALE table
    console.log('\n📊 Testing CSSALE table access...\n');
    const salesTest = await pool.request().query('SELECT TOP 1 * FROM CSSALE');
    console.log(`✅ CSSALE table accessible! Found ${salesTest.recordset.length} row(s)\n`);
    
    // Test packing list query
    console.log('📦 Testing packing list query...\n');
    const today = new Date().toISOString().split('T')[0];
    const packingTest = await pool.request()
      .input('taxDate', sql.Date, today)
      .query(`
        SELECT TOP 5
          TAXNO, DOCNO, ARCODE, ARNAME, TAXDATE
        FROM CSSALE
        WHERE CAST(TAXDATE AS DATE) = @taxDate
        ORDER BY TAXNO
      `);
    
    console.log(`✅ Packing list query successful! Found ${packingTest.recordset.length} order(s) for today\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 All tests passed! Backend should work properly.\n');
    
  } catch (err) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('\n❌ Connection failed!\n');
    console.error('Error details:');
    console.error(`   Code: ${err.code}`);
    console.error(`   Message: ${err.message}\n`);
    
    if (err.code === 'ETIMEOUT') {
      console.error('💡 Possible causes:');
      console.error('   1. SQL Server service is not running');
      console.error('   2. SQL Browser service is not running (required for named instances)');
      console.error('   3. Firewall blocking the connection');
      console.error('   4. Wrong port number (try 1433 or 3306)');
      console.error('   5. Network/VPN issue\n');
    } else if (err.code === 'ELOGIN') {
      console.error('💡 Authentication failed:');
      console.error('   - Check username and password');
      console.error('   - Verify SQL Server authentication is enabled\n');
    } else {
      console.error('💡 Try:');
      console.error('   - Verify server name and instance');
      console.error('   - Check if SQL Server allows remote connections');
      console.error('   - Ensure TCP/IP protocol is enabled\n');
    }
    
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 Connection closed.\n');
    }
  }
}

testConnection().catch(console.error);
