#!/usr/bin/env node
/**
 * E2E runner: recreates an isolated `<db>_e2e` database (migrate + seed) in the
 * local Postgres from `.env`, flushes a dedicated Redis DB index, builds the
 * API, then runs Playwright (which boots the API on :4100 and Next on :3100).
 * Never touches the dev database. Extra args are passed to `playwright test`.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import pg from 'pg';
import IORedis from 'ioredis';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
config({ path: join(root, '.env'), quiet: true });

const base = process.env.DATABASE_URL?.trim();
const redisBase = process.env.REDIS_URL?.trim();
if (!base || !redisBase) {
  console.error(
    '[e2e] DATABASE_URL and REDIS_URL must be set (see .env.example).',
  );
  process.exit(1);
}

const dbUrl = new URL(base);
const e2eDbName = `${dbUrl.pathname.replace(/^\//, '') || 'hireforge'}_e2e`;
if (!['localhost', '127.0.0.1', 'postgres'].includes(dbUrl.hostname)) {
  console.error(
    `[e2e] Refusing to run against non-local Postgres host ${dbUrl.hostname}.`,
  );
  process.exit(1);
}
const e2eDbUrl = new URL(base);
e2eDbUrl.pathname = `/${e2eDbName}`;
const e2eRedisUrl = new URL(redisBase);
e2eRedisUrl.pathname = '/15';

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

const admin = new pg.Client({ connectionString: base });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${e2eDbName}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${e2eDbName}"`);
await admin.end();

const redis = new IORedis(e2eRedisUrl.toString());
await redis.flushdb();
redis.disconnect();

const e2eEnv = {
  DATABASE_URL: e2eDbUrl.toString(),
  REDIS_URL: e2eRedisUrl.toString(),
};
run('node', ['scripts/db/migrate.mjs'], e2eEnv);
run('node', ['scripts/db/seed-domain-baseline.mjs'], e2eEnv);
if (!process.argv.includes('--skip-build')) {
  run('pnpm', ['build:api'], { NX_DAEMON: 'false' });
}

const passThrough = process.argv.slice(2).filter((a) => a !== '--skip-build');
run(
  'pnpm',
  [
    'exec',
    'playwright',
    'test',
    '--config',
    'e2e/playwright.config.ts',
    ...passThrough,
  ],
  { E2E_DATABASE_URL: e2eEnv.DATABASE_URL, E2E_REDIS_URL: e2eEnv.REDIS_URL },
);
