import { MigrationInterface, QueryRunner } from 'typeorm';

export class SuperAdminAnnouncements1800000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorSecret" varchar');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean NOT NULL DEFAULT false');
    await queryRunner.query('ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipientUserIds" jsonb');
    await queryRunner.query('ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "targetRole" varchar');
    await queryRunner.query('ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "targetPropertyId" integer');
    await queryRunner.query('ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "deliveryStatus" varchar NOT NULL DEFAULT \'sent\'');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorEnabled"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorSecret"');
    await queryRunner.query('ALTER TABLE "notifications" DROP COLUMN IF EXISTS "deliveryStatus"');
    await queryRunner.query('ALTER TABLE "notifications" DROP COLUMN IF EXISTS "targetPropertyId"');
    await queryRunner.query('ALTER TABLE "notifications" DROP COLUMN IF EXISTS "targetRole"');
    await queryRunner.query('ALTER TABLE "notifications" DROP COLUMN IF EXISTS "recipientUserIds"');
  }
}
