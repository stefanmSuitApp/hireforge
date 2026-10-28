import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Client } from 'pg';

/**
 * The repo root, found from the working directory (each Nx target runs in its
 * project folder). Not from `import.meta`: libraries that typecheck as
 * CommonJS import this file too.
 */
function findRepoRoot(from = process.cwd()): string {
  let dir = from;
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`no repo root above ${from}`);
    dir = parent;
  }
  return `${dir}/`;
}

const repoRoot = findRepoRoot();

/** Tables of the dev seed that are reference data, not people or accounts. */
const TAXONOMY_TABLES = [
  'cities',
  'job_categories',
  'packages',
  'package_prices',
  'package_entitlements',
];

/**
 * Runs a repo script the way a deploy or developer does (`node scripts/...`),
 * with only the env it needs. Spawned, not imported, so the test harness never
 * drifts from the real command.
 */
export function runScript(
  script: string,
  env: Record<string, string>,
): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: repoRoot,
      env: { PATH: process.env['PATH'] ?? '', ...env },
    });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

/** The real `pnpm db:migrate` (drizzle-kit migrate over `drizzle/`). */
export async function migrate(databaseUrl: string): Promise<string> {
  const { code, output } = await runScript('scripts/db/migrate.mjs', {
    DATABASE_URL: databaseUrl,
  });
  if (code !== 0) throw new Error(`migrate failed:\n${output}`);
  return output;
}

/**
 * The reference-data statements of scripts/db/seed-domain-baseline.sql
 * (cities, categories, packages, prices, entitlements), without its users,
 * companies and their shared password: tests create their own people.
 */
export function taxonomySeedStatements(): string[] {
  const sql = readFileSync(
    `${repoRoot}scripts/db/seed-domain-baseline.sql`,
    'utf8',
  )
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');
  return sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => {
      const table = /^insert\s+into\s+(\w+)/i.exec(s)?.[1];
      return table !== undefined && TAXONOMY_TABLES.includes(table);
    });
}

/**
 * The template every test file copies: migrated by the real migrate, then the
 * RS districts and cities (`pnpm db:seed:rs`) and the taxonomy above.
 */
export async function prepareTemplate(databaseUrl: string): Promise<void> {
  await migrate(databaseUrl);
  const rs = await runScript('scripts/db/seed-rs-locations.mjs', {
    DATABASE_URL: databaseUrl,
  });
  if (rs.code !== 0) throw new Error(`seed-rs-locations failed:\n${rs.output}`);
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const statement of taxonomySeedStatements()) {
      await client.query(statement);
    }
  } finally {
    await client.end();
  }
}
