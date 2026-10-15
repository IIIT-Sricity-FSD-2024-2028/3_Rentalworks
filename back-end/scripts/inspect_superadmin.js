const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query('SELECT id, username, role, password, "twoFactorEnabled" FROM users WHERE id = 11');
  console.log('Superadmin record:', res.rows[0]);
  await client.end();
}

run().catch(console.error);
