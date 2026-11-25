import { AppDataSource } from '../data-source';

async function run() {
  console.log('Initializing AppDataSource...');
  await AppDataSource.initialize();
  console.log('Connected to PostgreSQL successfully.');

  console.log('Running pending migrations...');
  const migrations = await AppDataSource.runMigrations();
  console.log('Executed migrations count:', migrations.length);
  for (let i = 0; i < migrations.length; i++) {
    console.log('Applied migration:', migrations[i].name);
  }

  console.log('Verifying tables and columns in database...');
  const tables = await AppDataSource.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Tables:', tables.map(t => t.table_name));

  const subCols = await AppDataSource.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'subscriptions' 
    ORDER BY ordinal_position;
  `);
  console.log('Subscriptions columns:', subCols.map(c => c.column_name + ' (' + c.data_type + ')'));

  await AppDataSource.destroy();
  console.log('Done.');
}

run().catch(err => {
  console.error('Migration execution failed:', err);
  process.exit(1);
});
