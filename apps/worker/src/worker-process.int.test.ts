// T4 end to end: the built worker (dist/apps/worker/main.js, what the image
// runs) against this file's Postgres, Redis and a Resend stub; plus real
// BullMQ retries ending in a dead letter.
import { type ChildProcess, spawn } from 'node:child_process';
import { join } from 'node:path';
import { Queue, Worker } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from 'database';
import {
  createBullmqRedisConnection,
  OUTBOX_DISPATCH_JOB_OPTIONS,
  outboxDispatchBullmqJobId,
  PlatformJobName,
} from 'shared';
import { startResendStub } from 'testing';
import {
  insertCompany,
  insertEmployer,
  insertJob,
  insertOutboxEvent,
  insertSubscription,
  testDb,
} from 'testing/db';
import { testRedisUrl } from 'testing/redis';
import { recordOutboxDlqIfTerminalFailure } from './outbox-dlq';
import { getWorkerDatabase, processOutboxDispatchJob } from './outbox';

// apps/worker is the working directory of the Nx target; the target builds first.
const MAIN = join(process.cwd(), '../../dist/apps/worker/main.js');
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);

async function until<T>(
  check: () => Promise<T | undefined | false>,
  ms = 15_000,
): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() > end) throw new Error('timed out waiting');
    await new Promise((r) => setTimeout(r, 200));
  }
}

describe('the built worker process', () => {
  let child: ChildProcess;
  let output = '';
  let resend: Awaited<ReturnType<typeof startResendStub>>;

  beforeAll(async () => {
    resend = await startResendStub();
    child = spawn(process.execPath, [MAIN], {
      env: {
        PATH: process.env['PATH'] ?? '',
        NODE_ENV: 'test',
        DATABASE_URL: testDb().url,
        REDIS_URL: testRedisUrl(),
        ...resend.env,
        APP_PUBLIC_ORIGIN: 'https://sljakam.test',
        OUTBOX_POLL_INTERVAL_MS: '500',
        WORKER_SCHEDULE_TICK_MS: '1000',
        // These two call Sanity and the NBS site; they are covered in-process.
        WORKER_CMS_PACKAGES_RECONCILE_MS: '0',
        WORKER_NBS_MIDDLE_RATE_MS: '0',
      },
    });
    child.stdout?.on('data', (c) => (output += c));
    child.stderr?.on('data', (c) => (output += c));
    await until(async () => output.includes('"msg":"worker_started"'));
  }, 30_000);

  afterAll(async () => {
    child?.kill('SIGTERM');
    await resend?.close();
  });

  it('logs worker_started and which schedulers are on', () => {
    expect(output).toContain('"msg":"worker_started"');
    expect(output).toContain('cms_packages_reconcile_scheduler_disabled');
    expect(output).toContain('nbs_middle_rate_refresh_scheduler_disabled');
  });

  it('an outbox event becomes exactly one email per employer, and the event is marked processed', async () => {
    const company = await insertCompany();
    const employer = await insertEmployer(company.id);
    const job = await insertJob(company.id, employer.id, {
      status: 'published',
      title: 'Tesar',
    });
    const id = await insertOutboxEvent('application_submitted', {
      jobId: job.id,
      applicationId: 'a',
      candidateId: 'c',
    });
    const mail = await until(async () => resend.to(employer.email)[0]);
    expect(mail.html).toContain('Tesar');
    expect(mail.html).toContain(
      `https://sljakam.test/sr/employer/jobs/${job.id}/applications`,
    );
    await until(
      async () =>
        (await q('select processed_at from outbox_events where id = $1', [id]))
          .rows[0].processed_at,
    );
    // Several polls later there is still one email.
    await new Promise((r) => setTimeout(r, 1500));
    expect(resend.to(employer.email)).toHaveLength(1);
  }, 30_000);

  it('the scheduled tick expires a job past its date and the employer is told', async () => {
    const company = await insertCompany();
    const sub = await insertSubscription(company.id);
    const employer = await insertEmployer(company.id);
    const job = await insertJob(company.id, employer.id, {
      status: 'published',
      subscriptionId: sub.id,
      title: 'Moler',
    });
    await q(
      `update jobs set expires_at = now() - interval '1 minute' where id = $1`,
      [job.id],
    );
    await until(
      async () =>
        (await q('select status from jobs where id = $1', [job.id])).rows[0]
          .status === 'expired',
    );
    const mail = await until(async () => resend.to(employer.email)[0]);
    expect(mail.html).toContain('Moler');
  }, 30_000);

  it('the scheduled tick ends subscriptions past their end date', async () => {
    const company = await insertCompany();
    const sub = await insertSubscription(company.id);
    await q(
      `update subscriptions set ends_at = now() - interval '1 minute' where id = $1`,
      [sub.id],
    );
    await until(
      async () =>
        (await q('select status from subscriptions where id = $1', [sub.id]))
          .rows[0].status === 'expired',
    );
  }, 30_000);
});

