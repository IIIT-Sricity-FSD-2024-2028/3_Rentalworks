import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Every booking creates its own tenant account (TENANT-######) that signs in
 * by Tenant ID only. It keeps the booker's email as preferences.contactEmail,
 * so users.email must allow NULL (the unique index still applies to real emails;
 * Postgres allows any number of NULLs).
 */
export class PerBookingTenantAccounts1960000000000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL`);
    await runner.query(`CREATE INDEX IF NOT EXISTS "idx_users_guest_id" ON "users" ((preferences->>'guestId'))`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`DROP INDEX IF EXISTS "idx_users_guest_id"`);
    await runner.query(`UPDATE "users" SET "email" = "username" || '@tenant.local' WHERE "email" IS NULL`);
    await runner.query(`ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL`);
  }
}
