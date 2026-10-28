// T4.1 the outbox path on real Postgres and Redis: poll → queue → dispatch,
// idempotent claims, rollback on handler failure, and dead letters.
import { Queue, type Job } from 'bullmq';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createDb } from 'database';
import {
  createBullmqRedisConnection,
  PLATFORM_QUEUE_NAME,
  PlatformJobName,
} from 'shared';
import { insertOutboxEvent, testDb } from 'testing/db';
import { testRedisUrl } from 'testing/redis';
import { recordOutboxDlqIfTerminalFailure } from './outbox-dlq';
import {
  getWorkerDatabase,
  pollOutboxToPlatformQueue,
  processOutboxDispatchJob,
} from './outbox';

const { db, pool } = createDb(testDb().url);
const connection = createBullmqRedisConnection(testRedisUrl());
const queue = new Queue(PLATFORM_QUEUE_NAME, { connection, prefix: '{test}' });
const NO_JOB = '00000000-0000-4000-8000-00000000dead';
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);
const processedAt = async (id: number) =>
  (await q('select processed_at from outbox_events where id = $1', [id]))
    .rows[0].processed_at as Date | null;

beforeEach(async () => {
  await queue.obliterate({ force: true });
  await q(
    'update outbox_events set processed_at = now() where processed_at is null',
  );
});

afterAll(async () => {
  await queue.close();
  await connection.quit();
  await pool.end();
  // The DLQ code opens the worker's own pool (getWorkerDatabase singleton).
  await getWorkerDatabase()?.pool.end();
});

describe('outbox poll', () => {
  it('queues one dispatch job per unprocessed event, with a stable job id', async () => {
    const id = await insertOutboxEvent('job_published', { jobId: NO_JOB });
    await pollOutboxToPlatformQueue(queue, db, { batchSize: 10 });
    await pollOutboxToPlatformQueue(queue, db, { batchSize: 10 });
    const jobs = await queue.getJobs(['waiting', 'delayed']);
    expect(jobs.map((j) => [j.name, j.data.outboxEventId])).toEqual([
      [PlatformJobName.OutboxDispatch, id],
    ]);
  });

  it('takes the oldest events first, at most a batch per poll', async () => {
    const ids = [];
    for (let i = 0; i < 5; i++)
      ids.push(await insertOutboxEvent('job_submitted', { jobId: NO_JOB }));
    await pollOutboxToPlatformQueue(queue, db, { batchSize: 3 });
    const queued = (await queue.getJobs(['waiting']))
      .map((j) => j.data.outboxEventId as number)
      .sort((a, b) => a - b);
    expect(queued).toEqual(ids.slice(0, 3));
  });

  it('carries the request correlation id into the job', async () => {
    const { rows } = await q(
      `insert into outbox_events (event_type, payload, correlation_id) values ('job_submitted', '{}', 'req-123') returning id`,
    );
    await pollOutboxToPlatformQueue(queue, db, { batchSize: 10 });
    const [job] = await queue.getJobs(['waiting']);
    expect(job?.data).toEqual({
      outboxEventId: rows[0].id,
      correlationId: 'req-123',
    });
  });

  it('ignores events that are already processed', async () => {
    const id = await insertOutboxEvent('job_published', { jobId: NO_JOB });
    await q('update outbox_events set processed_at = now() where id = $1', [
      id,
    ]);
    await pollOutboxToPlatformQueue(queue, db, { batchSize: 10 });
    expect(await queue.getJobs(['waiting'])).toHaveLength(0);
  });
});

