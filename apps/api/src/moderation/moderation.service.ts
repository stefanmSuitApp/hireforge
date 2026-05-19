import { Injectable } from '@nestjs/common';
import type {
  EmployerJobDraftBody,
  JobStatus,
  ModeratorCreateJobDraftBody,
  ModeratorJobComposerBootstrapResponse,
  ModeratorJobDetailResponse,
  ModeratorJobQueueItem,
  ModeratorMeResponse,
  EmployerJobDetailResponse,
} from 'contracts';
import { count, desc, eq } from 'drizzle-orm';
import {
  effectiveJobDescriptionHtml,
  transitionJobToPublished,
  transliterateToAsciiBasic,
} from 'server-jobs';
import {
  cities,
  companies,
  jobCategories,
  jobs,
  outboxEvents,
  users,
} from 'database';

import {
  codedBadRequest,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { getDb } from '../database';
import { getCorrelationId } from '../observability/correlation-storage';
import { assertPromoJobCategoryAllowed } from '../promo/assert-promo-job-category';
import { EmployerService } from '../employer/employer.service';
import { StaffAuditService } from '../staff/staff-audit.service';

@Injectable()
export class ModerationService {
  constructor(
    private readonly audit: StaffAuditService,
    private readonly employers: EmployerService,
  ) {}
  async getMe(userId: string): Promise<ModeratorMeResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const [row] = await database.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) {
      throw codedNotFound('NOT_FOUND', 'User not found');
    }
    return {
      user: {
        id: row.id,
        email: row.email,
        role: row.role as 'moderator' | 'admin',
      },
    };
  }

  async listQueue(input: {
    status: JobStatus;
    limit: number;
    offset: number;
  }): Promise<{ items: ModeratorJobQueueItem[]; total: number }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const where = eq(jobs.status, input.status);

    const [totalRow] = await database.db
      .select({ n: count() })
      .from(jobs)
      .where(where);

    const rows = await database.db
      .select({
        id: jobs.id,
        title: jobs.title,
        status: jobs.status,
        companyId: companies.id,
        companySlug: companies.slug,
        companyLegalName: companies.legalName,
        submittedAt: jobs.submittedAt,
        publishedAt: jobs.publishedAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(where)
      .orderBy(desc(jobs.submittedAt), desc(jobs.updatedAt))
      .limit(input.limit)
      .offset(input.offset);

    const items: ModeratorJobQueueItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      companyId: r.companyId,
      companySlug: r.companySlug,
      companyLegalName: r.companyLegalName,
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
      updatedAt: r.updatedAt.toISOString(),
    }));

    return { items, total: Number(totalRow?.n ?? 0) };
  }

  async getJob(jobId: string): Promise<ModeratorJobDetailResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [row] = await database.db
      .select({
        id: jobs.id,
        title: jobs.title,
        description: jobs.description,
        descriptionHtml: jobs.descriptionHtml,
        descriptionDoc: jobs.descriptionDoc,
        status: jobs.status,
        slug: jobs.slug,
        shortId: jobs.shortId,
        workModel: jobs.workModel,
        employmentType: jobs.employmentType,
        seniority: jobs.seniority,
        applyMode: jobs.applyMode,
        externalApplyUrl: jobs.externalApplyUrl,
        primaryLanguage: jobs.primaryLanguage,
        featured: jobs.featured,
        crossborderVisible: jobs.crossborderVisible,
        pngCreativeUrl: jobs.pngCreativeUrl,
        submittedAt: jobs.submittedAt,
        publishedAt: jobs.publishedAt,
        rejectedReason: jobs.rejectedReason,
        archivedAt: jobs.archivedAt,
        updatedAt: jobs.updatedAt,
        citySlug: cities.slug,
        cityNameSr: cities.nameSr,
        cityNameEn: cities.nameEn,
        cityPostalCode: cities.postalCode,
        categorySlug: jobCategories.slug,
        catNameSr: jobCategories.nameSr,
        catNameEn: jobCategories.nameEn,
        companyId: companies.id,
        companySlug: companies.slug,
        companyLegalName: companies.legalName,
      })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .leftJoin(cities, eq(jobs.cityId, cities.id))
      .leftJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!row) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      descriptionHtml: effectiveJobDescriptionHtml(
        row.descriptionHtml,
        row.descriptionDoc,
      ),
      status: row.status,
      slug: row.slug ?? null,
      shortId: row.shortId ?? null,
      workModel: row.workModel,
      employmentType: row.employmentType,
      seniority: row.seniority,
      applyMode: row.applyMode === 'external' ? 'external' : 'internal',
      externalApplyUrl: row.externalApplyUrl ?? null,
      primaryLanguage: row.primaryLanguage === 'en' ? 'en' : 'sr',
      featured: row.featured === true,
      crossborderVisible: row.crossborderVisible === true,
      pngCreativeUrl: row.pngCreativeUrl ?? null,
      city:
        row.citySlug != null
          ? {
              slug: row.citySlug,
              nameSr: row.cityNameSr,
              nameEn: row.cityNameEn,
              postalCode: row.cityPostalCode ?? null,
            }
          : null,
      category:
        row.categorySlug != null
          ? {
              slug: row.categorySlug,
              nameSr: row.catNameSr,
              nameEn: row.catNameEn,
            }
          : null,
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      rejectedReason: row.rejectedReason ?? null,
      archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
      updatedAt: row.updatedAt.toISOString(),
      company: {
        id: row.companyId,
        slug: row.companySlug,
        legalName: row.companyLegalName,
      },
    };
  }

  async getCompanyJobComposerBootstrap(
    companyId: string,
  ): Promise<ModeratorJobComposerBootstrapResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [co] = await database.db
      .select({
        id: companies.id,
        slug: companies.slug,
        legalName: companies.legalName,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!co) {
      throw codedNotFound('COMPANY_NOT_FOUND', 'Company not found');
    }

    const jobPostingSlots =
      await this.employers.getJobPostingSlotsForCompany(companyId);

    return {
      company: {
        id: co.id,
        slug: co.slug,
        legalName: co.legalName,
      },
      jobPostingSlots,
    };
  }

  async createJobDraftOnBehalf(
    actorUserId: string,
    body: ModeratorCreateJobDraftBody,
  ): Promise<{ id: string }> {
    const { companyId, ...draft } = body;
    const { id } = await this.employers.createDraftJobForCompanyAsStaff(
      companyId,
      actorUserId,
      draft,
    );

    await this.audit.log({
      actorUserId,
      action: 'job.create_on_behalf',
      entityType: 'job',
      entityId: id,
      metadata: { companyId },
    });

    return { id };
  }

  async getJobForAuthoring(jobId: string): Promise<EmployerJobDetailResponse> {
    const job = await this.employers.getEmployerJobForStaff(jobId);
    if (
      job.status !== 'draft' &&
      job.status !== 'submitted' &&
      job.status !== 'published'
    ) {
      throw codedBadRequest(
        'JOB_INVALID_STATE',
        'Staff can only open the composer for draft, submitted, or published listings.',
      );
    }
    return job;
  }

  async patchJobBody(
    actorUserId: string,
    jobId: string,
    body: EmployerJobDraftBody,
  ): Promise<
    { ok: true; status: 'submitted'; submittedAt: string } | { ok: true }
  > {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [row] = await database.db
      .select({ status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!row) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }

    if (row.status === 'published') {
      return this.patchPublishedJobDemoting(actorUserId, jobId, body);
    }

    if (row.status === 'draft' || row.status === 'submitted') {
      await this.employers.staffUpdateDraftOrSubmittedJobBody(jobId, body);
      await this.audit.log({
        actorUserId,
        action: 'job.staff_edit_body',
        entityType: 'job',
        entityId: jobId,
        metadata: { previousStatus: row.status },
      });
      return { ok: true };
    }

    throw codedBadRequest(
      'JOB_INVALID_STATE',
      'This listing cannot be edited in its current status.',
    );
  }

  async publishJob(jobId: string): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const now = new Date();
    const [row] = await database.db
      .select({
        id: jobs.id,
        status: jobs.status,
        companyId: jobs.companyId,
        title: jobs.title,
        subscriptionId: jobs.subscriptionId,
        categoryId: jobs.categoryId,
        cityNameSr: cities.nameSr,
        cityNameEn: cities.nameEn,
      })
      .from(jobs)
      .leftJoin(cities, eq(jobs.cityId, cities.id))
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!row) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }
    if (row.status !== 'submitted') {
      throw codedBadRequest(
        'JOB_INVALID_STATE',
        'Only submitted jobs can be published',
      );
    }

    await assertPromoJobCategoryAllowed(database.db, {
      subscriptionId: row.subscriptionId,
      categoryId: row.categoryId,
    });

    const cityLatin =
      row.cityNameSr == null && row.cityNameEn == null
        ? null
        : row.cityNameEn?.trim()
          ? row.cityNameEn.trim()
          : transliterateToAsciiBasic(row.cityNameSr ?? '');

    const result = await transitionJobToPublished(
      database.db,
      {
        jobId,
        companyId: row.companyId,
        title: row.title,
        cityLatin,
      },
      {
        now,
        correlationId: getCorrelationId() ?? null,
      },
    );
    if (!result.ok) {
      throw codedBadRequest(
        'JOB_SLUG_COLLISION',
        'Could not allocate a unique job slug; retry publish',
      );
    }

    return { ok: true };
  }

  /** Draft or submitted → published with audit (`bypassed_review`). */
  async publishJobDirectly(
    actorUserId: string,
    jobId: string,
  ): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const now = new Date();
    const [row] = await database.db
      .select({
        id: jobs.id,
        status: jobs.status,
        companyId: jobs.companyId,
        title: jobs.title,
        subscriptionId: jobs.subscriptionId,
        categoryId: jobs.categoryId,
        cityNameSr: cities.nameSr,
        cityNameEn: cities.nameEn,
      })
      .from(jobs)
      .leftJoin(cities, eq(jobs.cityId, cities.id))
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!row) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }
    if (row.status !== 'draft' && row.status !== 'submitted') {
      throw codedBadRequest(
        'JOB_INVALID_STATE',
        'Only draft or submitted jobs can be published directly',
      );
    }

    await assertPromoJobCategoryAllowed(database.db, {
      subscriptionId: row.subscriptionId,
      categoryId: row.categoryId,
    });

    const prev = row.status;
    const cityLatin =
      row.cityNameSr == null && row.cityNameEn == null
        ? null
        : row.cityNameEn?.trim()
          ? row.cityNameEn.trim()
          : transliterateToAsciiBasic(row.cityNameSr ?? '');

    const result = await transitionJobToPublished(
      database.db,
      {
        jobId,
        companyId: row.companyId,
        title: row.title,
        cityLatin,
      },
      {
        now,
        correlationId: getCorrelationId() ?? null,
        outboxPayloadExtra: { bypassedReview: true },
        ...(prev === 'draft' ? { setSubmittedAtIfDraft: now } : {}),
      },
    );
    if (!result.ok) {
      throw codedBadRequest(
        'JOB_SLUG_COLLISION',
        'Could not allocate a unique job slug; retry publish',
      );
    }

    await this.audit.log({
      actorUserId,
      action: 'job.publish_direct',
      entityType: 'job',
      entityId: jobId,
      metadata: {
        bypassedReview: true,
        previousStatus: prev,
      },
    });

    return { ok: true };
  }

  /** Published listing body edit → `submitted` (SSOT §7.2); audit logged. */
  async patchPublishedJobDemoting(
    actorUserId: string,
    jobId: string,
    body: EmployerJobDraftBody,
  ): Promise<{ ok: true; status: 'submitted'; submittedAt: string }> {
    const { submittedAt } =
      await this.employers.staffDemotePublishedJobWithDraftBody(
        jobId,
        body,
        actorUserId,
      );

    await this.audit.log({
      actorUserId,
      action: 'job.edit_live_demote',
      entityType: 'job',
      entityId: jobId,
      metadata: { previousStatus: 'published' },
    });

    return { ok: true, status: 'submitted', submittedAt };
  }

  async rejectJob(jobId: string, reason: string): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const now = new Date();
    const [row] = await database.db
      .select({ id: jobs.id, status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!row) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }
    if (row.status !== 'submitted') {
      throw codedBadRequest(
        'JOB_INVALID_STATE',
        'Only submitted jobs can be rejected',
      );
    }

    await database.db.transaction(async (tx) => {
      await tx
        .update(jobs)
        .set({
          status: 'rejected',
          rejectedReason: reason,
          updatedAt: now,
        })
        .where(eq(jobs.id, jobId));

      await tx.insert(outboxEvents).values({
        eventType: 'job_rejected',
        correlationId: getCorrelationId() ?? null,
        payload: { jobId, reason, rejectedAt: now.toISOString() },
      });
    });

    return { ok: true };
  }

  async unpublishJob(jobId: string): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const now = new Date();
    const [row] = await database.db
      .select({ id: jobs.id, status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!row) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }
    if (row.status !== 'published') {
      throw codedBadRequest(
        'JOB_INVALID_STATE',
        'Only published jobs can be unpublished',
      );
    }

    await database.db.transaction(async (tx) => {
      await tx
        .update(jobs)
        .set({
          status: 'archived',
          archivedAt: now,
          updatedAt: now,
        })
        .where(eq(jobs.id, jobId));

      await tx.insert(outboxEvents).values({
        eventType: 'job_unpublished',
        correlationId: getCorrelationId() ?? null,
        payload: { jobId, archivedAt: now.toISOString() },
      });
    });

    return { ok: true };
  }
}
