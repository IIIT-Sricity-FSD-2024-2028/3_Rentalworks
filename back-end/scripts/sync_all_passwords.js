const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to PostgreSQL');

  const ownerHash = await bcrypt.hash('owner123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);
  const wardenHash = await bcrypt.hash('warden123', 10);
  const tenantHash = await bcrypt.hash('tenant123', 10);

  // 1. Update all owner passwords to 'owner123'
  await client.query("UPDATE users SET password = $1 WHERE role = 'owner'", [ownerHash]);
  console.log("Updated all owners' passwords to 'owner123'");

  // 2. Update admins and superadmins
  await client.query("UPDATE users SET password = $1 WHERE role IN ('admin', 'super_admin')", [adminHash]);
  console.log("Updated admin/super_admin passwords to 'admin123'");

  // 3. Update wardens
  await client.query("UPDATE users SET password = $1 WHERE role = 'warden'", [wardenHash]);
  console.log("Updated warden passwords to 'warden123'");

  // 4. Update test tenants to accept both tenant123 and password123 if needed
  await client.query("UPDATE users SET password = $1 WHERE username IN ('tenant1', 'tenant2', 'tenant3')", [tenantHash]);
  console.log("Updated test tenants' passwords to 'tenant123'");

  // List all users and their roles
  const res = await client.query('SELECT id, name, username, email, role, status FROM users ORDER BY id ASC');
  console.log('\nAll Active Users in Neon Database:');
  console.table(res.rows);

  await client.end();
}

main().catch(console.error);
