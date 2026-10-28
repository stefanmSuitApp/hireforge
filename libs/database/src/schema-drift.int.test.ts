// `drizzle/meta` only has the 0000 snapshot and migrations are hand-written
// (PROGRESS.md "Known issues"), so nothing else checks that schema.ts — what
// the code queries — matches what the migrations really create. This does,
// in both directions, against the template migrated by the real migrate.
import { getTableColumns, is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import { testDb } from 'testing/db';
import * as schema from './schema';

const tables = (Object.values(schema) as unknown[]).filter((v): v is PgTable =>
  is(v, PgTable),
);
const configs = tables.map((t) => getTableConfig(t));

/** Exist in migrations on purpose, not in schema.ts. Each needs a reason. */
const MIGRATION_ONLY_INDEXES: Record<string, string> = {
  // Expression GIN index Drizzle can't declare; the search query must match it.
  jobs_fts_published_idx: 'full-text search (0002)',
};

/** Foreign keys the migrations add that schema.ts leaves out on purpose. */
const MIGRATION_ONLY_FOREIGN_KEYS: Record<string, string> = {
  // schema.ts: "optional home city (`cities.id`; FK in migrations)".
  'candidates.city_id -> cities.id': 'declared in migration 0022 only',
};

interface DbColumn {
  table: string;
  column: string;
  type: string;
  notNull: boolean;
  hasDefault: boolean;
}

async function dbColumns(): Promise<DbColumn[]> {
  const { rows } = await testDb().pool.query<DbColumn>(`
    select c.relname as table, a.attname as column,
           format_type(a.atttypid, a.atttypmod) as type,
           a.attnotnull as "notNull", a.atthasdef as "hasDefault"
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
       and a.attnum > 0 and not a.attisdropped`);
  return rows;
}

/** Drizzle's SQL type, spelled the way format_type() prints it. */
function expectedType(sqlType: string): string {
  if (sqlType === 'serial') return 'integer';
  return sqlType;
}

describe('schema.ts matches the migrated database', () => {
  it('has the same tables', async () => {
    const { rows } = await testDb().pool.query<{ relname: string }>(
      `select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'`,
    );
    expect(rows.map((r) => r.relname).sort()).toEqual(
      configs.map((c) => c.name).sort(),
    );
  });

  for (const table of tables) {
    const config = getTableConfig(table);
    it(`${config.name}: every column has the same type, nullability and default`, async () => {
      const actual = (await dbColumns()).filter((c) => c.table === config.name);
      const declared = Object.values(getTableColumns(table)).map((col) => ({
        table: config.name,
        column: col.name,
        type: expectedType(col.getSQLType()),
        notNull: col.notNull || col.primary,
        hasDefault: col.hasDefault || col.columnType === 'PgSerial',
      }));
      const byName = (a: { column: string }, b: { column: string }) =>
        a.column.localeCompare(b.column);
      expect(actual.sort(byName)).toEqual(declared.sort(byName));
    });
  }

  it('every index in schema.ts exists with the same uniqueness and partial filter', async () => {
    const { rows } = await testDb().pool.query<{
      name: string;
      table: string;
      unique: boolean;
      partial: boolean;
    }>(`
      select i.relname as name, t.relname as table, x.indisunique as unique,
             x.indpred is not null as partial
        from pg_index x
        join pg_class i on i.oid = x.indexrelid
        join pg_class t on t.oid = x.indrelid
        join pg_namespace n on n.oid = t.relnamespace
       where n.nspname = 'public' and not x.indisprimary`);
    const actual = new Map(rows.map((r) => [r.name, r]));
    const declared = configs.flatMap((c) =>
      c.indexes.map((ix) => ({
        name: ix.config.name ?? '',
        table: c.name,
        unique: ix.config.unique,
        partial: ix.config.where !== undefined,
      })),
    );
    for (const ix of declared) {
      expect(actual.get(ix.name), `index ${ix.name}`).toEqual(ix);
    }
    const extra = rows
      .map((r) => r.name)
      .filter(
        (name) =>
          !declared.some((d) => d.name === name) &&
          !(name in MIGRATION_ONLY_INDEXES) &&
          // Unique constraints show up as indexes too; checked by name below.
          !name.endsWith('_pkey'),
      );
    expect(extra, 'indexes only the migrations know about').toEqual([]);
  });

  it('every CHECK constraint in schema.ts exists', async () => {
    const { rows } = await testDb().pool.query<{ conname: string }>(
      // conrelid = 0 are domain checks (information_schema's own), not tables'.
      `select conname from pg_constraint where contype = 'c' and conrelid <> 0`,
    );
    const actual = rows.map((r) => r.conname);
    const declared = configs.flatMap((c) => c.checks.map((ch) => ch.name));
    expect(actual).toEqual(expect.arrayContaining(declared));
    expect(actual.filter((name) => !declared.includes(name))).toEqual([]);
  });

  it('every foreign key matches: same target and ON DELETE, both ways', async () => {
    const { rows } = await testDb().pool.query<{
      key: string;
      on_delete: string;
    }>(`
      select tc.relname || '.' || a.attname || ' -> ' || rc.relname || '.' || ra.attname as key,
             case con.confdeltype when 'a' then 'no action' when 'r' then 'restrict'
               when 'c' then 'cascade' when 'n' then 'set null' when 'd' then 'set default' end as on_delete
        from pg_constraint con
        join pg_class tc on tc.oid = con.conrelid
        join pg_class rc on rc.oid = con.confrelid
        join pg_attribute a on a.attrelid = con.conrelid and a.attnum = con.conkey[1]
        join pg_attribute ra on ra.attrelid = con.confrelid and ra.attnum = con.confkey[1]
       where con.contype = 'f'`);
    const actual = Object.fromEntries(rows.map((r) => [r.key, r.on_delete]));
    const declared = Object.fromEntries(
      configs.flatMap((c) =>
        c.foreignKeys.map((fk) => {
          const ref = fk.reference();
          return [
            `${c.name}.${ref.columns[0]?.name} -> ${getTableConfig(ref.foreignTable).name}.${ref.foreignColumns[0]?.name}`,
            fk.onDelete ?? 'no action',
          ];
        }),
      ),
    );
    for (const key of Object.keys(MIGRATION_ONLY_FOREIGN_KEYS)) {
      expect(actual[key], `${key} exists in the database`).toBeDefined();
      delete actual[key];
    }
    expect(actual).toEqual(declared);
  });
});
