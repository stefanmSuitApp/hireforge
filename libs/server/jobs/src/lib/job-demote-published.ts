import type { EmployerJobDraftBody } from 'contracts';
import { eq } from 'drizzle-orm';
import type { DrizzleDbOrTx } from 'database';
import { jobs, outboxEvents } from 'database';

import { jobDescriptionHtmlFromDraftBody } from './job-description-html';

export type DemotePublishedJobDraftEditInput = {
  jobId: string;
  companyId: string;
  submittedByUserId: string;
  correlationId: string | null;
  cityId: string | null;
  categoryId: string | null;
  apply: {
    applyMode: 'internal' | 'external';
    externalApplyUrl: string | null;
    primaryLanguage: 'sr' | 'en';
  };
  draft: EmployerJobDraftBody;
  now: Date;
};

/**
 * Applies a full draft-style body update to a **published** row and moves it
 * back to **`submitted`** for re-review (SSOT §7.2). Clears public slug
 * fields and `published_at`; keeps `expires_at` untouched.
 */
export async function demotePublishedJobAfterDraftBodyEdit(
  db: DrizzleDbOrTx,
  input: DemotePublishedJobDraftEditInput,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(jobs)
      .set({
        title: input.draft.title,
        description: input.draft.description,
        descriptionDoc: input.draft.descriptionDoc ?? null,
        descriptionHtml: jobDescriptionHtmlFromDraftBody({
          description: input.draft.description,
          descriptionDoc: input.draft.descriptionDoc,
        }),
        cityId: input.cityId,
        categoryId: input.categoryId,
        workModel: input.draft.workModel,
        employmentType: input.draft.employmentType,
        seniority: input.draft.seniority,
        featured: input.draft.featured ?? false,
        crossborderVisible: input.draft.crossborderVisible ?? false,
        pngCreativeUrl: input.draft.pngCreativeUrl ?? null,
        primaryLanguage: input.apply.primaryLanguage,
        status: 'submitted',
        submittedAt: input.now,
        publishedAt: null,
        slug: null,
        shortId: null,
        rejectedReason: null,
        updatedAt: input.now,
      })
      .where(eq(jobs.id, input.jobId));

    await tx.insert(outboxEvents).values({
      eventType: 'job_submitted',
      correlationId: input.correlationId,
      payload: {
        jobId: input.jobId,
        companyId: input.companyId,
        submittedByUserId: input.submittedByUserId,
        submittedAt: input.now.toISOString(),
        previousStatus: 'published',
        demotedFromPublished: true,
      },
    });
  });
}
