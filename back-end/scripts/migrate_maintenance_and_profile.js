const { DataSource } = require('typeorm');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: './.env' });

async function runMigration() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await ds.initialize();
  console.log('Connected to Neon PostgreSQL for safe migration.');

  // 1. Add maintenanceStatus to rooms table if not exists
  await ds.query(`
    ALTER TABLE rooms 
    ADD COLUMN IF NOT EXISTS "maintenanceStatus" character varying DEFAULT 'Ready';
  `);
  console.log('Added maintenanceStatus column to rooms.');

  // Update existing rows where maintenanceStatus is NULL
  await ds.query(`
    UPDATE rooms 
    SET "maintenanceStatus" = 'Ready' 
    WHERE "maintenanceStatus" IS NULL;
  `);
  console.log('Set default maintenanceStatus to Ready for existing rooms.');

  // 2. Add address to users table if not exists
  await ds.query(`
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS address character varying;
  `);
  console.log('Added address column to users.');

  // 3. Check if warden user exists, if not, create one
  const wardenCheck = await ds.query(`
    SELECT id, username, email, role, name, address, phone 
    FROM users 
    WHERE role = 'warden' OR username = 'warden';
  `);

  if (wardenCheck.length === 0) {
    const passwordHash = await bcrypt.hash('warden123', 10);
    const insertRes = await ds.query(`
      INSERT INTO users (name, email, phone, role, username, password, status, "joinDate", address, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, name, email, phone, role, username, address;
    `, [
      'Warden Officer',
      'warden@pgrentals.com',
      '+91 98765 00007',
      'warden',
      'warden',
      passwordHash,
      'active',
      '2026-01-05',
      '123 Main Street, Mumbai'
    ]);
    console.log('Created default warden user:', insertRes[0]);
  } else {
    console.log('Warden user already exists:', wardenCheck[0]);
  }

  // 4. Verify rooms records
  const rooms = await ds.query('SELECT id, "roomNumber", "propertyId", capacity, "currentOccupancy", rent, status, "maintenanceStatus" FROM rooms ORDER BY id;');
  console.log('Verified rooms in Neon:', rooms);

  await ds.destroy();
  console.log('Migration completed successfully.');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
