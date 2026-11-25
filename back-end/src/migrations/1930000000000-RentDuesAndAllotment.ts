import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds:
 *  - rent_dues ledger (one row per tenant per billing cycle)
 *  - bed-level allotment columns on bookings / tenant_stays (+ unique index so a bed
 *    can never be allotted to two active tenants)
 *  - receipt breakdown columns on payments (rent / deposit / fee)
 *  - audit_logs (eviction + warden actions, visible to warden and owner)
 * Every statement is idempotent so it is safe to run against an existing database.
 */
export class RentDuesAndAllotment1930000000000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE IF NOT EXISTS "rent_dues" (
      "id" SERIAL PRIMARY KEY,
      "tenantId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "stayId" integer NULL,
      "bookingId" integer NULL,
      "propertyId" integer NOT NULL,
      "roomId" integer NULL,
      "cycleNo" integer NOT NULL DEFAULT 1,
      "periodStart" date NOT NULL,
      "periodEnd" date NOT NULL,
      "amount" numeric(10,2) NOT NULL,
      "dueDate" date NOT NULL,
      "status" varchar NOT NULL DEFAULT 'upcoming',
      "paymentId" integer NULL,
      "paidAt" timestamptz NULL,
      "paidVia" varchar NULL,
      "reminderSentAt" timestamptz NULL,
      "overdueAlertedAt" timestamptz NULL,
      "wardenReminderAt" timestamptz NULL,
      "waivedReason" text NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_rent_dues_tenant_period" ON "rent_dues" ("tenantId","periodStart")`);
    await runner.query(`CREATE INDEX IF NOT EXISTS "idx_rent_dues_status_due" ON "rent_dues" ("status","dueDate")`);

    await runner.query(`ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "bedNumber" varchar NULL`);
    await runner.query(`ALTER TABLE "tenant_stays" ADD COLUMN IF NOT EXISTS "bedNumber" varchar NULL`);
    await runner.query(`ALTER TABLE "tenant_stays" ADD COLUMN IF NOT EXISTS "endedAt" timestamptz NULL`);
    await runner.query(`ALTER TABLE "tenant_stays" ADD COLUMN IF NOT EXISTS "endReason" text NULL`);
    await runner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_active_stay_bed" ON "tenant_stays" ("roomId","bedNumber") WHERE "status" = 'active' AND "bedNumber" IS NOT NULL AND "roomId" IS NOT NULL`);

    await runner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "rentAmount" numeric(10,2) NULL`);
    await runner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "depositAmount" numeric(10,2) NULL`);
    await runner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "feeAmount" numeric(10,2) NULL`);
    await runner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "kind" varchar NOT NULL DEFAULT 'booking'`);
    await runner.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "bedNumber" varchar NULL`);

    await runner.query(`CREATE TABLE IF NOT EXISTS "audit_logs" (
      "id" SERIAL PRIMARY KEY,
      "action" varchar NOT NULL,
      "actorId" integer NULL,
      "actorRole" varchar NULL,
      "actorName" varchar NULL,
      "tenantId" integer NULL,
      "tenantName" varchar NULL,
      "propertyId" integer NULL,
      "roomNumber" varchar NULL,
      "bedNumber" varchar NULL,
      "reason" text NULL,
      "details" jsonb NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE INDEX IF NOT EXISTS "idx_audit_logs_property" ON "audit_logs" ("propertyId","createdAt")`);

    // Back-fill: existing active stays get a bed number so the unique index starts being meaningful.
    await runner.query(`
      WITH numbered AS (
        SELECT "id", ROW_NUMBER() OVER (PARTITION BY "roomId" ORDER BY "id") AS rn
        FROM "tenant_stays" WHERE "status" = 'active' AND "roomId" IS NOT NULL AND "bedNumber" IS NULL
      )
      UPDATE "tenant_stays" s SET "bedNumber" = 'B' || numbered.rn
      FROM numbered WHERE s."id" = numbered."id"
    `);
    await runner.query(`
      UPDATE "bookings" b SET "bedNumber" = s."bedNumber"
      FROM "tenant_stays" s
      WHERE b."bedNumber" IS NULL AND s."tenantId" = b."tenantId" AND s."roomId" = b."roomId" AND s."bedNumber" IS NOT NULL
    `);
  }

  async down(runner: QueryRunner) {
    await runner.query('DROP TABLE IF EXISTS "audit_logs"');
    await runner.query('DROP TABLE IF EXISTS "rent_dues"');
    await runner.query('DROP INDEX IF EXISTS "uq_active_stay_bed"');
  }
}
