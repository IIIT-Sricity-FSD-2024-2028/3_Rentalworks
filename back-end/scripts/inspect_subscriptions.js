const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'subscriptions'
    ORDER BY ordinal_position;
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

run().catch(err => {
  console.error(err);
  client.end();
});
