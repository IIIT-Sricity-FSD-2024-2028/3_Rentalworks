import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOwnersTable1850000000000 implements MigrationInterface {
  name = 'CreateOwnersTable1850000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "owners" (
        "id" SERIAL PRIMARY KEY,
        "user_id" integer REFERENCES "users"("id") ON DELETE SET NULL,
        "full_name" character varying(255) NOT NULL,
        "name" character varying(255),
        "email" character varying(255) UNIQUE NOT NULL,
        "phone" character varying(50),
        "role" character varying(50) DEFAULT 'owner',
        "company" character varying(255) DEFAULT 'Iyer Properties Pvt Ltd',
        "city" character varying(100) DEFAULT 'Chennai',
        "state" character varying(100) DEFAULT 'Tamil Nadu',
        "pincode" character varying(20) DEFAULT '600001',
        "bio" text DEFAULT 'Experienced PG owner with 10+ years in the rental business.',
        "avatar" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      INSERT INTO "owners" (
        "id", "user_id", "full_name", "name", "email", "phone", "role",
        "company", "city", "state", "pincode", "bio", "created_at", "updated_at"
      )
      SELECT
        id, id, name, name, email, phone, role,
        'Iyer Properties Pvt Ltd', 'Chennai', 'Tamil Nadu', '600001',
        'Experienced PG owner with 10+ years in the rental business.',
        now(), now()
      FROM "users"
      WHERE role = 'owner'
      ON CONFLICT ("email") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "owners";`);
  }
}
