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

  // Check if exists
  const existing = await client.query('SELECT id, name, email, username FROM users WHERE email = $1 OR username = $2', ['guest@gmail.com', 'guest']);
  if (existing.rows.length === 0) {
    const res = await client.query(`
      INSERT INTO users (name, email, phone, role, username, password, status, "joinDate", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
      RETURNING id, name, email, phone, role, username;
    `, ['Guest User', 'guest@gmail.com', '+91 98765 00099', 'guest', 'guest', passwordHash, 'active']);
    console.log('✓ Created guest user:', res.rows[0]);
  } else {
    await client.query('UPDATE users SET password = $1 WHERE id = $2', [passwordHash, existing.rows[0].id]);
    console.log('✓ Updated password for existing guest user:', existing.rows[0]);
  }
  await client.end();
}

main().catch(console.error);
