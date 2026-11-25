import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantDashboardTables1720000000000 implements MigrationInterface {
  name = 'AddTenantDashboardTables1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. notifications table enhancement (tenant-specific notifications)
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "isRead" boolean DEFAULT false;`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "userId" integer;`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "targetRole" character varying DEFAULT 'all';`);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_notification_recipient_user') THEN
          ALTER TABLE "notifications" ADD CONSTRAINT "FK_notification_recipient_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_userId" ON "notifications"("userId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_isRead" ON "notifications"("isRead");`);

    // 2. issues table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "issues" (
        "id" SERIAL PRIMARY KEY,
        "title" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "category" character varying(100) NOT NULL DEFAULT 'Other',
        "priority" character varying(50) NOT NULL DEFAULT 'medium',
        "status" character varying(50) NOT NULL DEFAULT 'open',
        "location" character varying(255),
        "tenantId" integer NOT NULL,
        "propertyId" integer,
        "roomId" integer,
        "resolvedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_issues_tenant') THEN
          ALTER TABLE "issues" ADD CONSTRAINT "FK_issues_tenant" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_issues_property') THEN
          ALTER TABLE "issues" ADD CONSTRAINT "FK_issues_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_issues_room') THEN
          ALTER TABLE "issues" ADD CONSTRAINT "FK_issues_room" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_issues_tenantId" ON "issues"("tenantId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_issues_propertyId" ON "issues"("propertyId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_issues_roomId" ON "issues"("roomId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_issues_status" ON "issues"("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_issues_category" ON "issues"("category");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_issues_createdAt" ON "issues"("createdAt");`);

    // 3. services catalog table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "services" (
        "id" SERIAL PRIMARY KEY,
        "name" character varying(100) NOT NULL,
        "description" text,
        "price" numeric(10,2) NOT NULL DEFAULT 0,
        "pricingModel" character varying(50) NOT NULL DEFAULT 'included_in_rent',
        "timing" character varying(100),
        "location" character varying(100),
        "isAvailable" boolean NOT NULL DEFAULT true,
        "propertyId" integer,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_services_property') THEN
          ALTER TABLE "services" ADD CONSTRAINT "FK_services_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_services_propertyId" ON "services"("propertyId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_services_isAvailable" ON "services"("isAvailable");`);

    // 4. service_requests table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_requests" (
        "id" SERIAL PRIMARY KEY,
        "serviceId" integer,
        "serviceType" character varying(100) NOT NULL DEFAULT 'General',
        "serviceName" character varying(100) NOT NULL,
        "requestedDate" date NOT NULL DEFAULT CURRENT_DATE,
        "status" character varying(50) NOT NULL DEFAULT 'pending',
        "amount" numeric(10,2) NOT NULL DEFAULT 0,
        "description" text,
        "notes" text,
        "tenantId" integer NOT NULL,
        "propertyId" integer,
        "roomId" integer,
        "requestedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "scheduledAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_service_requests_service') THEN
          ALTER TABLE "service_requests" ADD CONSTRAINT "FK_service_requests_service" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_service_requests_tenant') THEN
          ALTER TABLE "service_requests" ADD CONSTRAINT "FK_service_requests_tenant" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_service_requests_property') THEN
          ALTER TABLE "service_requests" ADD CONSTRAINT "FK_service_requests_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_service_requests_room') THEN
          ALTER TABLE "service_requests" ADD CONSTRAINT "FK_service_requests_room" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_service_requests_tenantId" ON "service_requests"("tenantId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_service_requests_propertyId" ON "service_requests"("propertyId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_service_requests_roomId" ON "service_requests"("roomId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_service_requests_status" ON "service_requests"("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_service_requests_createdAt" ON "service_requests"("createdAt");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "service_requests";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "services";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "issues";`);
  }
}
