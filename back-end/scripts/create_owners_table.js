const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await client.connect();
  console.log('Connected to Neon Cloud database...');

  // 1. Create table owners
  await client.query(`
    CREATE TABLE IF NOT EXISTS "owners" (
      "id" SERIAL PRIMARY KEY,
      "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
      "full_name" character varying(255) NOT NULL,
      "name" character varying(255),
      "email" character varying(255) UNIQUE NOT NULL,
      "phone" character varying(50),
      "role" character varying(50) DEFAULT 'owner',
      "company" character varying(255) DEFAULT 'Iyer Properties Pvt Ltd',
      "city" character varying(100) DEFAULT 'Chennai',
      "state" character varying(100) DEFAULT 'Tamil Nadu',
      "pincode" character varying(20) DEFAULT '600001',
      "bio" text DEFAULT 'Experienced PG owner with 10+ years in the rental business.',
      "avatar" character varying(255),
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
  console.log('✓ "owners" table created in Neon Cloud.');

  // 2. Populate owners from users with role = 'owner'
  const ownersFromUsers = await client.query(`
    SELECT id, name, email, phone, role, "createdAt", "updatedAt"
    FROM "users"
    WHERE role = 'owner';
  `);

  for (let i = 0; i < ownersFromUsers.rows.length; i++) {
    const u = ownersFromUsers.rows[i];
    await client.query(`
      INSERT INTO "owners" (
        "id", "user_id", "full_name", "name", "email", "phone", "role",
        "company", "city", "state", "pincode", "bio", "avatar", "created_at", "updated_at"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, $14, $15
      )
      ON CONFLICT ("email") DO UPDATE SET
        "full_name" = EXCLUDED."full_name",
        "name" = EXCLUDED."name",
        "phone" = EXCLUDED."phone",
        "company" = EXCLUDED."company",
        "city" = EXCLUDED."city",
        "state" = EXCLUDED."state",
        "pincode" = EXCLUDED."pincode",
        "bio" = EXCLUDED."bio",
        "updated_at" = now();
    `, [
      u.id,
      u.id,
      u.name || 'PG Owner',
      u.name || 'PG Owner',
      u.email,
      u.phone || '+91 98765 43210',
      u.role || 'owner',
      u.company || 'Iyer Properties Pvt Ltd',
      u.city || 'Chennai',
      u.state || 'Tamil Nadu',
      u.pincode || '600001',
      u.bio || 'Experienced PG owner with 10+ years in the rental business.',
      u.avatar || null,
      u.createdAt || new Date(),
      u.updatedAt || new Date(),
    ]);
    console.log('✓ Inserted/Updated owner in "owners" table: ID ' + u.id + ' (' + u.name + ', ' + u.email + ')');
  }

  // Set sequence if needed
  await client.query(`SELECT setval(pg_get_serial_sequence('owners', 'id'), COALESCE((SELECT MAX(id) FROM owners), 1));`);

  // Verify
  const count = await client.query('SELECT count(*) FROM "owners";');
  console.log('✓ Total rows in "owners" table: ' + count.rows[0].count);

  const sample = await client.query('SELECT id, full_name, email, role, company FROM "owners" ORDER BY id;');
  console.log('Sample rows:');
  console.log(JSON.stringify(sample.rows, null, 2));

  await client.end();
}

run().catch(err => {
  console.error(err);
  client.end();
});
