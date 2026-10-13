const { Client } = require('pg');
require('dotenv').config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function seed() {
  await client.connect();

  console.log('--- Creating warden_notifications and rule_violations in Neon DB ---');

  // 1. Create warden_notifications table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "warden_notifications" (
      "id" SERIAL PRIMARY KEY,
      "title" VARCHAR NOT NULL,
      "message" TEXT NOT NULL,
      "type" VARCHAR NOT NULL DEFAULT 'issue',
      "priority" VARCHAR NOT NULL DEFAULT 'medium',
      "read" BOOLEAN NOT NULL DEFAULT FALSE,
      "senderName" VARCHAR,
      "senderRole" VARCHAR,
      "propertyName" VARCHAR,
      "roomNumber" VARCHAR,
      "tenantId" INTEGER,
      "propertyId" INTEGER,
      "sourceReferenceId" INTEGER,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
  console.log('✓ Table "warden_notifications" created successfully in Neon DB.');

  // 2. Create rule_violations table with foreign key matching users table
  await client.query(`
    CREATE TABLE IF NOT EXISTS "rule_violations" (
      "id" SERIAL PRIMARY KEY,
      "tenantId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "tenantName" VARCHAR,
      "roomNumber" VARCHAR,
      "type" VARCHAR NOT NULL,
      "severity" VARCHAR NOT NULL DEFAULT 'low',
      "warningCount" INTEGER NOT NULL DEFAULT 1,
      "reportedAt" DATE NOT NULL DEFAULT CURRENT_DATE,
      "description" TEXT,
      "status" VARCHAR NOT NULL DEFAULT 'active',
      "escalatedToOwner" BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
  console.log('✓ Table "rule_violations" created successfully with foreign key referencing "users"("id").');

  // Verify tenants in users table
  const tenants = await client.query(`SELECT id, name FROM users WHERE role = 'tenant' ORDER BY id;`);
  console.log('Available tenants in users table:', tenants.rows);

  // 3. Seed warden_notifications if empty
  const notifCount = await client.query(`SELECT COUNT(*) FROM warden_notifications;`);
  if (parseInt(notifCount.rows[0].count) === 0) {
    console.log('Seeding warden_notifications table...');
    const t1 = tenants.rows[0] || { id: 1, name: 'Arun Kumar' };
    const t2 = tenants.rows[1] || { id: 2, name: 'Suresh Raina' };

    await client.query(`
      INSERT INTO warden_notifications 
      ("title", "message", "type", "priority", "read", "senderName", "senderRole", "propertyName", "roomNumber", "tenantId", "propertyId", "createdAt", "updatedAt")
      VALUES
      ('Tenant Issue: Water Pipe Leakage', 'Kitchen sink pipe is leaking continuously and needs plumbing repair.', 'issue', 'medium', false, $1, 'tenant', 'Green Nest PG', '102', $2, 1, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
      ('Owner Message: Inspect Fire Safety', 'Please ensure all fire extinguishers on floor 2 and floor 3 are inspected this week.', 'owner_message', 'high', false, 'PG Owner One', 'owner', 'Green Nest PG', NULL, NULL, 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
      ('Tenant Issue: Slow Wi-Fi', 'Internet speed drops significantly during evening hours on the 1st floor.', 'issue', 'low', true, $3, 'tenant', 'Green Nest PG', '101', $4, 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');
    `, [t1.name, t1.id, t2.name, t2.id]);
    console.log('✓ warden_notifications seeded successfully.');
  } else {
    console.log(`warden_notifications already contains ${notifCount.rows[0].count} records.`);
  }

  // 4. Seed rule_violations if empty
  const violCount = await client.query(`SELECT COUNT(*) FROM rule_violations;`);
  if (parseInt(violCount.rows[0].count) === 0) {
    console.log('Seeding rule_violations table (matching users table)...');
    const t1 = tenants.rows[0] || { id: 1, name: 'Arun Kumar' };
    const t2 = tenants.rows[1] || { id: 2, name: 'Suresh Raina' };
    const t3 = tenants.rows[2] || tenants.rows[0];

    await client.query(`
      INSERT INTO rule_violations
      ("tenantId", "tenantName", "roomNumber", "type", "severity", "warningCount", "reportedAt", "description", "status", "escalatedToOwner", "createdAt", "updatedAt")
      VALUES
      ($1, $2, '102', 'Late Night Entry', 'medium', 2, '2026-10-10', 'Returned after curfew hours (11:30 PM) without prior permission.', 'active', false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
      ($3, $4, '101', 'Smoking Indoors', 'high', 3, '2026-10-11', 'Smoking detected inside room contrary to PG safety rules.', 'warned', true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
      ($5, $6, '202', 'Noise Complaint', 'low', 1, '2026-10-12', 'Loud music after 10 PM reported by neighboring room.', 'active', false, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');
    `, [t1.id, t1.name, t2.id, t2.name, t3.id, t3.name]);
    console.log('✓ rule_violations seeded successfully with users matching users table.');
  } else {
    console.log(`rule_violations already contains ${violCount.rows[0].count} records.`);
  }

  // Final check
  const checkNotifs = await client.query(`SELECT id, title, "senderName", "senderRole", "propertyName" FROM warden_notifications;`);
  console.log('Warden Notifications:', checkNotifs.rows);

  const checkViols = await client.query(`SELECT id, "tenantId", "tenantName", type, severity, "warningCount" FROM rule_violations;`);
  console.log('Rule Violations:', checkViols.rows);

  await client.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
