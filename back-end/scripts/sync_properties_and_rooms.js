const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function sync() {
  await client.connect();
  console.log('Connected to Neon PostgreSQL for property sync.');

  // 1. Update existing properties 1, 2, 3 to match frontend PG listings
  await client.query(`
    UPDATE properties
    SET
      name = 'Sunrise PG Residency',
      location = 'Koramangala, Bangalore',
      "rentMin" = 6500,
      "rentMax" = 16000,
      "safetyScore" = 9.5,
      rooms = '1/2/3',
      amenities = '["wifi", "ac", "cctv", "laundry", "parking", "meals", "backup", "water"]'::jsonb,
      status = 'approved',
      compliance = 'Verified',
      "fireSafety" = 'Yes'
    WHERE id = 1;
  `);
  console.log('âœ“ Property #1 synced: Sunrise PG Residency');

  await client.query(`
    UPDATE properties
    SET
      name = 'Sri Sai Boys PG',
      location = 'Anna Nagar, Chennai',
      "rentMin" = 7500,
      "rentMax" = 12000,
      "safetyScore" = 8.8,
      rooms = '1/2',
      amenities = '["wifi", "ac", "geyser", "parking", "cctv"]'::jsonb,
      status = 'approved',
      compliance = 'Verified',
      "fireSafety" = 'Yes'
    WHERE id = 2;
  `);
  console.log('âœ“ Property #2 synced: Sri Sai Boys PG');

  await client.query(`
    UPDATE properties
    SET
      name = 'Lakshmi Girls PG',
      location = 'Velachery, Chennai',
      "rentMin" = 8500,
      "rentMax" = 14000,
      "safetyScore" = 9.2,
      rooms = '1/3',
      amenities = '["wifi", "ac", "cctv", "laundry", "meals"]'::jsonb,
      status = 'approved',
      compliance = 'Verified',
      "fireSafety" = 'Yes'
    WHERE id = 3;
  `);
  console.log('âœ“ Property #3 synced: Lakshmi Girls PG');

  // 2. Upsert Property 4, 5, 6
  const newProps = [
    {
      id: 4,
      name: 'Green Nest Co-Living',
      location: 'Koramangala, Bangalore',
      ownerId: 4,
      rentMin: 10000,
      rentMax: 16000,
      safetyScore: 9.4,
      rooms: '1/2',
      occupancy: 35,
      amenities: JSON.stringify(['wifi', 'ac', 'gym', 'laundry', 'parking', 'cctv']),
    },
    {
      id: 5,
      name: 'Royal Stay Premium PG',
      location: 'Andheri West, Mumbai',
      ownerId: 5,
      rentMin: 9000,
      rentMax: 15000,
      safetyScore: 9.1,
      rooms: '1/2/3',
      occupancy: 42,
      amenities: JSON.stringify(['wifi', 'ac', 'gym', 'housekeeping', 'cctv']),
    },
    {
      id: 6,
      name: 'Stanza Living Madrid House',
      location: 'Hinjawadi, Pune',
      ownerId: 16,
      rentMin: 8000,
      rentMax: 13500,
      safetyScore: 9.3,
      rooms: '1/2/3',
      occupancy: 50,
      amenities: JSON.stringify(['wifi', 'ac', 'gaming_zone', 'meals', 'cctv']),
    }
  ];

  for (const p of newProps) {
    await client.query(`
      INSERT INTO properties
      (id, name, location, "ownerId", "rentMin", "rentMax", "safetyScore", rooms, occupancy, amenities, status, "docsVerified", "inspectionPassed", "commissionRate", compliance, "fireSafety", "changeRequestPending", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, 'approved', true, true, 10.00, 'Verified', 'Yes', false, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        location = EXCLUDED.location,
        "rentMin" = EXCLUDED."rentMin",
        "rentMax" = EXCLUDED."rentMax",
        "safetyScore" = EXCLUDED."safetyScore",
        rooms = EXCLUDED.rooms,
        amenities = EXCLUDED.amenities;
    `, [p.id, p.name, p.location, p.ownerId, p.rentMin, p.rentMax, p.safetyScore, p.rooms, p.occupancy, p.amenities]);
    console.log(`âœ“ Property #${p.id} synced: ${p.name}`);
  }

  // 3. Update Sequence to prevent primary key collisions on future inserts
  await client.query(`
    SELECT setval('properties_id_seq', (SELECT GREATEST(MAX(id), 15) FROM properties));
  `);
  console.log('âœ“ Updated properties_id_seq sequence.');

  // 4. Ensure standard rooms exist for properties 1 to 6
  const roomsToSeed = [
    // Prop 1 (Sunrise PG)
    { roomNumber: '101', propertyId: 1, capacity: 2, currentOccupancy: 1, rent: 8500, status: 'available' },
    { roomNumber: '102', propertyId: 1, capacity: 1, currentOccupancy: 1, rent: 16000, status: 'full' },
    { roomNumber: '103', propertyId: 1, capacity: 3, currentOccupancy: 1, rent: 6500, status: 'available' },
    // Prop 2 (Sri Sai)
    { roomNumber: '201', propertyId: 2, capacity: 1, currentOccupancy: 0, rent: 12000, status: 'available' },
    { roomNumber: '202', propertyId: 2, capacity: 2, currentOccupancy: 0, rent: 7500, status: 'available' },
    // Prop 3 (Lakshmi Girls)
    { roomNumber: '301', propertyId: 3, capacity: 1, currentOccupancy: 0, rent: 14000, status: 'available' },
    { roomNumber: '302', propertyId: 3, capacity: 3, currentOccupancy: 1, rent: 8500, status: 'available' },
    // Prop 4 (Green Nest Co-Living)
    { roomNumber: '401', propertyId: 4, capacity: 1, currentOccupancy: 0, rent: 16000, status: 'available' },
    { roomNumber: '402', propertyId: 4, capacity: 2, currentOccupancy: 0, rent: 10000, status: 'available' },
    // Prop 5 (Royal Stay)
    { roomNumber: '501', propertyId: 5, capacity: 1, currentOccupancy: 0, rent: 15000, status: 'available' },
    { roomNumber: '502', propertyId: 5, capacity: 2, currentOccupancy: 0, rent: 9000, status: 'available' },
    // Prop 6 (Stanza Living)
    { roomNumber: '601', propertyId: 6, capacity: 1, currentOccupancy: 0, rent: 13500, status: 'available' },
    { roomNumber: '602', propertyId: 6, capacity: 2, currentOccupancy: 0, rent: 8000, status: 'available' }
  ];

  for (const r of roomsToSeed) {
    const existing = await client.query('SELECT id FROM rooms WHERE "roomNumber" = $1 AND "propertyId" = $2;', [r.roomNumber, r.propertyId]);
    if (existing.rows.length === 0) {
      await client.query(`
        INSERT INTO rooms ("roomNumber", "propertyId", capacity, "currentOccupancy", rent, status, "maintenanceStatus", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, 'Ready', NOW(), NOW());
      `, [r.roomNumber, r.propertyId, r.capacity, r.currentOccupancy, r.rent, r.status]);
      console.log(`âœ“ Added Room #${r.roomNumber} for Property #${r.propertyId}`);
    } else {
      await client.query(`
        UPDATE rooms
        SET capacity = $1, rent = $2, status = $3, "maintenanceStatus" = 'Ready'
        WHERE id = $4;
      `, [r.capacity, r.rent, r.status, existing.rows[0].id]);
    }
  }

  // 5. Verify properties and rooms
  const allProps = await client.query('SELECT id, name, location, rooms, occupancy, status FROM properties ORDER BY id ASC;');
  console.log('\n--- All Properties in Neon PostgreSQL ---');
  console.table(allProps.rows);

  await client.end();
  console.log('Sync successfully completed.');
}

sync().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
