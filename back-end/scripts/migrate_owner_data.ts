import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';
import { config } from 'dotenv';

config();

async function runMigration() {
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:Sanjay%402023@localhost:5433/rentalworks_db';

  console.log('Connecting to database...');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  console.log('Connected to PostgreSQL successfully.');

  // 1. Locate and read data.json
  const possiblePaths = [
    path.join(__dirname, '..', '..', 'front-end', 'owner', 'owner_s', 'data.json'),
    path.join(__dirname, '..', '..', 'front-end-react', 'owner-react', 'public', 'data.json'),
  ];

  let rawJson = '';
  for (let pIdx = 0; pIdx < possiblePaths.length; pIdx++) {
    const curPath = possiblePaths[pIdx];
    if (fs.existsSync(curPath)) {
      rawJson = fs.readFileSync(curPath, 'utf-8');
      console.log('Found source data at:', curPath);
      break;
    }
  }

  if (!rawJson) {
    throw new Error('Could not find data.json to migrate');
  }

  const ownerData = JSON.parse(rawJson);

  // 2. Find or update Owner user
  console.log('\n--- 1. Migrating Owner Profile & Policy ---');
  const userCheck = await client.query(
    'SELECT id, name, email FROM users WHERE email = $1',
    ['rajesh.k@email.com'],
  );

  let ownerId = 6;
  if (userCheck.rows.length > 0) {
    ownerId = userCheck.rows[0].id;
    console.log('Found existing owner user with ID:', ownerId);

    // Update profile and policy fields
    await client.query(
      `UPDATE users SET
        company = COALESCE(company, $1),
        city = COALESCE(city, $2),
        state = COALESCE(state, $3),
        pincode = COALESCE(pincode, $4),
        bio = COALESCE(bio, $5),
        policy = COALESCE(policy, $6),
        "subscriptionPlan" = COALESCE("subscriptionPlan", $7)
      WHERE id = $8`,
      [
        ownerData.profile.company,
        ownerData.profile.city,
        ownerData.profile.state,
        ownerData.profile.pincode,
        ownerData.profile.bio,
        JSON.stringify(ownerData.policy),
        'Growth',
        ownerId,
      ],
    );
    console.log('Updated owner profile and policy in database.');
  } else {
    const newUserRes = await client.query(
      `INSERT INTO users (name, email, phone, role, username, status, "joinDate", company, city, state, pincode, bio, policy, "subscriptionPlan")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id`,
      [
        ownerData.profile.name,
        ownerData.profile.email,
        ownerData.profile.phone,
        'owner',
        'rajesh_owner',
        'active',
        '2024-01-01',
        ownerData.profile.company,
        ownerData.profile.city,
        ownerData.profile.state,
        ownerData.profile.pincode,
        ownerData.profile.bio,
        JSON.stringify(ownerData.policy),
        'Growth',
      ],
    );
    ownerId = newUserRes.rows[0].id;
    console.log('Created new owner user with ID:', ownerId);
  }

  // 3. Migrate Properties
  console.log('\n--- 2. Migrating Properties ---');
  const propertyIdMap = new Map<string, number>();

  const propertiesList = ownerData.properties || [];
  for (let i = 0; i < propertiesList.length; i++) {
    const prop = propertiesList[i];
    const checkProp = await client.query(
      'SELECT id, name FROM properties WHERE LOWER(name) = LOWER($1)',
      [prop.name],
    );

    if (checkProp.rows.length > 0) {
      const existingId = checkProp.rows[0].id;
      propertyIdMap.set(prop.id, existingId);
      propertyIdMap.set(prop.name, existingId);
      console.log('Property "' + prop.name + '" already exists (ID: ' + existingId + '). Skipping duplicate.');
    } else {
      const location = prop.city + ', ' + prop.state;
      const totalRooms = prop.totalRooms || 10;
      const occupiedRooms = prop.occupiedRooms || 0;
      const roomsStr = occupiedRooms + '/' + totalRooms;
      const occupancy = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
      const rentMin = prop.monthlyRent || 6000;
      const rentMax = rentMin + 2000;

      const insertRes = await client.query(
        `INSERT INTO properties (
          name, location, "ownerId", "rentMin", "rentMax", "safetyScore",
          rooms, occupancy, amenities, status, "docsVerified", "inspectionPassed",
          "commissionRate", compliance, "fireSafety", "changeRequestPending",
          address, city, state, pincode, type, "totalCapacity", "totalRooms",
          "occupiedRooms", "monthlyRent", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23,
          $24, $25, NOW(), NOW()
        ) RETURNING id`,
        [
          prop.name,
          location,
          ownerId,
          rentMin,
          rentMax,
          8.5,
          roomsStr,
          occupancy,
          JSON.stringify(prop.amenities || []),
          prop.status.toLowerCase() === 'active' ? 'approved' : 'pending',
          true,
          true,
          10,
          'Verified',
          'Yes',
          false,
          prop.address,
          prop.city,
          prop.state,
          prop.pincode,
          prop.type,
          prop.totalCapacity,
          prop.totalRooms,
          prop.occupiedRooms,
          prop.monthlyRent,
        ],
      );

      const newId = insertRes.rows[0].id;
      propertyIdMap.set(prop.id, newId);
      propertyIdMap.set(prop.name, newId);
      console.log('Migrated property "' + prop.name + '" -> ID: ' + newId);
    }
  }

  // 4. Migrate Complaints / Issues
  console.log('\n--- 3. Migrating Issues / Complaints ---');
  const issuesList = ownerData.issues || [];
  for (let j = 0; j < issuesList.length; j++) {
    const issue = issuesList[j];
    const targetPropId =
      propertyIdMap.get(issue.propertyId) ||
      propertyIdMap.get(issue.propertyName) ||
      1;

    const checkIssue = await client.query(
      'SELECT id FROM complaints WHERE description = $1 OR title = $2',
      [issue.description, issue.title],
    );

    if (checkIssue.rows.length > 0) {
      console.log('Issue "' + issue.title + '" already exists. Skipping duplicate.');
    } else {
      const statusNormalized = issue.status.toLowerCase();
      await client.query(
        `INSERT INTO complaints (
          "tenantId", "propertyId", title, category, "reportedBy",
          priority, description, status, "reportedAt", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, NOW(), NOW()
        )`,
        [
          1, // Link to seeded tenant 1
          targetPropId,
          issue.title,
          issue.category,
          issue.reportedBy,
          issue.priority.toLowerCase(),
          issue.description,
          statusNormalized === 'open' ? 'open' : statusNormalized === 'in progress' ? 'in-progress' : 'resolved',
          issue.reportedDate || '2025-03-20',
        ],
      );
      console.log('Migrated issue: "' + issue.title + '" (Property ID: ' + targetPropId + ')');
    }
  }

  // 5. Migrate Notifications
  console.log('\n--- 4. Migrating Notifications ---');
  const notifsList = ownerData.notifications || [];
  for (let k = 0; k < notifsList.length; k++) {
    const notif = notifsList[k];
    const checkNotif = await client.query(
      'SELECT id FROM notifications WHERE title = $1',
      [notif.title],
    );

    if (checkNotif.rows.length > 0) {
      console.log('Notification "' + notif.title + '" already exists. Skipping duplicate.');
    } else {
      await client.query(
        `INSERT INTO notifications (
          title, message, type, priority, recipients, "sentAt", "byUserId", read, "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
        )`,
        [
          notif.title,
          notif.message,
          notif.type,
          'normal',
          1,
          notif.date || '2025-03-25',
          ownerId,
          Boolean(notif.read),
        ],
      );
      console.log('Migrated notification: "' + notif.title + '"');
    }
  }

  console.log('\n=== MIGRATION COMPLETED SUCCESSFULLY ===');
  await client.end();
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
