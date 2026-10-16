const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await client.connect();
  console.log('Connected to PostgreSQL database');

  // Let's inspect users
  const usersRes = await client.query('SELECT id, username, email, role FROM users ORDER BY id ASC');
  console.log('Users:', usersRes.rows);

  // Let's inspect properties
  const propRes = await client.query('SELECT id, name, "ownerId", images FROM properties');
  console.log('Properties:', propRes.rows);

  // Let's inspect notifications
  const notifRes = await client.query('SELECT id, title, type, priority, "userId", "byUserId", "targetRole", "deliveryStatus" FROM notifications ORDER BY id DESC LIMIT 10');
  console.log('Recent Notifications:', notifRes.rows);

  // Ensure owner (ID 4 - owner1) has realistic incoming notifications from other actors:
  // 1. Super Admin announcement to all owners
  // 2. Warden inspection/maintenance report for Sunrise PG Residency
  // 3. Tenant issue reported
  // 4. Booking notification

  const sampleNotifs = [
    {
      title: 'Monthly Safety & Fire Audit Completed',
      message: 'The bi-annual fire drill and safety inspection for Sunrise PG Residency was conducted successfully today. All smoke detectors and extinguishers passed.',
      type: 'warden',
      priority: 'normal',
      recipients: 1,
      sentAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
      userId: 4,
      byUserId: 3, // Warden
      targetRole: 'owner',
      targetPropertyId: 1,
      deliveryStatus: 'delivered',
      isRead: false
    },
    {
      title: 'Platform Maintenance & GST Compliance Notice',
      message: 'Attention Property Owners: Scheduled system maintenance on Sunday from 02:00 AM to 04:00 AM IST. Invoicing & GST reports for Q3 are now downloadable.',
      type: 'admin',
      priority: 'high',
      recipients: 1,
      sentAt: new Date(Date.now() - 3600 * 1000 * 20).toISOString(),
      userId: 4,
      byUserId: 1, // Super Admin
      targetRole: 'owner',
      targetPropertyId: null,
      deliveryStatus: 'delivered',
      isRead: false
    },
    {
      title: 'Tenant Maintenance Request: Room 102 Tap Leak',
      message: 'Tenant reported a minor bathroom tap leakage in Room 102 at Sunrise PG Residency. Plumber has been scheduled for tomorrow 10:00 AM.',
      type: 'tenant',
      priority: 'medium',
      recipients: 1,
      sentAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      userId: 4,
      byUserId: 5, // Tenant
      targetRole: 'owner',
      targetPropertyId: 1,
      deliveryStatus: 'delivered',
      isRead: false
    }
  ];

  const wardenNotifs = await client.query('SELECT id, title, "senderName", "senderRole", type FROM warden_notifications ORDER BY id DESC LIMIT 5');
  console.log('Recent Warden Notifications:', wardenNotifs.rows);

  await client.end();
}

main().catch(console.error);
