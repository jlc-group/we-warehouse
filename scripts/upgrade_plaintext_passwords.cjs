/**
 * Migrate plain-text password_hash values to real bcrypt hashes
 * IN-PLACE — preserves the original password string.
 *
 * Safe to run multiple times: only updates rows where password_hash is NOT already
 * a bcrypt string (^$2[aby]?$).
 *
 * After running, users can log in with their original password (which is now
 * verifiable via bcrypt.compare).
 */

const bcrypt = require(require('path').join(
  'D:/AI_WORKSPACE/Production/we-warehouse-backend/node_modules/bcrypt'
));
const { Client } = require(require('path').join(
  'D:/AI_WORKSPACE/Production/we-warehouse-backend/node_modules/pg'
));

const BCRYPT_ROUNDS = 10;

(async () => {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123',
  });
  await client.connect();

  const rows = await client.query(
    `SELECT id, username, email, password_hash
       FROM users
      WHERE password_hash IS NOT NULL
        AND password_hash !~ '^\\$2[aby]?\\$'`
  );

  if (rows.rows.length === 0) {
    console.log('No plain-text password_hash rows found. Nothing to do.');
    await client.end();
    return;
  }

  console.log(`Found ${rows.rows.length} user(s) with plain-text password_hash:`);
  for (const u of rows.rows) {
    const plain = String(u.password_hash);
    const hash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, u.id]);
    console.log(`  ✅ ${u.email} (username: ${u.username || '(none)'}) — hashed in place, password preserved`);
  }

  await client.end();
  console.log('\nDone. Affected users can log in with their original (now-hashed) password.');
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
