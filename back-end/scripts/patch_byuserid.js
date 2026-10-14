require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    await client.query(`ALTER TABLE notifications ALTER COLUMN "byUserId" DROP NOT NULL;`);
    console.log('Successfully altered notifications: byUserId is now NULLABLE.');
  } catch (err) {
    console.error('Error altering column:', err.message);
  } finally {
    await client.end();
  }
}

main();
