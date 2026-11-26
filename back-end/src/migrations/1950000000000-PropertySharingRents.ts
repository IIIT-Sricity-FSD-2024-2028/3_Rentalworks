import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * properties.sharingRents: monthly rent per bed by room size, as the owner
 * enters it when listing a property, e.g. {"single":12000,"double":8500,"triple":6500}.
 * Room records still carry their own rent; this is the listed price per sharing.
 * Idempotent so it is safe on an existing database.
 */
export class PropertySharingRents1950000000000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "sharingRents" jsonb NULL`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`ALTER TABLE "properties" DROP COLUMN IF EXISTS "sharingRents"`);
  }
}
