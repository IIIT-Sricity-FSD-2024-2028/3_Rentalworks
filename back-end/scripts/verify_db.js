const { DataSource } = require('typeorm');
require('dotenv').config({ path: './.env' });

async function verifyDb() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await ds.initialize();
  const res = await ds.query('SELECT current_database() as db, current_schema() as schema, current_user as usr;');
  console.log('Safe DB info:', res[0]);
  await ds.destroy();
}

verifyDb().catch(console.error);
