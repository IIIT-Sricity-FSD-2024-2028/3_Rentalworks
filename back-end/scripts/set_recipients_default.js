const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  await client.query('ALTER TABLE notifications ALTER COLUMN recipients SET DEFAULT 1');
  console.log('Successfully set DEFAULT 1 on notifications.recipients');
  await client.end();
}

main().catch(console.error);
