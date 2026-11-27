import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServiceUsageBilling1950000000000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    // Existing completed requests keep their history without creating retroactive charges.
    await runner.query(`ALTER TABLE "service_requests"
      ADD COLUMN "quantity" numeric(6,2) NOT NULL DEFAULT 1,
      ADD COLUMN "pricingModel" varchar(50),
      ADD COLUMN "billableFrom" date,
      ADD COLUMN "rentDueId" integer`);
    await runner.query(`CREATE INDEX "idx_service_requests_billing"
      ON "service_requests" ("tenantId", "rentDueId", "billableFrom")
      WHERE "billableFrom" IS NOT NULL`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`DROP INDEX "idx_service_requests_billing"`);
    await runner.query(`ALTER TABLE "service_requests"
      DROP COLUMN "rentDueId", DROP COLUMN "billableFrom", DROP COLUMN "pricingModel", DROP COLUMN "quantity"`);
  }
}
