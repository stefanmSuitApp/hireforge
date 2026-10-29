#!/usr/bin/env node
/**
 * Applies `drizzle/*.sql` in journal order (same `drizzle.__drizzle_migrations`
 * bookkeeping as `drizzle-kit migrate`). Uses drizzle-orm's migrator rather
 * than drizzle-kit so the production image needs only runtime packages, and
 * dev, CI, e2e and production all run this same code.
 */
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
config({ path: join(root, '.env'), quiet: true });

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(
    '[hireforge] DATABASE_URL is not set. Copy .env.example to .env and point it at Postgres (e.g. after `pnpm docker:up`).',
  );
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  await migrate(drizzle(client), {
    migrationsFolder: join(root, 'drizzle'),
  });
  console.log('[hireforge] migrations applied');
} catch (e) {
  console.error(
    '[hireforge] migration failed:',
    e instanceof Error ? e.message : e,
  );
  console.error(
    'Common causes: Postgres not running, wrong DATABASE_URL, or a migration that conflicts with the current schema.',
  );
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
