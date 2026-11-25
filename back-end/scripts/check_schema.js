const { DataSource } = require('typeorm');
require('dotenv').config({ path: './.env' });

async function check() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await ds.initialize();
  console.log('Connected to DB safely.');
  
  const tables = await ds.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Tables in public schema:', tables.map(t => t.table_name));

  const roomColumns = await ds.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'rooms'
    ORDER BY ordinal_position;
  `);
  console.log('Rooms columns:', roomColumns);

  const roomsData = await ds.query(`
    SELECT * FROM rooms ORDER BY id;
  `);
  console.log('Rooms records:', roomsData);

  const userColumns = await ds.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position;
  `);
  console.log('Users columns:', userColumns.map(c => c.column_name));

  const stayColumns = await ds.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'tenant_stays'
    ORDER BY ordinal_position;
  `);
  console.log('tenant_stays columns:', stayColumns.map(c => c.column_name));

  await ds.destroy();
}

check().catch(console.error);
