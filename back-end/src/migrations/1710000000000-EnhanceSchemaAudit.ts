import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnhanceSchemaAudit1710000000000 implements MigrationInterface {
  name = 'EnhanceSchemaAudit1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. users table enhancement
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" character varying;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" character varying;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferences" jsonb;`);

    // 2. properties table enhancement
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "images" jsonb DEFAULT '[]'::jsonb;`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "description" text;`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "gender" character varying DEFAULT 'unisex';`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "rules" jsonb DEFAULT '[]'::jsonb;`);

    // 3. rooms table enhancement
    await queryRunner.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "roomType" character varying DEFAULT 'double';`);
    await queryRunner.query(`ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "images" jsonb DEFAULT '[]'::jsonb;`);

    // 4. complaints table enhancement
    await queryRunner.query(`ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "category" character varying DEFAULT 'general';`);
    await queryRunner.query(`ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "attachment" character varying;`);
    await queryRunner.query(`ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "roomId" integer;`);

    // 5. payments table enhancement
    await queryRunner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "roomId" integer;`);

    // 6. notifications table enhancement
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "isRead" boolean DEFAULT false;`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "userId" integer;`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "targetRole" character varying DEFAULT 'all';`);

    // 7. Foreign key constraints
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_complaint_room') THEN
          ALTER TABLE "complaints" ADD CONSTRAINT "FK_complaint_room" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_payment_room') THEN
          ALTER TABLE "payments" ADD CONSTRAINT "FK_payment_room" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_notification_recipient_user') THEN
          ALTER TABLE "notifications" ADD CONSTRAINT "FK_notification_recipient_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    // 8. Performance and relational indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_role" ON "users"("role");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_properties_ownerId" ON "properties"("ownerId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_properties_location" ON "properties"("location");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_properties_status" ON "properties"("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_rooms_propertyId" ON "rooms"("propertyId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_rooms_status" ON "rooms"("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bookings_tenantId" ON "bookings"("tenantId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bookings_propertyId" ON "bookings"("propertyId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bookings_roomId" ON "bookings"("roomId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_bookings_status" ON "bookings"("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_booking_requests_tenantId" ON "booking_requests"("tenantId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_booking_requests_propertyId" ON "booking_requests"("propertyId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_booking_requests_roomId" ON "booking_requests"("roomId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_stays_tenantId" ON "tenant_stays"("tenantId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_stays_propertyId" ON "tenant_stays"("propertyId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tenant_stays_roomId" ON "tenant_stays"("roomId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_tenantId" ON "payments"("tenantId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_propertyId" ON "payments"("propertyId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_roomId" ON "payments"("roomId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_status" ON "payments"("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_complaints_tenantId" ON "complaints"("tenantId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_complaints_propertyId" ON "complaints"("propertyId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_complaints_roomId" ON "complaints"("roomId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_complaints_status" ON "complaints"("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_byUserId" ON "notifications"("byUserId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_userId" ON "notifications"("userId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_isRead" ON "notifications"("isRead");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_isRead";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_userId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_byUserId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_complaints_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_complaints_roomId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_complaints_propertyId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_complaints_tenantId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_roomId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_propertyId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_tenantId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenant_stays_roomId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenant_stays_propertyId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tenant_stays_tenantId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_booking_requests_roomId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_booking_requests_propertyId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_booking_requests_tenantId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bookings_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bookings_roomId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bookings_propertyId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_bookings_tenantId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rooms_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rooms_propertyId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_location";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_ownerId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_role";`);

    await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "FK_notification_recipient_user";`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "FK_payment_room";`);
    await queryRunner.query(`ALTER TABLE "complaints" DROP CONSTRAINT IF EXISTS "FK_complaint_room";`);

    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "targetRole";`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "userId";`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "isRead";`);

    await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN IF EXISTS "roomId";`);

    await queryRunner.query(`ALTER TABLE "complaints" DROP COLUMN IF EXISTS "roomId";`);
    await queryRunner.query(`ALTER TABLE "complaints" DROP COLUMN IF EXISTS "attachment";`);
    await queryRunner.query(`ALTER TABLE "complaints" DROP COLUMN IF EXISTS "category";`);

    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN IF EXISTS "images";`);
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN IF EXISTS "roomType";`);

    await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "rules";`);
    await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "gender";`);
    await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "description";`);
    await queryRunner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "images";`);

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "preferences";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "address";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar";`);
  }
}
