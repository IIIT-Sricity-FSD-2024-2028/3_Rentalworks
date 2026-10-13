import { Client } from 'pg';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

async function deployToNeon() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL or DATABASE_URL_UNPOOLED is missing in .env');
  }

  console.log('Connecting to Neon PostgreSQL Cloud...');
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('Successfully connected to Neon PostgreSQL Cloud!');

  // Verify current database and branch
  const dbInfo = await client.query('SELECT current_database() as db, current_user as usr, version() as ver;');
  console.log('Neon Database:', dbInfo.rows[0].db);
  console.log('Connected User:', dbInfo.rows[0].usr);

  console.log('\n======================================================');
  console.log('STEP 1: CREATING / ENSURING OWNER TABLES IN NEON CLOUD');
  console.log('======================================================');

  // 1. Ensure property_policies table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS "property_policies" (
      "id" SERIAL PRIMARY KEY,
      "owner_id" INTEGER REFERENCES "users"("id") ON DELETE CASCADE,
      "property_id" INTEGER REFERENCES "properties"("id") ON DELETE CASCADE,
      "rent_due_date" INTEGER DEFAULT 5,
      "late_fee" NUMERIC(10,2) DEFAULT 500.00,
      "security_deposit" INTEGER DEFAULT 2,
      "notice_period_days" INTEGER DEFAULT 30,
      "maintenance_rules" TEXT,
      "guest_policy" VARCHAR DEFAULT 'allowed',
      "guest_hours" VARCHAR DEFAULT '09:00-21:00',
      "smoking_allowed" BOOLEAN DEFAULT false,
      "pets_allowed" BOOLEAN DEFAULT false,
      "auto_renew" BOOLEAN DEFAULT true,
      "lease_term_months" INTEGER DEFAULT 11,
      "created_at" TIMESTAMP NOT NULL DEFAULT now(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
  console.log('✓ Table "property_policies" ensured in Neon Cloud.');

  // 2. Ensure columns on properties
  await client.query(`
    ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "address" character varying;
    ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "city" character varying;
    ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "state" character varying;
    ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "pincode" character varying;
    ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "type" character varying;
    ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "totalCapacity" integer;
    ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "totalRooms" integer;
    ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "occupiedRooms" integer;
    ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "monthlyRent" integer;
    ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "rules" jsonb;
  `);
  console.log('✓ Columns on "properties" ensured in Neon Cloud.');

  // 3. Ensure columns on users
  await client.query(`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company" character varying;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" character varying;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" character varying;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pincode" character varying;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" character varying;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "policy" jsonb;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionPlan" character varying;
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionFee" numeric(10,2);
  `);
  console.log('✓ Columns on "users" ensured in Neon Cloud.');

  // 4. Ensure columns on subscriptions
  await client.query(`
    ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "planName" character varying;
    ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "monthlyFee" numeric(10,2);
    ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "billingCycle" character varying DEFAULT 'monthly';
  `);
  console.log('✓ Columns on "subscriptions" ensured in Neon Cloud.');

  // 5. Ensure columns on complaints
  await client.query(`
    ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "title" character varying;
    ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "category" character varying;
    ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "reportedBy" character varying;
    ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "priority" character varying DEFAULT 'medium';
    ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "resolvedAt" date;
  `);
  console.log('✓ Columns on "complaints" ensured in Neon Cloud.');

  // 6. Ensure indexes
  await client.query(`CREATE INDEX IF NOT EXISTS "IDX_property_policies_owner" ON "property_policies" ("owner_id");`);
  await client.query(`CREATE INDEX IF NOT EXISTS "IDX_properties_ownerId" ON "properties" ("ownerId");`);
  await client.query(`CREATE INDEX IF NOT EXISTS "IDX_complaints_propertyId" ON "complaints" ("propertyId");`);
  await client.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_byUserId" ON "notifications" ("byUserId");`);
  await client.query(`CREATE INDEX IF NOT EXISTS "IDX_rooms_propertyId" ON "rooms" ("propertyId");`);
  await client.query(`CREATE INDEX IF NOT EXISTS "IDX_subscriptions_ownerId" ON "subscriptions" ("ownerId");`);
  console.log('✓ All indexes ensured in Neon Cloud.');

  console.log('\n======================================================');
  console.log('STEP 2: MIGRATING OWNER DATA INTO NEON CLOUD');
  console.log('======================================================');

  // Load owner data.json
  const dataJsonPath = path.join(__dirname, '..', '..', 'front-end', 'owner', 'owner_s', 'data.json');
  if (!fs.existsSync(dataJsonPath)) {
    throw new Error('data.json not found at ' + dataJsonPath);
  }
  const rawData = fs.readFileSync(dataJsonPath, 'utf-8');
  const ownerData = JSON.parse(rawData);

  // 1. Find or create Owner Rajesh Kumar
  const checkOwner = await client.query('SELECT id, name, email FROM users WHERE email = $1', [ownerData.profile.email]);
  let ownerId = 0;

  if (checkOwner.rows.length > 0) {
    ownerId = checkOwner.rows[0].id;
    console.log('Owner user "' + ownerData.profile.name + '" already exists in Neon with ID: ' + ownerId);
    await client.query(`
      UPDATE users SET
        name = $1,
        phone = $2,
        company = $3,
        city = $4,
        state = $5,
        pincode = $6,
        bio = $7,
        policy = $8,
        "subscriptionPlan" = COALESCE("subscriptionPlan", 'Premium'),
        "subscriptionFee" = COALESCE("subscriptionFee", 8000.00)
      WHERE id = $9
    `, [
      ownerData.profile.name,
      ownerData.profile.phone,
      ownerData.profile.company,
      ownerData.profile.city,
      ownerData.profile.state,
      ownerData.profile.pincode,
      ownerData.profile.bio,
      JSON.stringify(ownerData.policy),
      ownerId,
    ]);
  } else {
    const insertOwner = await client.query(`
      INSERT INTO users (
        name, email, phone, role, username, status, "joinDate",
        company, city, state, pincode, bio, policy, "subscriptionPlan", "subscriptionFee"
      ) VALUES (
        $1, $2, $3, 'owner', 'rajesh_owner', 'active', '2024-01-15',
        $4, $5, $6, $7, $8, $9, 'Premium', 8000.00
      ) RETURNING id;
    `, [
      ownerData.profile.name,
      ownerData.profile.email,
      ownerData.profile.phone,
      ownerData.profile.company,
      ownerData.profile.city,
      ownerData.profile.state,
      ownerData.profile.pincode,
      ownerData.profile.bio,
      JSON.stringify(ownerData.policy),
    ]);
    ownerId = insertOwner.rows[0].id;
    console.log('Created Owner user "' + ownerData.profile.name + '" in Neon with ID: ' + ownerId);
  }

  // 2. Insert or update property_policies record
  const checkPolicy = await client.query('SELECT id FROM property_policies WHERE owner_id = $1', [ownerId]);
  if (checkPolicy.rows.length === 0) {
    await client.query(`
      INSERT INTO property_policies (
        owner_id, rent_due_date, late_fee, security_deposit, notice_period_days,
        guest_policy, guest_hours, smoking_allowed, pets_allowed, auto_renew, lease_term_months,
        maintenance_rules
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11,
        $12
      );
    `, [
      ownerId,
      ownerData.policy.rentDueDay || 5,
      ownerData.policy.lateFee || 500,
      ownerData.policy.securityDeposit || 2,
      ownerData.policy.noticePeriod || 30,
      ownerData.policy.guestPolicy || 'allowed',
      ownerData.policy.guestHours || '09:00-21:00',
      Boolean(ownerData.policy.smokingAllowed),
      Boolean(ownerData.policy.petsAllowed),
      Boolean(ownerData.policy.autoRenew),
      ownerData.policy.leaseTermMonths || 11,
      'Standard maintenance window: 09:00-18:00',
    ]);
    console.log('✓ Inserted owner policy record in "property_policies" table.');
  } else {
    console.log('Policy record for owner already exists in "property_policies".');
  }

  // 3. Ensure active subscription in subscriptions table
  const checkSub = await client.query('SELECT id FROM subscriptions WHERE "ownerId" = $1', [ownerId]);
  if (checkSub.rows.length === 0) {
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await client.query(`
      INSERT INTO subscriptions (
        "ownerId", "planType", "planName", amount, "monthlyFee", "billingCycle",
        status, "startDate", "endDate"
      ) VALUES (
        $1, 'Premium', 'Premium', 8000.00, 8000.00, 'monthly',
        'active', $2, $3
      );
    `, [ownerId, today, nextYear]);
    console.log('✓ Inserted active subscription in "subscriptions" table.');
  }

  // 4. Migrate Properties
  const propMap = new Map();
  const propertiesList = ownerData.properties || [];

  for (let pIdx = 0; pIdx < propertiesList.length; pIdx++) {
    const prop = propertiesList[pIdx];
    const checkP = await client.query('SELECT id, name FROM properties WHERE LOWER(name) = LOWER($1)', [prop.name]);

    if (checkP.rows.length > 0) {
      const existingId = checkP.rows[0].id;
      propMap.set(prop.id, existingId);
      propMap.set(prop.name, existingId);
      console.log('Property "' + prop.name + '" exists in Neon (ID: ' + existingId + ').');

      // Update ownerId to match Rajesh Kumar if needed
      await client.query('UPDATE properties SET "ownerId" = $1, address = COALESCE(address, $2), city = COALESCE(city, $3), "monthlyRent" = COALESCE("monthlyRent", $4), "totalRooms" = COALESCE("totalRooms", $5), "occupiedRooms" = COALESCE("occupiedRooms", $6) WHERE id = $7', [
        ownerId,
        prop.address,
        prop.city,
        prop.monthlyRent,
        prop.totalRooms,
        prop.occupiedRooms,
        existingId,
      ]);
    } else {
      const location = prop.city + ', ' + prop.state;
      const rentMin = prop.monthlyRent || 7500;
      const rentMax = rentMin + 2000;
      const totalRooms = prop.totalRooms || 15;
      const occupiedRooms = prop.occupiedRooms || 0;
      const roomsStr = occupiedRooms + '/' + totalRooms;
      const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

      const newP = await client.query(`
        INSERT INTO properties (
          name, location, "ownerId", "rentMin", "rentMax", "safetyScore",
          rooms, occupancy, amenities, status, "docsVerified", "inspectionPassed",
          "commissionRate", compliance, "fireSafety", "changeRequestPending",
          address, city, state, pincode, type, "totalCapacity", "totalRooms",
          "occupiedRooms", "monthlyRent", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, 8.5,
          $6, $7, $8, 'approved', true, true,
          10.0, 'Verified', 'Yes', false,
          $9, $10, $11, $12, $13, $14, $15,
          $16, $17, now(), now()
        ) RETURNING id;
      `, [
        prop.name,
        location,
        ownerId,
        rentMin,
        rentMax,
        roomsStr,
        occupancy,
        JSON.stringify(prop.amenities || ['WiFi', 'AC']),
        prop.address,
        prop.city,
        prop.state,
        prop.pincode,
        prop.type,
        prop.totalCapacity,
        totalRooms,
        occupiedRooms,
        prop.monthlyRent,
      ]);

      const createdId = newP.rows[0].id;
      propMap.set(prop.id, createdId);
      propMap.set(prop.name, createdId);
      console.log('✓ Created property "' + prop.name + '" in Neon with ID: ' + createdId);

      // Populate rooms for newly created property
      for (let r = 1; r <= totalRooms; r++) {
        const roomNum = String(createdId * 100 + r);
        const isOcc = r <= occupiedRooms;
        await client.query(`
          INSERT INTO rooms (
            "roomNumber", "propertyId", capacity, "currentOccupancy", rent, status, "maintenanceStatus", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, 2, $3, $4, $5, 'Ready', now(), now()
          );
        `, [
          roomNum,
          createdId,
          isOcc ? 2 : 0,
          prop.monthlyRent,
          isOcc ? 'full' : 'available',
        ]);
      }
      console.log('  -> Seeded ' + totalRooms + ' rooms for "' + prop.name + '".');
    }
  }

  // 5. Migrate Issues / Complaints
  const issuesList = ownerData.issues || [];
  for (let j = 0; j < issuesList.length; j++) {
    const issue = issuesList[j];
    const targetPropId = propMap.get(issue.propertyId) || propMap.get(issue.propertyName) || 1;

    const checkC = await client.query('SELECT id FROM complaints WHERE description = $1 OR title = $2', [issue.description, issue.title]);
    if (checkC.rows.length === 0) {
      const statusNorm = issue.status.toLowerCase() === 'in progress' ? 'in-progress' : issue.status.toLowerCase();
      await client.query(`
        INSERT INTO complaints (
          "tenantId", "propertyId", title, category, "reportedBy",
          priority, description, status, "reportedAt", "createdAt", "updatedAt"
        ) VALUES (
          1, $1, $2, $3, $4,
          $5, $6, $7, $8, now(), now()
        );
      `, [
        targetPropId,
        issue.title,
        issue.category,
        issue.reportedBy,
        issue.priority.toLowerCase(),
        issue.description,
        statusNorm,
        issue.reportedDate || '2025-03-20',
      ]);
      console.log('✓ Migrated complaint: "' + issue.title + '"');
    }

    // Also sync into issues table if present
    const checkIss = await client.query('SELECT id FROM issues WHERE description = $1 OR title = $2', [issue.description, issue.title]);
    if (checkIss.rows.length === 0) {
      await client.query(`
        INSERT INTO issues (
          title, description, category, priority, status, "propertyId", "tenantId", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 1, now(), now()
        );
      `, [
        issue.title,
        issue.description,
        issue.category,
        issue.priority.toLowerCase(),
        issue.status.toLowerCase(),
        targetPropId,
      ]);
    }
  }

  // 6. Migrate Notifications
  const notifsList = ownerData.notifications || [];
  for (let k = 0; k < notifsList.length; k++) {
    const notif = notifsList[k];
    const checkN = await client.query('SELECT id FROM notifications WHERE title = $1', [notif.title]);
    if (checkN.rows.length === 0) {
      await client.query(`
        INSERT INTO notifications (
          title, message, type, priority, recipients, "sentAt", "byUserId", read, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, 'normal', 1, $4, $5, $6, now(), now()
        );
      `, [
        notif.title,
        notif.message,
        notif.type,
        notif.date || '2025-03-25',
        ownerId,
        Boolean(notif.read),
      ]);
      console.log('✓ Migrated notification: "' + notif.title + '"');
    }
  }

  console.log('\n======================================================');
  console.log('STEP 3: VERIFYING ALL TABLES IN NEON CLOUD');
  console.log('======================================================');

  const finalTables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log('All Base Tables in Neon Cloud:');
  for (let t = 0; t < finalTables.rows.length; t++) {
    const tName = finalTables.rows[t].table_name;
    const cntRes = await client.query('SELECT count(*) as count FROM "' + tName + '";');
    console.log(' - ' + tName + ' (rows: ' + cntRes.rows[0].count + ')');
  }

  console.log('\nOwner Rajesh Kumar ID in Neon is: ' + ownerId);
  console.log('Neon Cloud deployment completed successfully!');
  await client.end();
}

deployToNeon().catch(err => {
  console.error('Neon deployment failed:', err);
  process.exit(1);
});
