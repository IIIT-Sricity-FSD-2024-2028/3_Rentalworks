const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT id, name, age, profession, company, "sleepSchedule", "foodHabit", "optedSmartMatch", "isTenant" FROM roommate_profiles ORDER BY id DESC LIMIT 10;');
  console.log('Roommate Profiles in Neon DB:');
  console.table(res.rows);
  await client.end();
}

run().catch(console.error);
