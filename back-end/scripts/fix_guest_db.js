const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const passwordHash = await bcrypt.hash('guest123', 10);

  // 1. Check user 18 and guest bookings/stays
  const bookings18 = await client.query('SELECT * FROM bookings WHERE "tenantId" = 18');
  console.log('Bookings for user 18:', bookings18.rows);

  const stays18 = await client.query('SELECT * FROM tenant_stays WHERE "tenantId" = 18');
  console.log('Stays for user 18:', stays18.rows);

  // Delete stays and bookings for user 18 so it has NO tenant records
  if (stays18.rows.length > 0) {
    await client.query('DELETE FROM tenant_stays WHERE "tenantId" = 18');
    console.log('Deleted stays for user 18');
  }
  if (bookings18.rows.length > 0) {
    await client.query('DELETE FROM bookings WHERE "tenantId" = 18');
    console.log('Deleted bookings for user 18');
  }

  // 2. Update user 18 to be strictly a GUEST with password guest123
  await client.query(`
    UPDATE users 
    SET role = 'guest', 
        password = $1, 
        name = 'Guest User', 
        username = 'guest', 
        email = 'guest@gmail.com', 
        status = 'active',
        "updatedAt" = NOW()
    WHERE id = 18
  `, [passwordHash]);
  console.log('✓ Updated user 18 to role=guest with password=guest123');

  // 3. Ensure 'guestuser' also exists in users table with role=guest and password=guest123
  const guestUserRow = await client.query('SELECT id, username, email FROM users WHERE username = $1 OR email = $2', ['guestuser', 'guestuser@gmail.com']);
  if (guestUserRow.rows.length === 0) {
    const res = await client.query(`
      INSERT INTO users (name, email, phone, role, username, password, status, "joinDate", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
      RETURNING id, name, email, username, role;
    `, ['Guest User', 'guestuser@gmail.com', '+91 98765 00098', 'guest', 'guestuser', passwordHash, 'active']);
    console.log('✓ Created guestuser account:', res.rows[0]);
  } else {
    await client.query(`
      UPDATE users 
      SET role = 'guest', 
          password = $1, 
          username = 'guestuser',
          "updatedAt" = NOW()
      WHERE id = $2
    `, [passwordHash, guestUserRow.rows[0].id]);
    console.log('✓ Updated existing guestuser account to role=guest, password=guest123');
  }

  // 4. Verify all guest accounts
  const allGuests = await client.query(`
    SELECT id, name, email, username, role, status FROM users 
    WHERE username IN ('guest', 'guestuser') OR email IN ('guest@gmail.com', 'guestuser@gmail.com')
  `);
  console.log('All guest accounts now:', allGuests.rows);

  await client.end();
}

main().catch(console.error);
