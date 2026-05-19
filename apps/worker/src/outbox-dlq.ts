import { UnrecoverableError } from 'bullmq';
import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';

import type { DrizzleDb } from 'database';
import { outboxDeadLetters, outboxEvents } from 'database';
import {
  outboxDispatchJobPayloadSchema,
  PlatformJobName,
  writeLog,
} from 'shared';

import { getWorkerDatabase } from './outbox';

function isUnrecoverableJobError(err: unknown): boolean {
  return (
    err instanceof UnrecoverableError ||
    (typeof err === 'object' &&
      err !== null &&
      'name' in err &&
      (err as { name: string }).name === 'UnrecoverableError')
  );
}

/**
 * BullMQ emits `failed` after every failed attempt, including ones that will retry.
 * DLQ rows must be written only when no further automatic retries will run.
 */
function isTerminalBullmqFailure(job: Job, err: unknown): boolean {
  if (isUnrecoverableJobError(err)) {
    return true;
  }
  const configuredAttempts = job.opts?.attempts ?? 1;
  return job.attemptsMade >= configuredAttempts;
}

/**
 * Persist a terminal failure for `outbox-dispatch` (after all retries or unrecoverable).
 * Idempotent on `outbox_event_id` (one row per outbox event).
 */
export async function recordOutboxDispatchDeadLetter(
  db: DrizzleDb,
  args: {
    outboxEventId: number;
    bullmqJobId: string;
    error: unknown;
    attemptsMade: number;
    stacktrace: string[] | undefined;
    correlationId?: string;
  },
): Promise<void> {
  const errMsg =
    args.error instanceof Error ? args.error.message : String(args.error);
  const trace =
    args.stacktrace && args.stacktrace.length > 0
      ? JSON.stringify(args.stacktrace)
      : null;

  const [src] = await db
    .select({
      eventType: outboxEvents.eventType,
      payload: outboxEvents.payload,
    })
    .from(outboxEvents)
    .where(eq(outboxEvents.id, args.outboxEventId))
    .limit(1);

  const inserted = await db
    .insert(outboxDeadLetters)
    .values({
      outboxEventId: args.outboxEventId,
      bullmqJobId: args.bullmqJobId,
      eventType: src?.eventType ?? null,
      payloadSnapshot: src?.payload ?? undefined,
      errorMessage: errMsg,
      attemptsMade: args.attemptsMade,
      stacktrace: trace,
    })
    .onConflictDoNothing({
      target: outboxDeadLetters.outboxEventId,
    })
    .returning({ id: outboxDeadLetters.id });

  if (inserted.length > 0) {
    writeLog('warn', 'outbox_dead_letter_recorded', {
      service: 'worker',
      correlationId: args.correlationId ?? '',
      outboxEventId: String(args.outboxEventId),
      bullmqJobId: args.bullmqJobId,
      attemptsMade: String(args.attemptsMade),
    });
  }
}

/** After BullMQ emits `failed`, record DLQ only when retries are exhausted (or error is unrecoverable). */
export async function recordOutboxDlqIfTerminalFailure(
  job: Job | undefined,
  err: unknown,
): Promise<void> {
  if (!job || job.name !== PlatformJobName.OutboxDispatch) {
    return;
  }
  if (!isTerminalBullmqFailure(job, err)) {
    return;
  }
  const parsed = outboxDispatchJobPayloadSchema.safeParse(job.data);
  if (!parsed.success) {
    return;
  }
  const database = getWorkerDatabase();
  if (!database) {
    return;
  }
  const correlationId = parsed.data.correlationId ?? '';
  try {
    await recordOutboxDispatchDeadLetter(database.db, {
      outboxEventId: parsed.data.outboxEventId,
      bullmqJobId: String(job.id ?? ''),
      error: err,
      attemptsMade: job.attemptsMade,
      stacktrace: job.stacktrace,
      correlationId: correlationId || undefined,
    });
  } catch (e) {
    writeLog('error', 'outbox_dead_letter_insert_failed', {
      service: 'worker',
      correlationId,
      err: e instanceof Error ? e.message : String(e),
    });
  }
}
