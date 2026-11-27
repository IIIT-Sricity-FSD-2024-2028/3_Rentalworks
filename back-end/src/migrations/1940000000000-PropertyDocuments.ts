import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * property_documents: verification documents owners upload for each property
 * (ownership proof, ID proof, fire-safety certificate …) and the admin's review.
 * Idempotent so it is safe on an existing database.
 */
export class PropertyDocuments1940000000000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE IF NOT EXISTS "property_documents" (
      "id" SERIAL PRIMARY KEY,
      "propertyId" integer NOT NULL REFERENCES "properties"("id") ON DELETE CASCADE,
      "ownerId" integer NOT NULL,
      "docType" varchar NOT NULL,
      "fileName" varchar NOT NULL,
      "filePath" varchar NOT NULL,
      "mimeType" varchar NOT NULL,
      "size" integer NOT NULL,
      "status" varchar NOT NULL DEFAULT 'pending',
      "reviewNote" text NULL,
      "reviewedBy" integer NULL,
      "reviewedAt" timestamptz NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE INDEX IF NOT EXISTS "idx_property_documents_property" ON "property_documents" ("propertyId")`);
  }

  async down(runner: QueryRunner) {
    await runner.query(`DROP TABLE IF EXISTS "property_documents"`);
  }
}
