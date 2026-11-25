import { MigrationInterface, QueryRunner } from 'typeorm';

// This is deliberately separate from the previous removal migration. A
// running development server may have recorded that migration before its
// implementation was updated, so this migration guarantees the live schema
// reaches the intended username-and-password-only state.
export class DropLegacyAuthenticatorColumns1910000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorEnabled"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorSecret"');
  }

  public async down(): Promise<void> {
    // The discontinued authenticator feature is intentionally not restored.
  }
}
