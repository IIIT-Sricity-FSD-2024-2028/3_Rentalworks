const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();

  console.log('=== NEON CLOUD DATABASE AUDIT REPORT ===');

  // 1. Current Database & Branch Info
  const dbRes = await client.query('SELECT current_database(), current_user, inet_server_addr();');
  console.log('Database:', dbRes.rows[0].current_database);
  console.log('User:', dbRes.rows[0].current_user);

  // 2. All Base Tables
  const tablesRes = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  console.log('\n--- ALL BASE TABLES IN NEON (' + tablesRes.rows.length + ' tables) ---');
  for (let i = 0; i < tablesRes.rows.length; i++) {
    console.log((i + 1) + '. ' + tablesRes.rows[i].table_name);
  }

  // 3. Foreign Keys for Owner Tables
  const fkRes = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('properties', 'rooms', 'complaints', 'issues', 'notifications', 'property_policies', 'subscriptions')
    ORDER BY tc.table_name, kcu.column_name;
  `);
  console.log('\n--- FOREIGN KEY RELATIONSHIPS FOR OWNER TABLES ---');
  for (let j = 0; j < fkRes.rows.length; j++) {
    const row = fkRes.rows[j];
    console.log(row.table_name + '.' + row.column_name + ' -> ' + row.foreign_table_name + '.' + row.foreign_column_name + ' (' + row.constraint_name + ')');
  }

  // 4. Indexes for Owner Tables
  const idxRes = await client.query(`
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('properties', 'rooms', 'complaints', 'issues', 'notifications', 'property_policies', 'subscriptions')
    ORDER BY tablename, indexname;
  `);
  console.log('\n--- INDEXES ON OWNER TABLES ---');
  for (let k = 0; k < idxRes.rows.length; k++) {
    const idx = idxRes.rows[k];
    console.log(idx.tablename + ': ' + idx.indexname + ' => ' + idx.indexdef);
  }

  // 5. Data Row Counts
  const counts = await Promise.all([
    client.query('SELECT count(*) FROM users;'),
    client.query('SELECT count(*) FROM properties;'),
    client.query('SELECT count(*) FROM rooms;'),
    client.query('SELECT count(*) FROM complaints;'),
    client.query('SELECT count(*) FROM issues;'),
    client.query('SELECT count(*) FROM notifications;'),
    client.query('SELECT count(*) FROM property_policies;'),
    client.query('SELECT count(*) FROM subscriptions;')
  ]);

  console.log('\n--- ROW COUNTS IN NEON DATABASE ---');
  console.log('users: ' + counts[0].rows[0].count);
  console.log('properties: ' + counts[1].rows[0].count);
  console.log('rooms: ' + counts[2].rows[0].count);
  console.log('complaints: ' + counts[3].rows[0].count);
  console.log('issues: ' + counts[4].rows[0].count);
  console.log('notifications: ' + counts[5].rows[0].count);
  console.log('property_policies: ' + counts[6].rows[0].count);
  console.log('subscriptions: ' + counts[7].rows[0].count);

  await client.end();
}

run().catch(err => {
  console.error(err);
  client.end();
});
