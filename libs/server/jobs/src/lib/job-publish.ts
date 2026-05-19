import { eq, sql } from 'drizzle-orm';
import type { DrizzleDbOrTx } from 'database';
import { jobs, outboxEvents } from 'database';

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
  | { ok: true }
  | { ok: false; code: 'JOB_SLUG_COLLISION' };

/**
 * Allocates slug/short_id, sets `published`, `published_at`, optional `submitted_at`, and outbox `job_published`.
 */
export async function transitionJobToPublished(
  db: DrizzleDbOrTx,
  input: TransitionJobPublishedInput,
  options: TransitionJobPublishedOptions = {},
): Promise<TransitionJobPublishedResult> {
  const now = options.now ?? new Date();
  const extra = options.outboxPayloadExtra ?? {};
  let publishedOk = false;

  for (let attempt = 0; attempt < JOB_PUBLISH_SLUG_ATTEMPTS; attempt++) {
    const shortId = makeShortId();
    const slug = buildPublishedJobFullSlug(
      input.title,
      input.cityLatin,
      shortId,
    );
    try {
      await db.transaction(async (tx) => {
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
            ...submittedPatch,
          })
          .where(eq(jobs.id, input.jobId));

        await tx.insert(outboxEvents).values({
          eventType: 'job_published',
          correlationId: options.correlationId ?? null,
          payload: {
            jobId: input.jobId,
            companyId: input.companyId,
            publishedAt: now.toISOString(),
            ...extra,
          },
        });
      });
      publishedOk = true;
      break;
    } catch (e) {
      if (pgUniqueViolation(e)) {
        continue;
      }
      throw e;
    }
  }

  if (!publishedOk) {
    return { ok: false, code: 'JOB_SLUG_COLLISION' };
  }
  return { ok: true };
}
