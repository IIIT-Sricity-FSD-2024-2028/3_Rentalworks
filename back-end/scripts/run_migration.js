require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Neon database successfully.');

    // Run statements in a transaction
    await client.query('BEGIN');

    // 1. users table enhancement
    await client.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" character varying;`);
    await client.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" character varying;`);
    await client.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferences" jsonb;`);

    // 2. properties table enhancement
    await client.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "images" jsonb DEFAULT '[]'::jsonb;`);
    await client.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "description" text;`);
    await client.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "gender" character varying DEFAULT 'unisex';`);
    await client.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "rules" jsonb DEFAULT '[]'::jsonb;`);

    // 3. rooms table enhancement
    await client.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "roomType" character varying DEFAULT 'double';`);
    await client.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "images" jsonb DEFAULT '[]'::jsonb;`);

    // 4. complaints table enhancement
    await client.query(`ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "category" character varying DEFAULT 'general';`);
    await client.query(`ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "attachment" character varying;`);
    await client.query(`ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "roomId" integer;`);

    // 5. payments table enhancement
    await client.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "roomId" integer;`);

    // 6. notifications table enhancement
    await client.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "isRead" boolean DEFAULT false;`);
    await client.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "userId" integer;`);
    await client.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "targetRole" character varying DEFAULT 'all';`);

    // 7. Foreign key constraints
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_complaint_room') THEN
          ALTER TABLE "complaints" ADD CONSTRAINT "FK_complaint_room" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_payment_room') THEN
          ALTER TABLE "payments" ADD CONSTRAINT "FK_payment_room" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_notification_recipient_user') THEN
          ALTER TABLE "notifications" ADD CONSTRAINT "FK_notification_recipient_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    // 8. Performance and relational indexes
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_users_role" ON "users"("role");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_properties_ownerId" ON "properties"("ownerId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_properties_location" ON "properties"("location");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_properties_status" ON "properties"("status");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_rooms_propertyId" ON "rooms"("propertyId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_rooms_status" ON "rooms"("status");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_bookings_tenantId" ON "bookings"("tenantId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_bookings_propertyId" ON "bookings"("propertyId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_bookings_roomId" ON "bookings"("roomId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_bookings_status" ON "bookings"("status");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_booking_requests_tenantId" ON "booking_requests"("tenantId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_booking_requests_propertyId" ON "booking_requests"("propertyId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_booking_requests_roomId" ON "booking_requests"("roomId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_stays_tenantId" ON "tenant_stays"("tenantId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_stays_propertyId" ON "tenant_stays"("propertyId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_stays_roomId" ON "tenant_stays"("roomId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_tenantId" ON "payments"("tenantId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_propertyId" ON "payments"("propertyId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_roomId" ON "payments"("roomId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_status" ON "payments"("status");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_complaints_tenantId" ON "complaints"("tenantId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_complaints_propertyId" ON "complaints"("propertyId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_complaints_roomId" ON "complaints"("roomId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_complaints_status" ON "complaints"("status");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_byUserId" ON "notifications"("byUserId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_userId" ON "notifications"("userId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_isRead" ON "notifications"("isRead");`);

    await client.query('COMMIT');
    console.log('Migration executed successfully! All schema updates applied.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
