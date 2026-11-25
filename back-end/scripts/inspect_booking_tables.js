const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  await client.connect();
  const tables = ['users', 'bookings', 'booking_requests', 'payments', 'properties', 'rooms', 'tenant_stays'];
  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    console.log(`=== TABLE: ${t} ===`);
    console.log(res.rows.map(r => `${r.column_name}: ${r.data_type} (null: ${r.is_nullable})`).join(', '));
  }
  await client.end();
}
inspect().catch(console.error);
