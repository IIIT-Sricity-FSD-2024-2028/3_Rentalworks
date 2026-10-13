const path = require('path');
const backendDir = path.join(__dirname, '..', 'back-end');

// Load pg and dotenv from back-end/node_modules
const dotenv = require(path.join(backendDir, 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(backendDir, '.env') });

const { Client } = require(path.join(backendDir, 'node_modules', 'pg'));

async function viewDb() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres:Sanjay%402023@localhost:5433/rentalworks_db';

  const client = new Client({ connectionString });
  await client.connect();

  console.log('\n======================================================');
  console.log('  1. OWNERS TABLE (users table WHERE role = \'owner\')');
  console.log('======================================================');
  const owners = await client.query(
    `SELECT id, name, email, phone, role, company, city, state, pincode, "subscriptionPlan"
     FROM users 
     WHERE role = 'owner'`
  );
  console.table(owners.rows);

  console.log('\n======================================================');
  console.log('  2. OWNER PROPERTIES (properties table)');
  console.log('======================================================');
  const props = await client.query(
    `SELECT id, name, "ownerId", city, "totalRooms", "occupiedRooms", "monthlyRent", status
     FROM properties 
     WHERE "ownerId" = 6`
  );
  console.table(props.rows);

  console.log('\n======================================================');
  console.log('  3. OWNER ISSUES / COMPLAINTS (complaints table)');
  console.log('======================================================');
  const complaints = await client.query(
    `SELECT id, "propertyId", title, priority, status, "reportedBy"
     FROM complaints`
  );
  console.table(complaints.rows);

  console.log('\n======================================================');
  console.log('  4. NOTIFICATIONS (notifications table)');
  console.log('======================================================');
  const notifs = await client.query(
    `SELECT id, title, type, read, "sentAt"
     FROM notifications`
  );
  console.table(notifs.rows);

  await client.end();
}

viewDb().catch((err) => {
  console.error('Error connecting to DB:', err.message);
  process.exit(1);
});
