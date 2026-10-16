import { MigrationInterface, QueryRunner } from 'typeorm';

// Only adds nullable fields or fields with safe defaults. Old backend versions
// used synchronize:true and could remove columns introduced by newer code.
export class RestoreSharedColumns1800000001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company" varchar');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" varchar');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "state" varchar');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pincode" varchar');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar" varchar');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "policy" jsonb');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorSecret" varchar');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean NOT NULL DEFAULT false');
    await queryRunner.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" varchar');

    await queryRunner.query('ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "address" varchar');
    await queryRunner.query('ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "city" varchar');
    await queryRunner.query('ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "state" varchar');
    await queryRunner.query('ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "pincode" varchar');
    await queryRunner.query('ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "type" varchar');
    await queryRunner.query('ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "totalCapacity" integer');
    await queryRunner.query('ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "totalRooms" integer');
    await queryRunner.query('ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "occupiedRooms" integer');
    await queryRunner.query('ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "monthlyRent" integer');
    await queryRunner.query('ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "rules" jsonb');

    await queryRunner.query('ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "category" varchar');
    await queryRunner.query('ALTER TABLE "complaints" ADD COLUMN IF NOT EXISTS "reportedBy" varchar');

    await queryRunner.query('ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "read" boolean NOT NULL DEFAULT false');
    await queryRunner.query('ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "recipientUserIds" jsonb');
    await queryRunner.query('ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "targetRole" varchar');
    await queryRunner.query('ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "targetPropertyId" integer');
    await queryRunner.query('ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "deliveryStatus" varchar NOT NULL DEFAULT \'sent\'');
  }

  public async down(): Promise<void> {
    // Deliberately leave data-bearing columns in place.
  }
}