describe('retries and dead letters with real BullMQ', () => {
  const { db, pool } = createDb(testDb().url);
  const connection = createBullmqRedisConnection(testRedisUrl());
  const workerConnection = createBullmqRedisConnection(testRedisUrl());
  const queueName = 'dlq-test';
  const queue = new Queue(queueName, { connection, prefix: '{dlq}' });
  let attempts: number[] = [];
  let worker: Worker;

  beforeAll(() => {
    // The processor and `failed` hook of apps/worker/src/main.ts, with fast backoff.
    worker = new Worker(
      queueName,
      async (job) => {
        attempts.push(Date.now());
        await processOutboxDispatchJob(db, job.data.outboxEventId as number);
      },
      { connection: workerConnection, prefix: '{dlq}' },
    );
    worker.on(
      'failed',
      (job, err) => void recordOutboxDlqIfTerminalFailure(job, err),
    );
  });

  afterAll(async () => {
    await worker.close();
    await queue.close();
    await connection.quit();
    await workerConnection.quit();
    await pool.end();
    await getWorkerDatabase()?.pool.end();
  });

  it('production outbox jobs retry 5 times with exponential backoff', () => {
    expect(OUTBOX_DISPATCH_JOB_OPTIONS).toMatchObject({
      attempts: 5,
      backoff: { type: 'exponential' },
    });
  });

  it('an event that keeps failing is retried with growing delays, then written to the dead letters once', async () => {
    attempts = [];
    const id = await insertOutboxEvent('job_published', {
      jobId: 'not-a-uuid',
    });
    await queue.add(
      PlatformJobName.OutboxDispatch,
      { outboxEventId: id },
      {
        jobId: outboxDispatchBullmqJobId(id),
        attempts: 3,
        // 300 ms → gaps of ~300 and ~600 ms: at 100 ms, CI scheduling noise
        // (±100 ms) made the second gap look shorter than the first.
        backoff: { type: 'exponential', delay: 300 },
      },
    );
    const rows = await until(async () => {
      const r = await q(
        'select attempts_made, event_type from outbox_dead_letters where outbox_event_id = $1',
        [id],
      );
      return r.rowCount ? r.rows : undefined;
    });
    expect(rows).toEqual([{ attempts_made: 3, event_type: 'job_published' }]);
    expect(attempts).toHaveLength(3);
    const [a, b, c] = attempts as [number, number, number];
    expect(c - b).toBeGreaterThan(b - a);
    const { rows: ev } = await q(
      'select processed_at from outbox_events where id = $1',
      [id],
    );
    expect(ev[0].processed_at).toBeNull();
  }, 30_000);

  it('the same event queued twice (same job id) is processed once', async () => {
    const id = await insertOutboxEvent('job_submitted', {
      jobId: '00000000-0000-4000-8000-00000000dead',
    });
    attempts = [];
    for (let i = 0; i < 2; i++) {
      await queue.add(
        PlatformJobName.OutboxDispatch,
        { outboxEventId: id },
        { jobId: outboxDispatchBullmqJobId(id) },
      );
    }
    await until(
      async () =>
        (await q('select processed_at from outbox_events where id = $1', [id]))
          .rows[0].processed_at,
    );
    await new Promise((r) => setTimeout(r, 300));
    expect(attempts).toHaveLength(1);
  }, 30_000);
});
