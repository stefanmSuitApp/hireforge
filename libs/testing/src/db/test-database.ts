import { randomBytes } from 'node:crypto';
import { Client, Pool } from 'pg';
import { type IntegrationContext, pgUrl } from '../containers/context';

export interface TestDatabase {
  name: string;
  url: string;
  /** Superuser pool, like the API's own connection (no separate app role). */
  pool: Pool;
}

let current: TestDatabase | undefined;

/** This test file's own database (a fresh copy of the migrated template). */
export function testDb(): TestDatabase {
  if (!current) {
    throw new Error(
      'testDb() is only available in integration tests (*.int.test.ts run through vitest.integration.config.mts).',
    );
  }
  return current;
}

export async function createTestDatabase(
  ctx: IntegrationContext['postgres'],
): Promise<TestDatabase> {
  // Pool id in the name helps when reading Postgres logs; the random part keeps files apart.
  const name = `t_${process.env['VITEST_POOL_ID'] ?? '0'}_${randomBytes(4).toString('hex')}`;
  const server = new Client({ connectionString: pgUrl(ctx, 'postgres') });
  await server.connect();
  try {
    await server.query(`create database ${name} template ${ctx.template}`);
  } finally {
    await server.end();
  }
  const url = pgUrl(ctx, name);
  const pool = new Pool({ connectionString: url, max: 6 });
  // The database is dropped with FORCE at the end; idle clients then error, which is expected.
  pool.on('error', () => undefined);
  current = { name, url, pool };
  return current;
}

export async function dropTestDatabase(
  ctx: IntegrationContext['postgres'],
): Promise<void> {
  if (!current) return;
  const { name, pool } = current;
  current = undefined;
  await pool.end().catch(() => undefined);
  const server = new Client({ connectionString: pgUrl(ctx, 'postgres') });
  await server.connect();
  try {
    // pg's pool.end() resolves before its sockets close. A FORCE drop then
    // kills a connection that is still closing, and its pool (the API's, the
    // worker's) reports 57P01 as an unhandled error. Let them leave first;
    // FORCE only clears what is really left behind.
    for (let i = 0; i < 50; i++) {
      const { rows } = await server.query<{ n: number }>(
        'select count(*)::int as n from pg_stat_activity where datname = $1',
        [name],
      );
      if (rows[0]?.n === 0) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    await server.query(`drop database if exists ${name} with (force)`);
  } finally {
    await server.end();
  }
}
