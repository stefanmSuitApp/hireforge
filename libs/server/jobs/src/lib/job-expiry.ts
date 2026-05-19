import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
} from 'drizzle-orm';
import { jobs, outboxEvents } from 'database';
import type { DrizzleDbOrTx } from 'database';

const DEFAULT_BATCH = 200;
const MS_PER_DAY = 86_400_000;

export type JobExpiryOptions = {
  /** Max rows processed per invocation (default 200). */
  batchSize?: number;
  now?: Date;
};

export type JobExpiringSoonOptions = JobExpiryOptions & {
  /** Default 3 days ahead of `now`. */
  horizonDays?: number;
};

/**
 * Transitions `published` jobs past `expires_at` to `expired`, sets `archived_at`,
 * and enqueues `job_expired` outbox rows (Step 10.3).
 */
export async function expirePublishedJobsPastExpiresAt(
  db: DrizzleDbOrTx,
  options: JobExpiryOptions = {},
): Promise<number> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH;
  const now = options.now ?? new Date();

  return db.transaction(async (tx) => {
    const picked = await tx
      .select({
        id: jobs.id,
        companyId: jobs.companyId,
        expiresAt: jobs.expiresAt,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'published'),
          isNotNull(jobs.expiresAt),
          lt(jobs.expiresAt, now),
        ),
      )
      .orderBy(asc(jobs.expiresAt))
      .limit(batchSize);

    if (picked.length === 0) {
      return 0;
    }

    const ids = picked.map((r) => r.id);
    await tx
      .update(jobs)
      .set({
        status: 'expired',
        archivedAt: now,
        updatedAt: now,
      })
      .where(inArray(jobs.id, ids));

    for (const row of picked) {
      await tx.insert(outboxEvents).values({
        eventType: 'job_expired',
        correlationId: null,
        payload: {
          jobId: row.id,
          companyId: row.companyId,
          expiredAt: now.toISOString(),
          priorExpiresAt: row.expiresAt?.toISOString() ?? null,
        },
      });
    }

    return picked.length;
  });
}

/**
 * One-time notification per job: `published`, `expires_at` within `horizonDays`,
 * and `expiring_soon_notified_at` still null. Writes `job_expiring_soon` outbox rows.
 */
export async function notifyPublishedJobsExpiringSoon(
  db: DrizzleDbOrTx,
  options: JobExpiringSoonOptions = {},
): Promise<number> {
  const batchSize = options.batchSize ?? DEFAULT_BATCH;
  const now = options.now ?? new Date();
  const horizonDays = options.horizonDays ?? 3;
  const horizonEnd = new Date(now.getTime() + horizonDays * MS_PER_DAY);

  return db.transaction(async (tx) => {
    const picked = await tx
      .select({
        id: jobs.id,
        companyId: jobs.companyId,
        expiresAt: jobs.expiresAt,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'published'),
          isNotNull(jobs.expiresAt),
          gt(jobs.expiresAt, now),
          lte(jobs.expiresAt, horizonEnd),
          isNull(jobs.expiringSoonNotifiedAt),
        ),
      )
      .orderBy(asc(jobs.expiresAt))
      .limit(batchSize);

    if (picked.length === 0) {
      return 0;
    }

    const ids = picked.map((r) => r.id);
    await tx
      .update(jobs)
      .set({
        expiringSoonNotifiedAt: now,
        updatedAt: now,
      })
      .where(inArray(jobs.id, ids));

    for (const row of picked) {
      await tx.insert(outboxEvents).values({
        eventType: 'job_expiring_soon',
        correlationId: null,
        payload: {
          jobId: row.id,
          companyId: row.companyId,
          expiresAt: row.expiresAt?.toISOString() ?? null,
          notifiedAt: now.toISOString(),
          horizonDays,
        },
      });
    }

    return picked.length;
  });
}
