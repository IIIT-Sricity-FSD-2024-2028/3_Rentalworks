import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationReceipts1920000000000 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query(`CREATE TABLE IF NOT EXISTS "notification_receipts" (
      "userId" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "notificationId" integer NOT NULL REFERENCES "notifications"("id") ON DELETE CASCADE,
      "read" boolean NOT NULL DEFAULT false,
      "dismissed" boolean NOT NULL DEFAULT false,
      PRIMARY KEY ("userId", "notificationId")
    )`);
  }
  async down(runner: QueryRunner) { await runner.query('DROP TABLE "notification_receipts"'); }
}
