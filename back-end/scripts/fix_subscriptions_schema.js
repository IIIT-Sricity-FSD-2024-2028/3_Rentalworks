const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  await client.query(`
    ALTER TABLE "subscriptions" ALTER COLUMN "planType" DROP NOT NULL;
    ALTER TABLE "subscriptions" ALTER COLUMN "amount" DROP NOT NULL;
  `);
  console.log('Successfully updated subscriptions columns in Neon Cloud!');
  await client.end();
}

run().catch(err => {
  console.error(err);
  client.end();
});
