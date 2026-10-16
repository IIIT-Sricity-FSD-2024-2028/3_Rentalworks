import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RestoreSharedColumns1800000001000 } from './1800000001000-RestoreSharedColumns';

const requiredColumns: Record<string, string[]> = {
  users: ['company', 'city', 'state', 'pincode', 'bio', 'avatar', 'policy'],
  properties: ['address', 'city', 'state', 'pincode', 'type', 'totalCapacity', 'totalRooms', 'occupiedRooms', 'monthlyRent', 'rules'],
  complaints: ['category', 'reportedBy'],
  notifications: ['read', 'recipientUserIds', 'targetRole', 'targetPropertyId', 'deliveryStatus'],
};

let currentCheck: Promise<void> | null = null;
const logger = new Logger('SharedSchema');

// Older application copies can remove columns after migrations have already
// been recorded. Check the actual schema before using these entities.
export async function ensureSharedColumns(dataSource: DataSource): Promise<void> {
  if (currentCheck) return currentCheck;

  currentCheck = (async () => {
    const rows: { table_name: string; column_name: string }[] = await dataSource.query(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = current_schema()
       AND table_name IN ('users', 'properties', 'complaints', 'notifications')`,
    );
    const found = new Set(rows.map(row => `${row.table_name}.${row.column_name}`));
    const missing = Object.entries(requiredColumns).some(([table, columns]) =>
      columns.some(column => !found.has(`${table}.${column}`)),
    );
    if (!missing) return;
    logger.warn('Missing shared database columns detected. Applying additive repair; update older backends that use schema synchronization.');

    const runner = dataSource.createQueryRunner();
    try {
      await runner.connect();
      await runner.startTransaction();
      await runner.query("SELECT pg_advisory_xact_lock(hashtext('rentalworks_shared_columns')::bigint)");
      await new RestoreSharedColumns1800000001000().up(runner);
      await runner.commitTransaction();
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  })();

  try {
    await currentCheck;
  } finally {
    currentCheck = null;
  }
}
