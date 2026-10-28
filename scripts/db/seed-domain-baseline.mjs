#!/usr/bin/env node
/**
 * Applies `seed-domain-baseline.sql` (dev users, company, sample job).
 * Loads repo-root `.env` for `DATABASE_URL`.
 *
 * Usage: pnpm db:seed:domain
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
config({ path: join(root, '.env') });

const sqlPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'seed-domain-baseline.sql',
);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[hireforge] DATABASE_URL is not set (check .env).');
    process.exit(1);
  }
  // The seed creates admin/staff users with a password printed in the SQL
  // header; it reached production once (2026-05). Never again by accident.
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_DEV_SEED !== '1'
  ) {
    console.error(
      '[hireforge] Refusing to load dev seed users with NODE_ENV=production (set ALLOW_DEV_SEED=1 to override).',
    );
    process.exit(1);
  }

  const sql = readFileSync(sqlPath, 'utf8');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
  console.log('[hireforge] Applied scripts/db/seed-domain-baseline.sql');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
