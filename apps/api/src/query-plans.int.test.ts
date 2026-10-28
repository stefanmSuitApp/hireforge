// T3.5 query plans of the real SQL the API sends: captured from the pg driver
// while calling the endpoint, then EXPLAINed with sequential scans disabled,
// so "uses the index" means the index can serve that exact expression.
import type { INestApplication } from '@nestjs/common';
import pg from 'pg';
import {
  explain,
  insertCompany,
  insertEmployer,
  insertJob,
  insertSubscription,
  seqScans,
  testDb,
  usesIndex,
} from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { http, signIn, startApp, stopApp } from './__harness__/test-app';

interface Captured {
  text: string;
  values: unknown[];
}

let app: INestApplication;
let captured: Captured[] = [];
const originalQuery = pg.Client.prototype.query;

beforeAll(async () => {
  // Record every statement the app sends (Drizzle passes `({ text, rowMode }, params)`).
  pg.Client.prototype.query = function (this: pg.Client, ...args: unknown[]) {
    const [first, second] = args as [unknown, unknown];
    if (typeof first === 'object' && first !== null && 'text' in first) {
      const config = first as { text: string; values?: unknown[] };
      captured.push({
        text: config.text,
        values: config.values ?? (Array.isArray(second) ? second : []),
      });
    } else if (typeof first === 'string') {
      captured.push({
        text: first,
        values: Array.isArray(second) ? second : [],
      });
    }
    return (originalQuery as (...a: unknown[]) => unknown).apply(this, args);
  } as typeof pg.Client.prototype.query;
  app = await startApp();
});
afterAll(async () => {
  pg.Client.prototype.query = originalQuery;
  await stopApp(app);
});

/** The statements an HTTP call sent, filtered by `match`. */
async function sqlOf(
  call: () => Promise<unknown>,
  match: RegExp,
): Promise<Captured> {
  captured = [];
  await call();
  const hit = captured.find((c) => match.test(c.text));
  if (!hit)
    throw new Error(`no statement matching ${match} among ${captured.length}`);
  return hit;
}

/** EXPLAIN with seq scans off, in a transaction that is rolled back. */
async function planWithoutSeqScan(statement: Captured) {
  const client = await testDb().pool.connect();
  try {
    await client.query('begin');
    await client.query('set local enable_seqscan = off');
    return await explain(client, statement.text, statement.values);
  } finally {
    await client.query('rollback');
    client.release();
  }
}

describe('public job search', () => {
  it('the full-text query uses jobs_fts_published_idx', async () => {
    const company = await insertCompany();
    const author = await insertEmployer(company.id);
    // Enough other live jobs that the planner weighs the index against them
    // (with one row any index is as cheap as another).
    for (let batch = 0; batch < 20; batch++) {
      await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          insertJob(company.id, author.id, {
            status: 'published',
            title: `Zidar ${batch}-${i}`,
          }),
        ),
      );
    }
    await insertJob(company.id, author.id, {
      status: 'published',
      title: 'Kuvar',
    });
    await testDb().pool.query('analyze jobs');
    const statement = await sqlOf(
      () => http(app).get('/api/public/jobs?q=kuvar'),
      /websearch_to_tsquery/,
    );
    const plan = await planWithoutSeqScan(statement);
    expect(usesIndex(plan, 'jobs_fts_published_idx')).toBe(true);
  });

  it('the unfiltered public list never has to read every job row', async () => {
    const statement = await sqlOf(
      () => http(app).get('/api/public/jobs'),
      /from "jobs"[\s\S]*where[\s\S]*"jobs"\."status" = \$\d+/,
    );
    const plan = await planWithoutSeqScan(statement);
    // Any index on status serves it (today the planner picks the partial
    // jobs_slug_published_unique); a seq scan here means no index can.
    expect(seqScans(plan, 'jobs')).toBe(false);
  });
});

describe('employer job list', () => {
  it("lists a company's jobs through jobs_company_id_idx", async () => {
    const company = await insertCompany();
    await insertSubscription(company.id);
    const user = await insertEmployer(company.id);
    await insertJob(company.id, user.id);
    const session = await signIn(app.getHttpServer(), user);
    const statement = await sqlOf(
      () => http(app).get('/api/employer/jobs').set(session.headers),
      /from "jobs"[\s\S]*"jobs"\."company_id" = \$\d+/,
    );
    const plan = await planWithoutSeqScan(statement);
    expect(usesIndex(plan, 'jobs_company_id_idx')).toBe(true);
  });
});

describe('outbox poll', () => {
  it('the worker poll (oldest unprocessed first) reads only the unprocessed rows, in order', async () => {
    const plan = await planWithoutSeqScan({
      // The statement Drizzle builds for pollOutboxToPlatformQueue (apps/worker/src/outbox.ts).
      text: 'select "id", "correlation_id" from "outbox_events" where "outbox_events"."processed_at" is null order by "outbox_events"."id" asc limit $1',
      values: [50],
    });
    expect(usesIndex(plan, 'outbox_events_unprocessed_idx')).toBe(true);
  });
});
