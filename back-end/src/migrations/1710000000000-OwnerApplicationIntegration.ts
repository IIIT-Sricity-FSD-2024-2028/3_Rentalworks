import { MigrationInterface, QueryRunner } from 'typeorm';

export class OwnerApplicationIntegration1710000000000 implements MigrationInterface {
  name = 'OwnerApplicationIntegration1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure subscriptions table exists
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id" SERIAL NOT NULL,
        "ownerId" integer NOT NULL,
        "planName" character varying NOT NULL DEFAULT 'Growth',
        "monthlyFee" numeric(10,2) NOT NULL DEFAULT 8000.00,
        "status" character varying NOT NULL DEFAULT 'active',
        "billingCycle" character varying NOT NULL DEFAULT 'monthly',
        "startDate" date,
        "endDate" date,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions_id" PRIMARY KEY ("id")
      );
    `);

    // 2. Add foreign key if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_subscriptions_owner'
        ) THEN
          ALTER TABLE "subscriptions"
          ADD CONSTRAINT "FK_subscriptions_owner"
          FOREIGN KEY ("ownerId") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 3. Add performance indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_subscriptions_ownerId" ON "subscriptions" ("ownerId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_properties_ownerId" ON "properties" ("ownerId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_complaints_propertyId" ON "complaints" ("propertyId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_byUserId" ON "notifications" ("byUserId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_rooms_propertyId" ON "rooms" ("propertyId");`);

    // 4. Ensure properties columns exist
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "address" character varying;`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "city" character varying;`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "state" character varying;`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "pincode" character varying;`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "type" character varying;`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "totalCapacity" integer;`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "totalRooms" integer;`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "occupiedRooms" integer;`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "monthlyRent" integer;`);
    await queryRunner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "rules" jsonb;`);

    // 5. Ensure users columns exist
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company" character varying;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" character varying;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" character varying;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pincode" character varying;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" character varying;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "policy" jsonb;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionPlan" character varying;`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscriptionFee" numeric(10,2);`);

    // 6. Ensure complaints columns exist
    await queryRunner.query(`ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "title" character varying;`);
    await queryRunner.query(`ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "category" character varying;`);
    await queryRunner.query(`ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "reportedBy" character varying;`);
    await queryRunner.query(`ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "priority" character varying DEFAULT 'medium';`);
    await queryRunner.query(`ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "resolvedAt" date;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_rooms_propertyId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_byUserId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_complaints_propertyId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_properties_ownerId";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_subscriptions_ownerId";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions";`);
  }
}
