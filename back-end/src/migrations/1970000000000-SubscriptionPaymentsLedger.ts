import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Ledger of owner subscription payments (admin / super-admin revenue reads it).
 * The shared database already has this table; fresh databases get it here.
 * A gateway payment id can only ever be recorded once.
 */
export class SubscriptionPaymentsLedger1970000000000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`
      CREATE TABLE IF NOT EXISTS "subscription_payments" (
        "id" SERIAL PRIMARY KEY,
        "ownerId" integer NOT NULL REFERENCES "users"("id"),
        "subscriptionId" integer REFERENCES "subscriptions"("id"),
        "planType" varchar NOT NULL,
        "transactionId" varchar NOT NULL,
        "orderId" varchar NOT NULL,
        "amount" numeric NOT NULL,
        "currency" varchar NOT NULL DEFAULT 'INR',
        "paymentMethod" varchar NOT NULL DEFAULT 'MockGateway',
        "status" varchar NOT NULL DEFAULT 'SUCCESS',
        "paymentDate" date NOT NULL,
        "receiptNumber" varchar,
        "planDuration" varchar,
        "createdAt" timestamp NOT NULL DEFAULT now()
      )`);
    await runner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_subscription_payments_txn" ON "subscription_payments" ("transactionId")`,
    );
  }

  async down(runner: QueryRunner) {
    // Keep the table (it may predate this migration); only drop what this added.
    await runner.query(`DROP INDEX IF EXISTS "uq_subscription_payments_txn"`);
  }
}