describe('outbox dispatch', () => {
  it('claims the event once: a re-delivered job is a no-op and afterCommit runs once', async () => {
    const id = await insertOutboxEvent('job_rejected', { jobId: NO_JOB });
    const seen: number[] = [];
    const afterCommit = async (row: { id: number }) => {
      seen.push(row.id);
    };
    await processOutboxDispatchJob(db, id, { afterCommit });
    await processOutboxDispatchJob(db, id, { afterCommit });
    expect(seen).toEqual([id]);
    expect(await processedAt(id)).not.toBeNull();
  });

  it('two workers dispatching the same event at once: exactly one claims it', async () => {
    const id = await insertOutboxEvent('job_rejected', { jobId: NO_JOB });
    const seen: number[] = [];
    await Promise.all(
      [1, 2, 3].map(() =>
        processOutboxDispatchJob(db, id, {
          afterCommit: async (row) => void seen.push(row.id),
        }),
      ),
    );
    expect(seen).toEqual([id]);
  });

  it('a handler failure rolls the claim back, so a retry can claim it again', async () => {
    // A malformed job id makes the in-transaction listing touch throw.
    const id = await insertOutboxEvent('job_published', {
      jobId: 'not-a-uuid',
    });
    await expect(processOutboxDispatchJob(db, id)).rejects.toThrow();
    expect(await processedAt(id)).toBeNull();
    await q(`update outbox_events set payload = $2 where id = $1`, [
      id,
      JSON.stringify({ jobId: NO_JOB }),
    ]);
    await processOutboxDispatchJob(db, id);
    expect(await processedAt(id)).not.toBeNull();
  });

  it('an unknown event id is a quiet no-op', async () => {
    await expect(
      processOutboxDispatchJob(db, 999_999),
    ).resolves.toBeUndefined();
  });

  it('a job_published event touches the job listing inside the claim', async () => {
    const { rows: c } = await q(
      `insert into companies (slug, legal_name) values ('touch-co', 'Touch d.o.o.') returning id`,
    );
    const { rows: u } = await q(
      `insert into users (email, role) values ('touch@primer.rs', 'employer') returning id`,
    );
    const { rows: j } = await q(
      `insert into jobs (company_id, created_by_user_id, title, updated_at) values ($1, $2, 'Touch', now() - interval '1 day') returning id, updated_at`,
      [c[0].id, u[0].id],
    );
    const id = await insertOutboxEvent('job_published', { jobId: j[0].id });
    await processOutboxDispatchJob(db, id);
    const { rows } = await q('select updated_at from jobs where id = $1', [
      j[0].id,
    ]);
    expect(rows[0].updated_at.getTime()).toBeGreaterThan(
      j[0].updated_at.getTime(),
    );
  });
});

describe('dead letters', () => {
  const fakeJob = (outboxEventId: number, attemptsMade: number, attempts = 5) =>
    ({
      id: `outbox-${outboxEventId}`,
      name: PlatformJobName.OutboxDispatch,
      data: { outboxEventId },
      opts: { attempts },
      attemptsMade,
      stacktrace: ['Error: boom\n    at handler'],
    }) as unknown as Job;
  const deadLetters = async (id: number) =>
    (
      await q(
        'select error_message, attempts_made, event_type from outbox_dead_letters where outbox_event_id = $1',
        [id],
      )
    ).rows;

  it('a failure with retries left writes no dead letter', async () => {
    const id = await insertOutboxEvent('job_published', { jobId: NO_JOB });
    await recordOutboxDlqIfTerminalFailure(fakeJob(id, 2), new Error('boom'));
    expect(await deadLetters(id)).toEqual([]);
  });

  it('the last failed attempt writes one dead letter with the event snapshot', async () => {
    const id = await insertOutboxEvent('job_published', { jobId: NO_JOB });
    await recordOutboxDlqIfTerminalFailure(
      fakeJob(id, 5),
      new Error('resend down'),
    );
    await recordOutboxDlqIfTerminalFailure(
      fakeJob(id, 5),
      new Error('resend down again'),
    );
    expect(await deadLetters(id)).toEqual([
      {
        error_message: 'resend down',
        attempts_made: 5,
        event_type: 'job_published',
      },
    ]);
  });

  it('an unrecoverable error is terminal at once', async () => {
    const { UnrecoverableError } = await import('bullmq');
    const id = await insertOutboxEvent('job_published', { jobId: NO_JOB });
    await recordOutboxDlqIfTerminalFailure(
      fakeJob(id, 1),
      new UnrecoverableError('bad payload'),
    );
    expect(await deadLetters(id)).toHaveLength(1);
  });

  it('other job kinds never write outbox dead letters', async () => {
    const id = await insertOutboxEvent('job_published', { jobId: NO_JOB });
    const job = {
      ...fakeJob(id, 5),
      name: PlatformJobName.NotificationEmail,
    } as unknown as Job;
    await recordOutboxDlqIfTerminalFailure(job, new Error('x'));
    expect(await deadLetters(id)).toEqual([]);
  });
});
