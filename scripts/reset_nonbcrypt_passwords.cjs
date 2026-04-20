/**
 * One-off migration: reset any password_hash that isn't a bcrypt hash
 * (e.g. placeholder 'temp_password_hash') to a known temporary password,
 * properly bcrypt-hashed.
 *
 * After running, affected users should log in with TEMP_PASSWORD and
 * change it immediately via the AdminPage or a change-password flow.
 */

const bcrypt = require(require('path').join(
  'D:/AI_WORKSPACE/Production/we-warehouse-backend/node_modules/bcrypt'
));
const { Client } = require(require('path').join(
  'D:/AI_WORKSPACE/Production/we-warehouse-backend/node_modules/pg'
));

const TEMP_PASSWORD = 'changeme123';
const BCRYPT_ROUNDS = 10;

(async () => {
  const hash = await bcrypt.hash(TEMP_PASSWORD, BCRYPT_ROUNDS);
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'wewarehouse_local',
    user: 'postgres',
    password: 'postgres123',
  });
  await client.connect();

  // Find users whose password_hash does NOT look like bcrypt ($2a$, $2b$, $2y$)
  const pre = await client.query(
    `SELECT id, username, email, password_hash
       FROM users
      WHERE password_hash IS NULL
         OR password_hash !~ '^\\$2[aby]?\\$'`
  );
  console.log(`Found ${pre.rows.length} user(s) without bcrypt password_hash:`);
  pre.rows.forEach(u => console.log(`  - ${u.email} (username: ${u.username || '(none)'})`));

  if (pre.rows.length === 0) {
    console.log('Nothing to do.');
    await client.end();
    return;
  }

  const ids = pre.rows.map(r => r.id);
  const res = await client.query(
    `UPDATE users SET password_hash = $1 WHERE id = ANY($2::uuid[]) RETURNING email`,
    [hash, ids]
  );
  console.log(`\nUpdated ${res.rowCount} user(s).`);
  console.log(`Temporary password: ${TEMP_PASSWORD}`);
  console.log('→ Tell affected users to log in with this password and change it immediately.');
  await client.end();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
