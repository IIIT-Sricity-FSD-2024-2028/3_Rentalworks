const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const props = await client.query('SELECT id, name, location, rooms, occupancy FROM properties ORDER BY id ASC;');
  console.log('Properties in DB:');
  console.table(props.rows);
  const rooms = await client.query('SELECT id, "roomNumber", "propertyId", capacity, "currentOccupancy", rent, status FROM rooms ORDER BY id ASC LIMIT 10;');
  console.log('Rooms in DB:');
  console.table(rooms.rows);
  const bookings = await client.query('SELECT id, "tenantId", "propertyId", room, "checkIn", duration, status, rent FROM bookings LIMIT 5;');
  console.log('Bookings in DB:');
  console.table(bookings.rows);
  const payments = await client.query('SELECT id, "tenantId", "propertyId", room, amount, method, status, clearance FROM payments LIMIT 5;');
  console.log('Payments in DB:');
  console.table(payments.rows);
  await client.end();
}
run().catch(console.error);
