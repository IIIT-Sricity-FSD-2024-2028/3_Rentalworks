const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const owners = await client.query('SELECT id, username, email, role, password, status FROM users WHERE role = \'owner\'');
  console.log('Owners in database:');
  for (const o of owners.rows) {
    const isOwner123 = await bcrypt.compare('owner123', o.password || '');
    const isPassword = await bcrypt.compare('password', o.password || '');
    const isOwner = await bcrypt.compare('owner', o.password || '');
    const isOwner1 = await bcrypt.compare('owner1', o.password || '');
    console.log({
      id: o.id,
      username: o.username,
      email: o.email,
      role: o.role,
      status: o.status,
      passwordMatches: {
        owner123: isOwner123,
        password: isPassword,
        owner: isOwner,
        owner1: isOwner1
      }
    });
  }
  await client.end();
}

main().catch(console.error);
