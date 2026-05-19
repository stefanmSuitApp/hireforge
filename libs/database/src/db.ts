import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

/** Transaction client passed to `db.transaction(async (tx) => …)` — not assignable to `DrizzleDb` alone. */
export type DrizzleTransaction = Parameters<
  Parameters<DrizzleDb['transaction']>[0]
>[0];

export type DrizzleDbOrTx = DrizzleDb | DrizzleTransaction;

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });
  return { db, pool };
}
