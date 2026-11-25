import { MigrationInterface, QueryRunner } from 'typeorm';

// The portal now uses a single username-and-password login. Remove the
// discontinued authenticator fields from databases that received them earlier.
export class RemoveSuperAdminTwoFactor1900000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorEnabled"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorSecret"');
  }

  public async down(): Promise<void> {
    // Two-factor authentication was intentionally removed and is not restored.
  }
}
