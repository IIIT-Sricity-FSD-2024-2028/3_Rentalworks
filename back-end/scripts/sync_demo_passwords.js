const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function sync() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const pass123 = await bcrypt.hash('password123', 10);
  const admin123 = await bcrypt.hash('admin123', 10);
  const warden123 = await bcrypt.hash('warden123', 10);

  await client.query("UPDATE users SET password = $1 WHERE username = ANY($2::text[])", [pass123, ['tenant1', 'owner1', 'admin']]);
  await client.query("UPDATE users SET password = $1 WHERE username = 'superadmin'", [admin123]);
  await client.query("UPDATE users SET password = $1 WHERE username = 'warden'", [warden123]);

  console.log('SUCCESS: All demo passwords synchronized in Neon PostgreSQL database!');
  await client.end();
}

sync().catch(console.error);
