import { MigrationInterface, QueryRunner } from 'typeorm';

export class PropertyDetailsDocument1940000000000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query('ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "detailsDocument" jsonb');
  }

  async down(runner: QueryRunner) {
    await runner.query('ALTER TABLE "properties" DROP COLUMN IF EXISTS "detailsDocument"');
  }
}
