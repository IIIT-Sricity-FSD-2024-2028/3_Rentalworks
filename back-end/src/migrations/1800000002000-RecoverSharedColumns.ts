import { MigrationInterface, QueryRunner } from 'typeorm';
import { RestoreSharedColumns1800000001000 } from './1800000001000-RestoreSharedColumns';

// An older checkout with synchronize:true removed these fields after the
// previous migration ran. Reapply the same additive changes once more.
export class RecoverSharedColumns1800000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await new RestoreSharedColumns1800000001000().up(queryRunner);
  }

  public async down(): Promise<void> {
    // Keep existing data when rolling back.
  }
}
