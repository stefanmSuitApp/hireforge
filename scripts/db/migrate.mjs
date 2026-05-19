#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
config({ path: join(root, '.env') });

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    '[hireforge] DATABASE_URL is not set. Copy .env.example to .env and point it at Postgres (e.g. after `pnpm docker:up`).',
  );
  process.exit(1);
}

const drizzleKitBin = join(root, 'node_modules', 'drizzle-kit', 'bin.cjs');
if (!existsSync(drizzleKitBin)) {
  console.error(
    `[hireforge] drizzle-kit not found at ${drizzleKitBin}. Run pnpm install from the repo root.`,
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [drizzleKitBin, 'migrate'], {
  cwd: root,
  encoding: 'utf8',
  env: process.env,
});

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) {
  console.error('[hireforge] Failed to start drizzle-kit:', result.error);
  process.exit(1);
}

if ((result.status ?? 1) !== 0) {
  console.error(
    '\n[hireforge] drizzle-kit migrate exited with code',
    result.status ?? 1,
    '\nCommon causes: Postgres not running, wrong DATABASE_URL, or schema already partially applied (e.g. `db:push` then conflicting migration SQL).',
  );
}

process.exit(result.status ?? 1);
