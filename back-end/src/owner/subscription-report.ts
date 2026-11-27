import type { DataSource } from 'typeorm';

export function readSubscriptionReport(dataSource: DataSource) {
  return dataSource.transaction('REPEATABLE READ', async (manager) => {
    await manager.query('SET TRANSACTION READ ONLY');
    const [ledger] = await manager.query(
      "SELECT to_regclass('public.subscription_payments') IS NOT NULL AS available",
    );
    // Keep plan status and configured fees separate from recorded payments.
    const subscriptions = await manager.query(`
      SELECT DISTINCT ON (s."ownerId")
        s.id, s."ownerId", u.name AS "ownerName", u.email AS "ownerEmail",
        COALESCE(NULLIF(TRIM(to_jsonb(s)->>'planType'), ''), s."planName") AS "planType",
        COALESCE((to_jsonb(s)->>'amount')::numeric, s."monthlyFee")::text AS amount,
        UPPER(COALESCE(to_jsonb(s)->>'currency', 'INR')) AS currency,
        s."startDate"::text AS "startDate", s."endDate"::text AS "endDate",
        CASE
          WHEN LOWER(TRIM(s.status)) = 'active' AND s."endDate" < CURRENT_DATE THEN 'EXPIRED'
          WHEN LOWER(TRIM(s.status)) = 'active' AND s."startDate" > CURRENT_DATE THEN 'PENDING'
          ELSE UPPER(TRIM(s.status))
        END AS status,
        to_jsonb(s)->>'paymentId' AS "paymentId"
      FROM subscriptions s
      JOIN users u ON u.id = s."ownerId" AND u.role = 'owner'
      ORDER BY s."ownerId", s.id DESC
    `);
    // Older installs may have owner plans without a subscription payment ledger.
    const payments = ledger.available ? await manager.query(`
      SELECT id, "ownerId", "subscriptionId", "planType", amount::text AS amount,
        UPPER(TRIM(currency)) AS currency, "paymentDate"::text AS "paymentDate", "receiptNumber"
      FROM public.subscription_payments
      WHERE LOWER(TRIM(status)) IN ('success', 'completed', 'paid', 'verified')
      ORDER BY "paymentDate" DESC, id DESC
    `) : [];
    return { ledgerAvailable: ledger.available, subscriptions, payments };
  });
}
