import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1700000000000 implements MigrationInterface {
    name = 'InitialSchema1700000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "email" character varying NOT NULL,
                "phone" character varying NOT NULL,
                "role" character varying NOT NULL DEFAULT 'tenant',
                "username" character varying NOT NULL,
                "password" character varying,
                "status" character varying NOT NULL DEFAULT 'active',
                "joinDate" date NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "properties" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL,
                "location" character varying NOT NULL,
                "ownerId" integer NOT NULL,
                "rentMin" integer NOT NULL,
                "rentMax" integer NOT NULL,
                "safetyScore" numeric(3,1) NOT NULL,
                "rooms" character varying NOT NULL,
                "occupancy" integer NOT NULL,
                "amenities" jsonb NOT NULL,
                "status" character varying NOT NULL,
                "docsVerified" boolean NOT NULL DEFAULT false,
                "inspectionPassed" boolean NOT NULL DEFAULT false,
                "commissionRate" numeric(5,2) NOT NULL DEFAULT '0',
                "compliance" character varying NOT NULL,
                "fireSafety" character varying NOT NULL,
                "changeRequestPending" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_2d83bfa0b9fcd45dee1785af44d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "bookings" (
                "id" SERIAL NOT NULL,
                "tenantId" integer NOT NULL,
                "propertyId" integer NOT NULL,
                "room" character varying NOT NULL,
                "checkIn" date NOT NULL,
                "duration" character varying NOT NULL,
                "rent" integer NOT NULL,
                "status" character varying NOT NULL,
                CONSTRAINT "PK_ee0a442a54f50ac1e43c139c8fb" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "payments" (
                "id" SERIAL NOT NULL,
                "tenantId" integer NOT NULL,
                "propertyId" integer NOT NULL,
                "room" character varying NOT NULL,
                "amount" numeric(10,2) NOT NULL,
                "method" character varying NOT NULL,
                "transactionId" character varying NOT NULL,
                "paidDate" date NOT NULL,
                "status" character varying NOT NULL,
                "clearance" character varying NOT NULL,
                CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "complaints" (
                "id" SERIAL NOT NULL,
                "tenantId" integer NOT NULL,
                "propertyId" integer NOT NULL,
                "description" character varying NOT NULL,
                "status" character varying NOT NULL,
                "reportedAt" date NOT NULL,
                CONSTRAINT "PK_8340d99dc7f8c09a80b001d8353" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "notifications" (
                "id" SERIAL NOT NULL,
                "title" character varying NOT NULL,
                "message" text NOT NULL,
                "type" character varying NOT NULL,
                "priority" character varying NOT NULL,
                "recipients" integer NOT NULL,
                "sentAt" character varying NOT NULL,
                "byUserId" integer NOT NULL,
                CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "properties" ADD CONSTRAINT "FK_owner_id" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bookings" ADD CONSTRAINT "FK_booking_tenant" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "bookings" ADD CONSTRAINT "FK_booking_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "payments" ADD CONSTRAINT "FK_payment_tenant" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "payments" ADD CONSTRAINT "FK_payment_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "complaints" ADD CONSTRAINT "FK_complaint_tenant" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "complaints" ADD CONSTRAINT "FK_complaint_property" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "notifications" ADD CONSTRAINT "FK_notification_user" FOREIGN KEY ("byUserId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_notification_user"`);
        await queryRunner.query(`ALTER TABLE "complaints" DROP CONSTRAINT "FK_complaint_property"`);
        await queryRunner.query(`ALTER TABLE "complaints" DROP CONSTRAINT "FK_complaint_tenant"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payment_property"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payment_tenant"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_booking_property"`);
        await queryRunner.query(`ALTER TABLE "bookings" DROP CONSTRAINT "FK_booking_tenant"`);
        await queryRunner.query(`ALTER TABLE "properties" DROP CONSTRAINT "FK_owner_id"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TABLE "complaints"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TABLE "bookings"`);
        await queryRunner.query(`DROP TABLE "properties"`);
        await queryRunner.query(`DROP TABLE "users"`);
    }
}
