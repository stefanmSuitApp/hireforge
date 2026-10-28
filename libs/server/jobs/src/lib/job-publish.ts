import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DrizzleDbOrTx } from 'database';
import { jobs, outboxEvents, subscriptions } from 'database';

import { buildPublishedJobFullSlug, makeShortId } from './job-slug';

export const JOB_PUBLISH_SLUG_ATTEMPTS = 12;

function pgUniqueViolation(e: unknown): boolean {
  let cur: unknown = e;
  for (let i = 0; i < 10 && cur; i++) {
    if (
      typeof cur === 'object' &&
      cur !== null &&
      'code' in cur &&
      (cur as { code: unknown }).code === '23505'
    ) {
      return true;
    }
    cur =
      typeof cur === 'object' && cur !== null && 'cause' in cur
        ? (cur as { cause: unknown }).cause
        : undefined;
  }
  return false;
}

export type TransitionJobPublishedInput = {
  jobId: string;
  companyId: string;
  title: string;
  /** From city `nameEn` or transliterated `nameSr`; null if no city. */
  cityLatin: string | null;
};

export type TransitionJobPublishedOptions = {
  now?: Date;
  correlationId?: string | null;
  /** Merged into `job_published` outbox payload. */
  outboxPayloadExtra?: Record<string, unknown>;
  /** When promoting a draft, set `submitted_at` if it was null. */
  setSubmittedAtIfDraft?: Date;
};

export type TransitionJobPublishedResult =
  | { ok: true; expiresAt: Date | null }
  | {
      ok: false;
      code:
        | 'JOB_SLUG_COLLISION'
        | 'JOB_INVALID_STATE'
        | 'JOB_SUBSCRIPTION_NOT_ACTIVE';
    };

/** States every publish path (approve, direct publish, admin) starts from. */
const PUBLISHABLE_STATUSES = ['draft', 'submitted'] as const;

class PublishRejected extends Error {
  constructor(
    readonly code: 'JOB_INVALID_STATE' | 'JOB_SUBSCRIPTION_NOT_ACTIVE',
  ) {
    super(code);
  }
}

/**
 * PRODUCT_SSOT §5.2 inv. 3: `expires_at = published_at + duration_days_snapshot`,
 * set on the first transition to live; re-publishing after an edit keeps it.
 */
export function computeJobExpiresAt(
  existing: Date | null,
  now: Date,
  durationDays: number | null,
): Date | null {
  if (existing) {
    return existing;
  }
  if (durationDays == null) {
    return null;
  }
  return new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
}

/**
 * Allocates slug/short_id, sets `published`, `published_at`, `expires_at`,
 * optional `submitted_at`, and outbox `job_published`. Row-locks the job and
 * re-checks state + subscription inside the transaction, so concurrent
 * approvals or an edit/archive racing the check cannot double-publish.
 */
export async function transitionJobToPublished(
  db: DrizzleDbOrTx,
  input: TransitionJobPublishedInput,
  options: TransitionJobPublishedOptions = {},
): Promise<TransitionJobPublishedResult> {
  const now = options.now ?? new Date();
  const extra = options.outboxPayloadExtra ?? {};
  let publishedOk = false;
  let expiresAt: Date | null = null;

  // Re-approval after an edit keeps the job's short id (stable URLs); a new
  // one is only drawn on first publish or after a slug collision.
  const [existing] = await db
    .select({ shortId: jobs.shortId })
    .from(jobs)
    .where(eq(jobs.id, input.jobId))
    .limit(1);
  const keptShortId = existing?.shortId ?? null;

  for (let attempt = 0; attempt < JOB_PUBLISH_SLUG_ATTEMPTS; attempt++) {
    const shortId = attempt === 0 && keptShortId ? keptShortId : makeShortId();
    const slug = buildPublishedJobFullSlug(
      input.title,
      input.cityLatin,
      shortId,
    );
    try {
      await db.transaction(async (tx) => {
        const [current] = await tx
          .select({
            status: jobs.status,
            expiresAt: jobs.expiresAt,
            subscriptionStatus: subscriptions.status,
            durationDays: subscriptions.durationDaysSnapshot,
          })
          .from(jobs)
          .leftJoin(subscriptions, eq(jobs.subscriptionId, subscriptions.id))
          .where(eq(jobs.id, input.jobId))
          .for('update', { of: jobs })
          .limit(1);
        if (
          !current ||
          !(PUBLISHABLE_STATUSES as readonly string[]).includes(current.status)
        ) {
          throw new PublishRejected('JOB_INVALID_STATE');
        }
        // Legacy jobs without a subscription keep publishing (no expiry).
        if (
          current.subscriptionStatus != null &&
          current.subscriptionStatus !== 'active'
        ) {
          throw new PublishRejected('JOB_SUBSCRIPTION_NOT_ACTIVE');
        }
        expiresAt = computeJobExpiresAt(
          current.expiresAt,
          now,
          current.durationDays,
        );

        const submittedPatch =
          options.setSubmittedAtIfDraft != null
            ? {
                submittedAt: sql`COALESCE(${jobs.submittedAt}, ${options.setSubmittedAtIfDraft})`,
              }
            : {};

        await tx
          .update(jobs)
          .set({
            status: 'published',
            publishedAt: now,
            updatedAt: now,
            slug,
            shortId,
            expiresAt,
            ...submittedPatch,
          })
          .where(
            and(
              eq(jobs.id, input.jobId),
              inArray(jobs.status, [...PUBLISHABLE_STATUSES]),
            ),
          );

        await tx.insert(outboxEvents).values({
          eventType: 'job_published',
          correlationId: options.correlationId ?? null,
          payload: {
            jobId: input.jobId,
            companyId: input.companyId,
            publishedAt: now.toISOString(),
            expiresAt: expiresAt ? expiresAt.toISOString() : null,
            ...extra,
          },
        });
      });
      publishedOk = true;
      break;
    } catch (e) {
      if (e instanceof PublishRejected) {
        return { ok: false, code: e.code };
      }
      if (pgUniqueViolation(e)) {
        continue;
      }
      throw e;
    }
  }

  if (!publishedOk) {
    return { ok: false, code: 'JOB_SLUG_COLLISION' };
  }
  return { ok: true, expiresAt };
}
