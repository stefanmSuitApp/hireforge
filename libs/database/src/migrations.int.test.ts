import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate, runScript } from 'testing/db';

// The repo root, from libs/database (where the Nx target runs).
const drizzleDir = join(process.cwd(), '../../drizzle');

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

const journal = JSON.parse(
  readFileSync(join(drizzleDir, 'meta/_journal.json'), 'utf8'),
) as { entries: JournalEntry[] };
const sqlFiles = readdirSync(drizzleDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

describe('the migration journal', () => {
  it('lists every SQL file exactly once, in file order', () => {
    expect(journal.entries.map((e) => `${e.tag}.sql`)).toEqual(sqlFiles);
  });

  it('numbers entries 0..n without gaps, matching the file prefixes', () => {
    journal.entries.forEach((entry, i) => {
      expect(entry.idx).toBe(i);
      expect(entry.tag.slice(0, 4)).toBe(String(i).padStart(4, '0'));
    });
  });

  // drizzle-kit migrate applies a file only if its `when` is newer than the last
  // applied one: a new entry with an older timestamp would be skipped silently.
  it('has strictly increasing timestamps', () => {
    for (let i = 1; i < journal.entries.length; i++) {
      expect(
        journal.entries[i]?.when,
        `${journal.entries[i]?.tag} must be newer than ${journal.entries[i - 1]?.tag}`,
      ).toBeGreaterThan(journal.entries[i - 1]?.when ?? Infinity);
    }
  });
});

describe('drizzle-kit snapshots', () => {
  // Known issue (PROGRESS.md): only 0000 has a snapshot, so `pnpm db:generate`
  // diffs schema.ts against the 0000 schema and emits a bogus full migration.
  // Keep hand-writing migrations; flip to `it` once snapshots are rebuilt.
  it.fails(
    'the latest migration has a snapshot, so db:generate diffs from today',
    () => {
      const last = journal.entries.at(-1);
      const snapshots = readdirSync(join(drizzleDir, 'meta'));
      expect(snapshots).toContain(
        `${String(last?.idx).padStart(4, '0')}_snapshot.json`,
      );
    },
  );
});

describe('migrating an empty Postgres with the real `pnpm db:migrate`', () => {
  // Its own server, so nothing another file did can make this pass or fail.
  let pg: StartedPostgreSqlContainer;
  let url: string;
  let client: Client;

  beforeAll(async () => {
    pg = await new PostgreSqlContainer('postgres:16-alpine').start();
    url = pg.getConnectionUri().replace('localhost', '127.0.0.1');
    await migrate(url);
    client = new Client({ connectionString: url });
    await client.connect();
  });

  afterAll(async () => {
    await client?.end();
    await pg?.stop();
  });

  it('applies every migration in the journal', async () => {
    const { rows } = await client.query(
      'select count(*)::int as n from drizzle.__drizzle_migrations',
    );
    expect(rows[0].n).toBe(journal.entries.length);
  });

  it('creates every domain table', async () => {
    const { rows } = await client.query<{ table_name: string }>(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'`,
    );
    expect(rows.map((r) => r.table_name)).toEqual(
      expect.arrayContaining([
        'users',
        'companies',
        'jobs',
        'applications',
        'subscriptions',
        'proformas',
        'invoices',
        'promo_codes',
        'auth_tokens',
        'company_join_requests',
        'outbox_events',
      ]),
    );
  });

  it('is a no-op when run again', async () => {
    const before = await client.query(
      'select count(*)::int as n from drizzle.__drizzle_migrations',
    );
    const second = await runScript('scripts/db/migrate.mjs', {
      DATABASE_URL: url,
    });
    expect(second.code, second.output).toBe(0);
    const after = await client.query(
      'select count(*)::int as n from drizzle.__drizzle_migrations',
    );
    expect(after.rows[0].n).toBe(before.rows[0].n);
  });

  it('the dev seeds load on top (RS locations, then the domain baseline)', async () => {
    const rs = await runScript('scripts/db/seed-rs-locations.mjs', {
      DATABASE_URL: url,
    });
    expect(rs.code, rs.output).toBe(0);
    const domain = await runScript('scripts/db/seed-domain-baseline.mjs', {
      DATABASE_URL: url,
    });
    expect(domain.code, domain.output).toBe(0);
    const { rows } = await client.query(
      'select count(*)::int as n from packages',
    );
    expect(rows[0].n).toBe(4);
  });

  it('the dev seed refuses to run with NODE_ENV=production', async () => {
    const refused = await runScript('scripts/db/seed-domain-baseline.mjs', {
      DATABASE_URL: url,
      NODE_ENV: 'production',
    });
    expect(refused.code).not.toBe(0);
    expect(refused.output).toContain('Refusing to load dev seed users');
  });
});
