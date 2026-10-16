const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('1. Syncing user passwords...');
  const ownerHash = await bcrypt.hash('owner123', 10);
  await client.query('UPDATE users SET password = $1 WHERE username IN ($2, $3)', [ownerHash, 'owner1', 'owner2']);
  console.log('Updated owner1 and owner2 passwords to owner123');

  const adminHash = await bcrypt.hash('admin123', 10);
  await client.query('UPDATE users SET password = $1 WHERE username = $2', [adminHash, 'admin']);
  await client.query('UPDATE users SET password = $1 WHERE id = 11 OR username = $2', [adminHash, 'superadmin']);
  console.log('Updated admin and superadmin passwords to admin123');

  const wardenHash = await bcrypt.hash('warden123', 10);
  await client.query('UPDATE users SET password = $1 WHERE username = $2', [wardenHash, 'warden']);
  console.log('Updated warden password to warden123');

  const tenantHash = await bcrypt.hash('password123', 10);
  await client.query('UPDATE users SET password = $1 WHERE username IN ($2, $3, $4)', [tenantHash, 'tenant1', 'tenant2', 'tenant3']);
  console.log('Updated tenant1-3 passwords to password123');

  console.log('2. Syncing property images into live database...');
  const p1Images = JSON.stringify([
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&q=80',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1600&q=80',
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1600&q=80',
  ]);
  await client.query('UPDATE properties SET images = $1 WHERE id = 1', [p1Images]);

  const p2Images = JSON.stringify([
    'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=1600&q=80',
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&q=80',
    'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=1600&q=80',
  ]);
  await client.query('UPDATE properties SET images = $1 WHERE id = 2', [p2Images]);

  const p3Images = JSON.stringify([
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&q=80',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1600&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600&q=80',
  ]);
  await client.query('UPDATE properties SET images = $1 WHERE id = 3', [p3Images]);

  console.log('Property images successfully updated in database for properties 1, 2, and 3');

  // Verify
  const check = await client.query('SELECT id, name, images FROM properties ORDER BY id');
  console.log('Updated property records:', check.rows);

  await client.end();
}

run().catch(console.error);
