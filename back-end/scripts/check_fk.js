const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  const fks = await client.query(`
    SELECT
      tc.table_schema, 
      tc.constraint_name, 
      tc.table_name, 
      kcu.column_name, 
      ccu.table_schema AS foreign_table_schema,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'notifications';
  `);
  console.log('Foreign keys on notifications:', fks.rows);

  // Now let's try inserting exactly what api.controller.ts is doing:
  try {
    const res = await client.query(`
      INSERT INTO notifications ("title", "message", "type", "priority", "recipients", "sentAt", "read", "isRead", "byUserId", "targetRole", "targetPropertyId", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *;
    `, [
      'Water Tank Cleaning Notice',
      'Water tank cleaning will take place tomorrow from 10 AM to 1 PM.',
      'announcement',
      'high',
      1,
      '2026-10-17',
      false,
      false,
      4,
      'tenant',
      1
    ]);
    console.log('Postgres Insert result:', res.rows[0]);
  } catch (err) {
    console.error('Postgres Insert error:', err);
  }

  await client.end();
}

main().catch(console.error);
