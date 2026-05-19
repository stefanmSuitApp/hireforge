import type { Queue } from 'bullmq';
import { and, asc, eq, isNull } from 'drizzle-orm';

import type { DrizzleDb } from 'database';
import { createDb, outboxEvents } from 'database';
import {
  OUTBOX_DISPATCH_JOB_OPTIONS,
  outboxDispatchBullmqJobId,
  PlatformJobName,
} from 'shared';

import { sendBillingTransactionalEmail } from './billing-email-dispatch';
import { dispatchOutboxHooks } from './outbox-hooks';
import { workerLog } from './worker-log';

let workerDb: ReturnType<typeof createDb> | null = null;

export function getWorkerDatabase(): ReturnType<typeof createDb> | null {
  const url = process.env['DATABASE_URL']?.trim();
  if (!url) {
    return null;
  }
  if (!workerDb) {
    workerDb = createDb(url);
  }
  return workerDb;
}

export async function pollOutboxToPlatformQueue(
  queue: Queue,
  db: DrizzleDb,
  opts: { batchSize: number },
): Promise<void> {
  const rows = await db
    .select({
      id: outboxEvents.id,
      correlationId: outboxEvents.correlationId,
    })
    .from(outboxEvents)
    .where(isNull(outboxEvents.processedAt))
    .orderBy(asc(outboxEvents.id))
    .limit(opts.batchSize);

  for (const row of rows) {
    const correlationId = row.correlationId?.trim();
    await queue.add(
      PlatformJobName.OutboxDispatch,
      {
        outboxEventId: row.id,
        ...(correlationId ? { correlationId } : {}),
      },
      {
        jobId: outboxDispatchBullmqJobId(row.id),
        ...OUTBOX_DISPATCH_JOB_OPTIONS,
      },
    );
  }
}

/**
 * Claims the outbox row (sets `processed_at`) inside a transaction, then runs handlers.
 * If the handler throws, the transaction rolls back so `processed_at` is cleared and BullMQ can retry.
 */
export async function processOutboxDispatchJob(
  db: DrizzleDb,
  outboxEventId: number,
): Promise<void> {
  let billingHook:
    | { eventType: 'proforma_issued' | 'invoice_issued'; payload: unknown }
    | undefined;

  await db.transaction(async (tx) => {
    const claimed = await tx
      .update(outboxEvents)
      .set({ processedAt: new Date() })
      .where(
        and(
          eq(outboxEvents.id, outboxEventId),
          isNull(outboxEvents.processedAt),
        ),
      )
      .returning({
        id: outboxEvents.id,
        eventType: outboxEvents.eventType,
        payload: outboxEvents.payload,
      });

    const row = claimed[0];
    if (!row) {
      workerLog('warn', 'outbox_dispatch_noop', {
        service: 'worker',
        outboxEventId: String(outboxEventId),
        reason: 'already_processed_or_missing',
      });
      return;
    }

    await dispatchOutboxHooks(tx, row);

    if (
      row.eventType === 'proforma_issued' ||
      row.eventType === 'invoice_issued'
    ) {
      billingHook = {
        eventType: row.eventType,
        payload: row.payload,
      };
    }
  });

  if (billingHook) {
    try {
      await sendBillingTransactionalEmail({
        db,
        eventType: billingHook.eventType,
        payload: billingHook.payload,
      });
    } catch (e) {
      workerLog('error', 'billing_email_dispatch_failed', {
        service: 'worker',
        outboxEventId: String(outboxEventId),
        err: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

export function startOutboxPoller(args: {
  queue: Queue;
  getDb: () => ReturnType<typeof createDb> | null;
  intervalMs: number;
  batchSize: number;
}): ReturnType<typeof setInterval> {
  let ticking = false;
  return setInterval(() => {
    if (ticking) {
      return;
    }
    void (async () => {
      ticking = true;
      try {
        const database = args.getDb();
        if (!database) {
          return;
        }
        await pollOutboxToPlatformQueue(args.queue, database.db, {
          batchSize: args.batchSize,
        });
      } catch (e) {
        workerLog('error', 'outbox_poll_failed', {
          service: 'worker',
          err: e instanceof Error ? e.message : String(e),
        });
      } finally {
        ticking = false;
      }
    })();
  }, args.intervalMs);
}
