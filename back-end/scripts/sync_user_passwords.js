const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const superAdminHash = await bcrypt.hash('admin123', 10);
  await client.query('UPDATE users SET password = $1 WHERE id = 11 OR username = $2', [superAdminHash, 'superadmin']);
  console.log('Superadmin password updated to admin123');

  const tenantPassHash = await bcrypt.hash('password123', 10);
  await client.query('UPDATE users SET password = $1 WHERE username = $2', [tenantPassHash, 'tenant1']);
  console.log('Tenant1 password set to password123');

  await client.end();
}

run().catch(console.error);
