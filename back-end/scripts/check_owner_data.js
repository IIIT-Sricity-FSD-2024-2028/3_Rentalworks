const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const cRes = await client.query(`
    SELECT c.id, c.title, c."propertyId", p."ownerId"
    FROM complaints c
    LEFT JOIN properties p ON c."propertyId" = p.id
  `);
  console.log('Complaints:', cRes.rows);

  const iRes = await client.query(`
    SELECT i.id, i.title, i."propertyId", p."ownerId"
    FROM issues i
    LEFT JOIN properties p ON i."propertyId" = p.id
  `);
  console.log('Issues:', iRes.rows);

  const nRes = await client.query(`
    SELECT id, title, "userId", "targetRole", "recipientUserIds"
    FROM notifications
    ORDER BY id DESC LIMIT 10
  `);
  console.log('Notifications:', nRes.rows);

  await client.end();
}

run().catch(console.error);
