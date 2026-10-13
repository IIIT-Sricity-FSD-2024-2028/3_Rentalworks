import { AppDataSource } from '../data-source';

async function inspect() {
  await AppDataSource.initialize();
  console.log('AppDataSource initialized successfully.');

  const tables = await AppDataSource.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log('--- TABLES IN DATABASE ---');
  for (let i = 0; i < tables.length; i++) {
    const tableName = tables[i].table_name;
    const res = await AppDataSource.query('SELECT count(*) as cnt FROM "' + tableName + '"');
    console.log(tableName + ' -> count: ' + res[0].cnt);
  }

  console.log('\n--- MIGRATIONS IN DB ---');
  const migs = await AppDataSource.query('SELECT * FROM migrations');
  console.log('Migrations:', migs);

  console.log('\n--- PROPERTIES COLUMNS ---');
  const pCols = await AppDataSource.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'properties' ORDER BY ordinal_position;");
  console.log(pCols.map(c => c.column_name + ' (' + c.data_type + ')').join(', '));

  console.log('\n--- COMPLAINTS COLUMNS ---');
  const cCols = await AppDataSource.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'complaints' ORDER BY ordinal_position;");
  console.log(cCols.map(c => c.column_name + ' (' + c.data_type + ')').join(', '));

  console.log('\n--- ISSUES COLUMNS ---');
  const issCols = await AppDataSource.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'issues' ORDER BY ordinal_position;");
  console.log(issCols.map(c => c.column_name + ' (' + c.data_type + ')').join(', '));

  console.log('\n--- SUBSCRIPTIONS COLUMNS ---');
  const subCols = await AppDataSource.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'subscriptions' ORDER BY ordinal_position;");
  console.log(subCols.map(c => c.column_name + ' (' + c.data_type + ')').join(', '));

  console.log('\n--- NOTIFICATIONS COLUMNS ---');
  const nCols = await AppDataSource.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications' ORDER BY ordinal_position;");
  console.log(nCols.map(c => c.column_name + ' (' + c.data_type + ')').join(', '));

  console.log('\n--- USER 6 DETAILS ---');
  const u6 = await AppDataSource.query('SELECT id, name, email, phone, role, "subscriptionPlan", "subscriptionFee", company, city, state, pincode, bio, policy FROM users WHERE id = 6');
  console.log('User 6 details:', JSON.stringify(u6[0], null, 2));

  console.log('\n--- USERS IN DATABASE ---');
  const users = await AppDataSource.query('SELECT id, name, email, role, "subscriptionPlan" FROM users ORDER BY id');
  for (let u = 0; u < users.length; u++) {
    console.log('User:', users[u].id, users[u].name, users[u].email, users[u].role, users[u].subscriptionPlan);
  }

  console.log('\n--- PROPERTIES IN DATABASE ---');
  const props = await AppDataSource.query('SELECT id, name, "ownerId", location, city, status, "totalRooms", "occupiedRooms", "monthlyRent" FROM properties ORDER BY id');
  for (let p = 0; p < props.length; p++) {
    console.log('Property:', props[p].id, props[p].name, 'ownerId:', props[p].ownerId, props[p].city, props[p].status, props[p].totalRooms, props[p].occupiedRooms, props[p].monthlyRent);
  }

  console.log('\n--- COMPLAINTS IN DATABASE ---');
  const complaints = await AppDataSource.query('SELECT id, "tenantId", "propertyId", title, category, priority, status FROM complaints ORDER BY id');
  for (let c = 0; c < complaints.length; c++) {
    console.log('Complaint:', complaints[c].id, complaints[c].title, 'propId:', complaints[c].propertyId, complaints[c].status);
  }

  console.log('\n--- NOTIFICATIONS IN DATABASE ---');
  const notifs = await AppDataSource.query('SELECT id, title, type, "byUserId", read FROM notifications ORDER BY id');
  for (let n = 0; n < notifs.length; n++) {
    console.log('Notification:', notifs[n].id, notifs[n].title, notifs[n].type, notifs[n].read);
  }

  await AppDataSource.destroy();
}

inspect().catch(err => {
  console.error('Inspection error:', err);
  process.exit(1);
});
