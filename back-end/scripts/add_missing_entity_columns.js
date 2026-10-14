require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Neon PostgreSQL.');

    await client.query(`
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS "description" text;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS "gender" varchar DEFAULT 'unisex';
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS "rules" jsonb DEFAULT '[]';
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS "images" jsonb DEFAULT '[]';
      ALTER TABLE rooms ADD COLUMN IF NOT EXISTS "images" jsonb DEFAULT '[]';
    `);

    console.log('Successfully added missing entity columns to properties and rooms!');
  } catch (err) {
    console.error('Error adding columns:', err);
  } finally {
    await client.end();
  }
}

main();
