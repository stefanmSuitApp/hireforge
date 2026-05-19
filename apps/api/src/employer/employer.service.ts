import { Injectable } from '@nestjs/common';
import type {
  EmployerJobApplicationItem,
  EmployerJobDetailResponse,
  EmployerJobDraftBody,
  EmployerJobListItem,
  EmployerPackageCatalogResponse,
  EmployerProformaDetail,
  EmployerSubscriptionsListResponse,
  EmployerJobPostingSlot,
  EmployerWorkspaceResponse,
  EntitlementsBlob,
  JobPostingEligibility,
  PackageCode,
} from 'contracts';
import {
  DEFAULT_JOB_DESCRIPTION_LINK_MIN_LEAD_CHARS,
  effectiveMaxActiveJobs,
  employerPackageUpgradeMessageSchema,
  entitlementsBlobSchema,
  packageCodeSchema,
} from 'contracts';
import { and, count, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  applications,
  candidates,
  cities,
  companies,
  employers,
  jobCategories,
  jobs,
  outboxEvents,
  packageEntitlements,
  packagePrices,
  packages,
  proformas,
  resumeAssets,
  subscriptions,
  users,
} from 'database';
import {
  demotePublishedJobAfterDraftBodyEdit,
  effectiveJobDescriptionHtml,
  jobDescriptionHtmlFromDraftBody,
  validateExternalApplyUrl,
  validateJobDraftAgainstEntitlements,
} from 'server-jobs';
import {
  codedBadRequest,
  codedForbidden,
  codedInternalError,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { BillingContentService } from '../billing/billing-content.service';
import { BillingPdfService } from '../billing/billing-pdf.service';
import { getDb } from '../database';
import { getCorrelationId } from '../observability/correlation-storage';
import { assertPromoJobCategoryAllowed } from '../promo/assert-promo-job-category';
import { EditorLinkPolicyService } from './editor-link-policy.service';
import { JobDescriptionMediaService } from '../job-media/job-description-media.service';

export type EmployerWorkspaceDto = EmployerWorkspaceResponse;

/** Match {@link SubscriptionsService} mark-paid window calculation. */
function addDurationDaysUtc(start: Date, durationDays: number): Date {
  return new Date(start.getTime() + durationDays * 86_400_000);
}

type CompanyContext = { companyId: string; userId: string };

/** `0` = disable plain-text lead-in guard before the first hyperlink. */
function employerDescriptionLinkMinLead(): number {
  const raw = process.env.EDITOR_LINK_MIN_PLAIN_CHARS_BEFORE_FIRST?.trim();
  if (raw === '0') {
    return 0;
  }
  if (raw === undefined || raw === '') {
    return DEFAULT_JOB_DESCRIPTION_LINK_MIN_LEAD_CHARS;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0
    ? n
    : DEFAULT_JOB_DESCRIPTION_LINK_MIN_LEAD_CHARS;
}

function violationToBadRequest(
  v: import('server-jobs').JobEntitlementsViolation,
): ReturnType<typeof codedBadRequest> {
  switch (v.code) {
    case 'JOB_ENTITLEMENTS_DESCRIPTION_LENGTH':
      return codedBadRequest(
        'JOB_ENTITLEMENTS_DESCRIPTION_LENGTH',
        `Description must be at most ${v.max} characters (current ${v.actual})`,
      );
    case 'JOB_ENTITLEMENTS_CITY_REQUIRED':
      return codedBadRequest(
        'JOB_ENTITLEMENTS_CITY_REQUIRED',
        'Choose a city for this listing (required by your package).',
      );
    case 'JOB_ENTITLEMENTS_HYPERLINK_FORBIDDEN':
      return codedBadRequest(
        'JOB_ENTITLEMENTS_HYPERLINK_FORBIDDEN',
        'Links in the description are not included in your package.',
      );
    case 'JOB_ENTITLEMENTS_HYPERLINK_COUNT':
      return codedBadRequest(
        'JOB_ENTITLEMENTS_HYPERLINK_COUNT',
        `Your package allows at most ${v.max} links (found ${v.actual}).`,
      );
    case 'JOB_ENTITLEMENTS_HYPERLINK_HTTPS':
      return codedBadRequest(
        'JOB_ENTITLEMENTS_HYPERLINK_HTTPS',
        `Only https:// links are allowed (invalid: ${v.href}).`,
      );
    case 'JOB_ENTITLEMENTS_HYPERLINK_TOO_EARLY':
      return codedBadRequest(
        'JOB_ENTITLEMENTS_HYPERLINK_TOO_EARLY',
        `Put at least ${v.minLeadChars} characters before the first link (first link starts near character ${v.atPlainOffset + 1}).`,
      );
    case 'JOB_ENTITLEMENTS_HYPERLINK_HOST_BLOCKED':
      return codedBadRequest(
        'JOB_ENTITLEMENTS_HYPERLINK_HOST_BLOCKED',
        `That link host is blocked (${v.hostname}).`,
      );
    case 'JOB_ENTITLEMENTS_EDITOR':
      return codedBadRequest(
        'EDITOR_CAPABILITY_DENIED',
        `Formatting not allowed for your package (${v.detail}).`,
      );
    case 'JOB_ENTITLEMENTS_FEATURED_FORBIDDEN':
      return codedBadRequest(
        'JOB_ENTITLEMENTS_FEATURED_FORBIDDEN',
        'Featured listings are not included in your package.',
      );
    case 'JOB_ENTITLEMENTS_CROSSBORDER_FORBIDDEN':
      return codedBadRequest(
        'JOB_ENTITLEMENTS_CROSSBORDER_FORBIDDEN',
        'Cross-border visibility is not included in your package.',
      );
    case 'JOB_ENTITLEMENTS_PNG_CREATIVE_FORBIDDEN':
      return codedBadRequest(
        'JOB_ENTITLEMENTS_PNG_CREATIVE_FORBIDDEN',
        'A PNG creative URL is not included in your package.',
      );
    default: {
      const _exhaustive: never = v;
      return codedBadRequest(
        'VALIDATION_FAILED',
        `Unknown validation error: ${String(_exhaustive)}`,
      );
    }
  }
}

/** Jobs that consume `max_active_jobs` toward a subscription (DB enums; SSOT “pending/live”). */
const JOB_STATUSES_FOR_SUBSCRIPTION_CAP = ['submitted', 'published'] as const;

@Injectable()
export class EmployerService {
  constructor(
    private readonly billingContent: BillingContentService,
    private readonly billingPdf: BillingPdfService,
    private readonly editorLinkPolicy: EditorLinkPolicyService,
    private readonly jobDescriptionMedia: JobDescriptionMediaService,
  ) {}

  /**
   * Heal rare partial writes: invoice issued + proforma paid but row still
   * `pending_payment`. Without this, employers see “choose a package” forever.
   */
  private async repairInvoicePaidButPendingSubscriptionStatus(
    companyId: string,
  ): Promise<void> {
    const database = getDb();
    if (!database) {
      return;
    }

    const stuckRows = await database.db
      .select({
        id: subscriptions.id,
        durationDaysSnapshot: subscriptions.durationDaysSnapshot,
        startsAt: subscriptions.startsAt,
        endsAt: subscriptions.endsAt,
        paidAt: proformas.paidAt,
      })
      .from(subscriptions)
      .innerJoin(proformas, eq(subscriptions.proformaId, proformas.id))
      .where(
        and(
          eq(subscriptions.companyId, companyId),
          eq(subscriptions.status, 'pending_payment'),
          isNotNull(subscriptions.invoiceId),
          isNotNull(proformas.paidAt),
        ),
      );

    const now = new Date();
    for (const row of stuckRows) {
      const startsAt = row.startsAt ?? row.paidAt ?? now;
      const endsAt =
        row.endsAt ?? addDurationDaysUtc(startsAt, row.durationDaysSnapshot);
      await database.db
        .update(subscriptions)
        .set({
          status: 'active',
          startsAt,
          endsAt,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, row.id));
    }
  }

  private async assertDraftMatchesEntitlements(
    entitlements: EntitlementsBlob,
    input: Pick<
      EmployerJobDraftBody,
      | 'description'
      | 'descriptionDoc'
      | 'citySlug'
      | 'featured'
      | 'crossborderVisible'
      | 'pngCreativeUrl'
    >,
  ): Promise<void> {
    const linkHostBlocklist =
      await this.editorLinkPolicy.mergedJobDescriptionHostBlocklist();
    const r = validateJobDraftAgainstEntitlements(
      entitlements,
      {
        description: input.description,
        descriptionDoc: input.descriptionDoc ?? null,
        citySlug: input.citySlug,
        featured: input.featured,
        crossborderVisible: input.crossborderVisible,
        pngCreativeUrl: input.pngCreativeUrl,
      },
      {
        linkHostBlocklist,
        linkMinLeadPlainChars: employerDescriptionLinkMinLead(),
      },
    );
    if (r.ok === false) {
      throw violationToBadRequest(r.violation);
    }
  }

  private async loadSubscriptionEntitlementsBundle(
    subscriptionId: string,
  ): Promise<{
    blob: EntitlementsBlob;
    packageCode: PackageCode;
    override: number | null;
  }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const [row] = await database.db
      .select({
        packageCode: subscriptions.packageCode,
        entitlementsJsonSnapshot: subscriptions.entitlementsJsonSnapshot,
        maxActiveJobsOverride: subscriptions.maxActiveJobsOverride,
      })
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);
    if (!row) {
      throw codedNotFound('SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    }
    const parsed = entitlementsBlobSchema.safeParse(
      row.entitlementsJsonSnapshot,
    );
    if (!parsed.success) {
      throw codedInternalError(
        'PACKAGE_ENTITLEMENTS_INCOMPLETE',
        'Subscription has invalid entitlements',
      );
    }
    return {
      blob: parsed.data,
      packageCode: packageCodeSchema.parse(row.packageCode),
      override: row.maxActiveJobsOverride ?? null,
    };
  }

  private async resolveJobPostingEligibility(
    companyId: string,
  ): Promise<JobPostingEligibility> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    await this.repairInvoicePaidButPendingSubscriptionStatus(companyId);

    const [activeSub] = await database.db
      .select({
        id: subscriptions.id,
        packageCode: subscriptions.packageCode,
        entitlementsJsonSnapshot: subscriptions.entitlementsJsonSnapshot,
        maxActiveJobsOverride: subscriptions.maxActiveJobsOverride,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.companyId, companyId),
          eq(subscriptions.status, 'active'),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (activeSub) {
      const parsed = entitlementsBlobSchema.safeParse(
        activeSub.entitlementsJsonSnapshot,
      );
      if (!parsed.success) {
        throw codedInternalError(
          'PACKAGE_ENTITLEMENTS_INCOMPLETE',
          'Active subscription has an invalid entitlements snapshot',
        );
      }
      const packageCode = packageCodeSchema.parse(activeSub.packageCode);
      const maxActiveJobs = effectiveMaxActiveJobs(
        packageCode,
        parsed.data,
        activeSub.maxActiveJobsOverride ?? null,
      );
      const [cntRow] = await database.db
        .select({ n: count() })
        .from(jobs)
        .where(
          and(
            eq(jobs.companyId, companyId),
            eq(jobs.subscriptionId, activeSub.id),
            inArray(jobs.status, [...JOB_STATUSES_FOR_SUBSCRIPTION_CAP]),
          ),
        );
      const activePipelineCount = Number(cntRow?.n ?? 0);
      const publishSlotsFull = activePipelineCount >= maxActiveJobs;
      return {
        kind: 'eligible',
        subscriptionId: activeSub.id,
        packageCode,
        maxActiveJobs,
        activePipelineCount,
        publishSlotsFull,
        entitlements: parsed.data,
      };
    }

    const [pendingSub] = await database.db
      .select({
        id: subscriptions.id,
        proformaId: subscriptions.proformaId,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.companyId, companyId),
          eq(subscriptions.status, 'pending_payment'),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (pendingSub) {
      return {
        kind: 'pending_payment',
        subscriptionId: pendingSub.id,
        proformaId: pendingSub.proformaId ?? null,
      };
    }

    return { kind: 'no_subscription' };
  }

  private async listActiveJobPostingSlots(
    companyId: string,
  ): Promise<EmployerJobPostingSlot[]> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    await this.repairInvoicePaidButPendingSubscriptionStatus(companyId);

    const rows = await database.db
      .select({
        id: subscriptions.id,
        packageCode: subscriptions.packageCode,
        packageNameSnapshot: subscriptions.packageNameSnapshot,
        entitlementsJsonSnapshot: subscriptions.entitlementsJsonSnapshot,
        maxActiveJobsOverride: subscriptions.maxActiveJobsOverride,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.companyId, companyId),
          eq(subscriptions.status, 'active'),
        ),
      )
      .orderBy(desc(subscriptions.createdAt));

    const out: EmployerJobPostingSlot[] = [];
    for (const row of rows) {
      const parsed = entitlementsBlobSchema.safeParse(
        row.entitlementsJsonSnapshot,
      );
      if (!parsed.success) {
        throw codedInternalError(
          'PACKAGE_ENTITLEMENTS_INCOMPLETE',
          'Active subscription has an invalid entitlements snapshot',
        );
      }
      const packageCode = packageCodeSchema.parse(row.packageCode);
      const maxActiveJobs = effectiveMaxActiveJobs(
        packageCode,
        parsed.data,
        row.maxActiveJobsOverride ?? null,
      );
      const [cntRow] = await database.db
        .select({ n: count() })
        .from(jobs)
        .where(
          and(
            eq(jobs.companyId, companyId),
            eq(jobs.subscriptionId, row.id),
            inArray(jobs.status, [...JOB_STATUSES_FOR_SUBSCRIPTION_CAP]),
          ),
        );
      const activePipelineCount = Number(cntRow?.n ?? 0);
      const publishSlotsFull = activePipelineCount >= maxActiveJobs;
      out.push({
        subscriptionId: row.id,
        packageCode,
        packageNameSnapshot: row.packageNameSnapshot,
        maxActiveJobs,
        activePipelineCount,
        publishSlotsFull,
        entitlements: parsed.data,
      });
    }
    return out;
  }

  /** Staff/moderator: active subscription slots for a company’s job composer. */
  async getJobPostingSlotsForCompany(
    companyId: string,
  ): Promise<EmployerJobPostingSlot[]> {
    return this.listActiveJobPostingSlots(companyId);
  }

  private async resolveChosenSubscriptionIdForNewDraft(
    companyId: string,
    subscriptionId: string | undefined,
  ): Promise<string> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const rows = await database.db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.companyId, companyId),
          eq(subscriptions.status, 'active'),
        ),
      )
      .orderBy(desc(subscriptions.createdAt));

    if (rows.length === 0) {
      throw codedForbidden(
        'JOB_POSTING_NO_SUBSCRIPTION',
        'Choose and activate a package before creating a job listing.',
      );
    }

    if (subscriptionId) {
      const hit = rows.find((r) => r.id === subscriptionId);
      if (!hit) {
        throw codedBadRequest(
          'SUBSCRIPTION_NOT_ACTIVE',
          'That subscription is not active for your company.',
        );
      }
      return hit.id;
    }

    if (rows.length > 1) {
      throw codedBadRequest(
        'JOB_POSTING_SUBSCRIPTION_REQUIRED',
        'Choose which active package this listing belongs to (subscriptionId).',
      );
    }

    return rows[0].id;
  }

  async getWorkspace(userId: string): Promise<EmployerWorkspaceDto> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const modUser = alias(users, 'employer_mod');
    const rows = await database.db
      .select({
        userId: users.id,
        email: users.email,
        role: users.role,
        emailVerifiedAt: users.emailVerifiedAt,
        companyId: companies.id,
        slug: companies.slug,
        legalName: companies.legalName,
        modId: modUser.id,
        modEmail: modUser.email,
        modName: modUser.publicDisplayName,
        modPhone: modUser.publicPhone,
      })
      .from(employers)
      .innerJoin(users, eq(employers.userId, users.id))
      .innerJoin(companies, eq(employers.companyId, companies.id))
      .leftJoin(modUser, eq(companies.assignedModeratorId, modUser.id))
      .where(eq(employers.userId, userId))
      .limit(1);
    const row = rows[0];
    if (!row || row.role !== 'employer') {
      throw codedForbidden(
        'EMPLOYER_NOT_SETUP',
        'Employer profile is not set up for this user',
      );
    }
    return {
      user: {
        id: row.userId,
        email: row.email,
        role: 'employer',
        emailVerified: row.emailVerifiedAt != null,
      },
      company: {
        id: row.companyId,
        slug: row.slug,
        legalName: row.legalName,
      },
      assignedModerator:
        row.modId && row.modEmail
          ? {
              id: row.modId,
              email: row.modEmail,
              displayName: row.modName ?? null,
              phone: row.modPhone ?? null,
            }
          : null,
      jobPosting: await this.resolveJobPostingEligibility(row.companyId),
      jobPostingSlots: await this.listActiveJobPostingSlots(row.companyId),
    };
  }

  private async requireCompanyContext(userId: string): Promise<CompanyContext> {
    const ws = await this.getWorkspace(userId);
    return { companyId: ws.company.id, userId };
  }

  private async resolveCityId(
    slug: string | undefined,
  ): Promise<string | null> {
    if (!slug) return null;
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const [row] = await database.db
      .select({ id: cities.id })
      .from(cities)
      .where(and(eq(cities.slug, slug), eq(cities.countryCode, 'RS')))
      .limit(1);
    if (!row) {
      throw codedBadRequest('CITY_SLUG_UNKNOWN', `Unknown city slug: ${slug}`);
    }
    return row.id;
  }

  private async resolveCategoryId(
    slug: string | undefined,
  ): Promise<string | null> {
    if (!slug) return null;
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const [row] = await database.db
      .select({ id: jobCategories.id })
      .from(jobCategories)
      .where(eq(jobCategories.slug, slug))
      .limit(1);
    if (!row) {
      throw codedBadRequest(
        'CATEGORY_SLUG_UNKNOWN',
        `Unknown category slug: ${slug}`,
      );
    }
    return row.id;
  }

  private assertApplyUnchangedForPublished(
    row: { applyMode: string; externalApplyUrl: string | null },
    apply: {
      applyMode: 'internal' | 'external';
      externalApplyUrl: string | null;
    },
  ): void {
    if (row.applyMode !== apply.applyMode) {
      throw codedBadRequest(
        'JOB_APPLY_MODE_IMMUTABLE',
        'Apply mode cannot be changed after a job is published',
      );
    }
    const prev = row.externalApplyUrl ?? null;
    const next = apply.externalApplyUrl ?? null;
    if (prev !== next) {
      throw codedBadRequest(
        'JOB_APPLY_MODE_IMMUTABLE',
        'External apply URL cannot be changed after a job is published',
      );
    }
  }

  private resolveApplyDraftFields(input: EmployerJobDraftBody): {
    applyMode: 'internal' | 'external';
    externalApplyUrl: string | null;
    primaryLanguage: 'sr' | 'en';
  } {
    const primaryLanguage = input.primaryLanguage === 'en' ? 'en' : 'sr';
    if (input.applyMode === 'external') {
      const v = validateExternalApplyUrl(input.externalApplyUrl ?? '');
      if (v.ok === false) {
        throw codedBadRequest('EXTERNAL_APPLY_URL_FORBIDDEN', v.message);
      }
      return {
        applyMode: 'external',
        externalApplyUrl: v.href,
        primaryLanguage,
      };
    }
    return {
      applyMode: 'internal',
      externalApplyUrl: null,
      primaryLanguage,
    };
  }

  async createDraftJob(
    userId: string,
    input: EmployerJobDraftBody,
  ): Promise<{ id: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const ctx = await this.requireCompanyContext(userId);
    const chosenSubId = await this.resolveChosenSubscriptionIdForNewDraft(
      ctx.companyId,
      input.subscriptionId,
    );
    const bundle = await this.loadSubscriptionEntitlementsBundle(chosenSubId);
    const featured = input.featured ?? false;
    const crossborderVisible = input.crossborderVisible ?? false;
    const pngCreativeUrl = input.pngCreativeUrl ?? null;
    await this.assertDraftMatchesEntitlements(bundle.blob, {
      ...input,
      featured,
      crossborderVisible,
      pngCreativeUrl,
    });

    const cityId = await this.resolveCityId(input.citySlug);
    const categoryId = await this.resolveCategoryId(input.categorySlug);
    const apply = this.resolveApplyDraftFields(input);

    const [created] = await database.db
      .insert(jobs)
      .values({
        companyId: ctx.companyId,
        createdByUserId: ctx.userId,
        title: input.title,
        description: input.description,
        descriptionDoc: input.descriptionDoc ?? null,
        descriptionHtml: jobDescriptionHtmlFromDraftBody({
          description: input.description,
          descriptionDoc: input.descriptionDoc,
        }),
        status: 'draft',
        cityId,
        categoryId,
        workModel: input.workModel,
        employmentType: input.employmentType,
        seniority: input.seniority,
        applyMode: apply.applyMode,
        externalApplyUrl: apply.externalApplyUrl,
        primaryLanguage: apply.primaryLanguage,
        subscriptionId: chosenSubId,
        featured,
        crossborderVisible,
        pngCreativeUrl,
      })
      .returning({ id: jobs.id });

    if (!created) {
      throw codedInternalError('JOB_CREATE_FAILED', 'Could not create job');
    }
    return { id: created.id };
  }

  /**
   * Moderator/admin: create a draft for an arbitrary company (same validation
   * as employer `createDraftJob`).
   */
  async createDraftJobForCompanyAsStaff(
    companyId: string,
    actorUserId: string,
    input: EmployerJobDraftBody,
  ): Promise<{ id: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [co] = await database.db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!co) {
      throw codedNotFound('COMPANY_NOT_FOUND', 'Company not found');
    }

    const chosenSubId = await this.resolveChosenSubscriptionIdForNewDraft(
      companyId,
      input.subscriptionId,
    );
    const bundle = await this.loadSubscriptionEntitlementsBundle(chosenSubId);
    const featured = input.featured ?? false;
    const crossborderVisible = input.crossborderVisible ?? false;
    const pngCreativeUrl = input.pngCreativeUrl ?? null;
    await this.assertDraftMatchesEntitlements(bundle.blob, {
      ...input,
      featured,
      crossborderVisible,
      pngCreativeUrl,
    });

    const cityId = await this.resolveCityId(input.citySlug);
    const categoryId = await this.resolveCategoryId(input.categorySlug);
    const apply = this.resolveApplyDraftFields(input);

    const [created] = await database.db
      .insert(jobs)
      .values({
        companyId,
        createdByUserId: actorUserId,
        title: input.title,
        description: input.description,
        descriptionDoc: input.descriptionDoc ?? null,
        descriptionHtml: jobDescriptionHtmlFromDraftBody({
          description: input.description,
          descriptionDoc: input.descriptionDoc,
        }),
        status: 'draft',
        cityId,
        categoryId,
        workModel: input.workModel,
        employmentType: input.employmentType,
        seniority: input.seniority,
        applyMode: apply.applyMode,
        externalApplyUrl: apply.externalApplyUrl,
        primaryLanguage: apply.primaryLanguage,
        subscriptionId: chosenSubId,
        featured,
        crossborderVisible,
        pngCreativeUrl,
      })
      .returning({ id: jobs.id });

    if (!created) {
      throw codedInternalError('JOB_CREATE_FAILED', 'Could not create job');
    }
    return { id: created.id };
  }

  async listCompanyJobs(userId: string): Promise<EmployerJobListItem[]> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const ctx = await this.requireCompanyContext(userId);

    const rows = await database.db
      .select({
        id: jobs.id,
        title: jobs.title,
        status: jobs.status,
        slug: jobs.slug,
        updatedAt: jobs.updatedAt,
        submittedAt: jobs.submittedAt,
        publishedAt: jobs.publishedAt,
      })
      .from(jobs)
      .where(eq(jobs.companyId, ctx.companyId))
      .orderBy(desc(jobs.updatedAt));

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      slug: r.slug ?? null,
      updatedAt: r.updatedAt.toISOString(),
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
      publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    }));
  }

  async getEmployerJob(
    userId: string,
    jobId: string,
  ): Promise<EmployerJobDetailResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const ctx = await this.requireCompanyContext(userId);

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
        applyMode: jobs.applyMode,
        externalApplyUrl: jobs.externalApplyUrl,
        primaryLanguage: jobs.primaryLanguage,
        featured: jobs.featured,
        crossborderVisible: jobs.crossborderVisible,
        pngCreativeUrl: jobs.pngCreativeUrl,
        companyId: jobs.companyId,
        workModel: jobs.workModel,
        employmentType: jobs.employmentType,
        seniority: jobs.seniority,
        updatedAt: jobs.updatedAt,
        submittedAt: jobs.submittedAt,
        publishedAt: jobs.publishedAt,
        expiresAt: jobs.expiresAt,
        rejectedReason: jobs.rejectedReason,
        citySlug: cities.slug,
        categorySlug: jobCategories.slug,
        subscriptionId: jobs.subscriptionId,
      })
      .from(jobs)
      .leftJoin(cities, eq(jobs.cityId, cities.id))
      .leftJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!row) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }
    if (row.companyId !== ctx.companyId) {
      throw codedForbidden(
        'JOB_FORBIDDEN_COMPANY',
        'Job belongs to another company',
      );
    }

    let authoringEntitlements: EmployerJobDetailResponse['authoringEntitlements'] =
      null;
    if (row.subscriptionId) {
      const bundle = await this.loadSubscriptionEntitlementsBundle(
        row.subscriptionId,
      );
      authoringEntitlements = bundle.blob;
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      descriptionHtml: effectiveJobDescriptionHtml(
        row.descriptionHtml,
        row.descriptionDoc,
      ),
      descriptionDoc:
        (row.descriptionDoc as EmployerJobDetailResponse['descriptionDoc']) ??
        null,
      status: row.status,
      slug: row.slug ?? null,
      shortId: row.shortId ?? null,
      applyMode: row.applyMode === 'external' ? 'external' : 'internal',
      externalApplyUrl: row.externalApplyUrl ?? null,
      primaryLanguage: row.primaryLanguage === 'en' ? 'en' : 'sr',
      featured: row.featured === true,
      crossborderVisible: row.crossborderVisible === true,
      pngCreativeUrl: row.pngCreativeUrl ?? null,
      citySlug: row.citySlug ?? null,
      categorySlug: row.categorySlug ?? null,
      workModel: row.workModel,
      employmentType: row.employmentType,
      seniority: row.seniority,
      updatedAt: row.updatedAt.toISOString(),
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      rejectedReason: row.rejectedReason ?? null,
      subscriptionId: row.subscriptionId ?? null,
      authoringEntitlements,
    };
  }

  /** Staff: load job detail for the composer without an employer session. */
  async getEmployerJobForStaff(
    jobId: string,
  ): Promise<EmployerJobDetailResponse> {
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
        applyMode: jobs.applyMode,
        externalApplyUrl: jobs.externalApplyUrl,
        primaryLanguage: jobs.primaryLanguage,
        featured: jobs.featured,
        crossborderVisible: jobs.crossborderVisible,
        pngCreativeUrl: jobs.pngCreativeUrl,
        companyId: jobs.companyId,
        workModel: jobs.workModel,
        employmentType: jobs.employmentType,
        seniority: jobs.seniority,
        updatedAt: jobs.updatedAt,
        submittedAt: jobs.submittedAt,
        publishedAt: jobs.publishedAt,
        expiresAt: jobs.expiresAt,
        rejectedReason: jobs.rejectedReason,
        citySlug: cities.slug,
        categorySlug: jobCategories.slug,
        subscriptionId: jobs.subscriptionId,
      })
      .from(jobs)
      .leftJoin(cities, eq(jobs.cityId, cities.id))
      .leftJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!row) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }

    let authoringEntitlements: EmployerJobDetailResponse['authoringEntitlements'] =
      null;
    if (row.subscriptionId) {
      const bundle = await this.loadSubscriptionEntitlementsBundle(
        row.subscriptionId,
      );
      authoringEntitlements = bundle.blob;
    }

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      descriptionHtml: effectiveJobDescriptionHtml(
        row.descriptionHtml,
        row.descriptionDoc,
      ),
      descriptionDoc:
        (row.descriptionDoc as EmployerJobDetailResponse['descriptionDoc']) ??
        null,
      status: row.status,
      slug: row.slug ?? null,
      shortId: row.shortId ?? null,
      applyMode: row.applyMode === 'external' ? 'external' : 'internal',
      externalApplyUrl: row.externalApplyUrl ?? null,
      primaryLanguage: row.primaryLanguage === 'en' ? 'en' : 'sr',
      featured: row.featured === true,
      crossborderVisible: row.crossborderVisible === true,
      pngCreativeUrl: row.pngCreativeUrl ?? null,
      citySlug: row.citySlug ?? null,
      categorySlug: row.categorySlug ?? null,
      workModel: row.workModel,
      employmentType: row.employmentType,
      seniority: row.seniority,
      updatedAt: row.updatedAt.toISOString(),
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      rejectedReason: row.rejectedReason ?? null,
      subscriptionId: row.subscriptionId ?? null,
      authoringEntitlements,
    };
  }

  async updateDraftJob(
    userId: string,
    jobId: string,
    input: EmployerJobDraftBody,
  ): Promise<
    | { ok: true; job: EmployerJobDetailResponse }
    | { ok: true; status: 'submitted'; submittedAt: string }
  > {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const ctx = await this.requireCompanyContext(userId);
    const cityId = await this.resolveCityId(input.citySlug);
    const categoryId = await this.resolveCategoryId(input.categorySlug);

    const [existing] = await database.db
      .select({
        companyId: jobs.companyId,
        status: jobs.status,
        applyMode: jobs.applyMode,
        externalApplyUrl: jobs.externalApplyUrl,
        subscriptionId: jobs.subscriptionId,
        featured: jobs.featured,
        crossborderVisible: jobs.crossborderVisible,
        pngCreativeUrl: jobs.pngCreativeUrl,
      })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!existing) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }
    if (existing.companyId !== ctx.companyId) {
      throw codedForbidden(
        'JOB_FORBIDDEN_COMPANY',
        'Job belongs to another company',
      );
    }

    const resolved: EmployerJobDraftBody = {
      ...input,
      featured: input.featured ?? existing.featured,
      crossborderVisible:
        input.crossborderVisible ?? existing.crossborderVisible,
      pngCreativeUrl:
        input.pngCreativeUrl !== undefined
          ? (input.pngCreativeUrl ?? null)
          : (existing.pngCreativeUrl ?? null),
    };

    const apply = this.resolveApplyDraftFields(input);

    if (existing.subscriptionId) {
      const bundle = await this.loadSubscriptionEntitlementsBundle(
        existing.subscriptionId,
      );
      await this.assertDraftMatchesEntitlements(bundle.blob, resolved);
    }

    if (existing.status === 'draft') {
      await database.db
        .update(jobs)
        .set({
          title: input.title,
          description: input.description,
          descriptionDoc: input.descriptionDoc ?? null,
          descriptionHtml: jobDescriptionHtmlFromDraftBody({
            description: input.description,
            descriptionDoc: input.descriptionDoc,
          }),
          cityId,
          categoryId,
          workModel: input.workModel,
          employmentType: input.employmentType,
          seniority: input.seniority,
          applyMode: apply.applyMode,
          externalApplyUrl: apply.externalApplyUrl,
          primaryLanguage: apply.primaryLanguage,
          featured: resolved.featured ?? false,
          crossborderVisible: resolved.crossborderVisible ?? false,
          pngCreativeUrl: resolved.pngCreativeUrl ?? null,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, jobId));

      return { ok: true, job: await this.getEmployerJob(userId, jobId) };
    }

    if (existing.status === 'published') {
      this.assertApplyUnchangedForPublished(existing, apply);
      const now = new Date();
      await demotePublishedJobAfterDraftBodyEdit(database.db, {
        jobId,
        companyId: ctx.companyId,
        submittedByUserId: userId,
        correlationId: getCorrelationId() ?? null,
        cityId,
        categoryId,
        apply,
        draft: resolved,
        now,
      });
      return {
        ok: true,
        status: 'submitted',
        submittedAt: now.toISOString(),
      };
    }

    throw codedBadRequest(
      'JOB_INVALID_STATE',
      'This job cannot be edited in its current status',
    );
  }

  /**
   * Staff (moderator/admin): edit a published listing body; demotes to
   * `submitted` like an employer edit (SSOT §7.2).
   */
  async staffDemotePublishedJobWithDraftBody(
    jobId: string,
    input: EmployerJobDraftBody,
    actorUserId: string,
  ): Promise<{ submittedAt: string }> {
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
        status: jobs.status,
        companyId: jobs.companyId,
        subscriptionId: jobs.subscriptionId,
        applyMode: jobs.applyMode,
        externalApplyUrl: jobs.externalApplyUrl,
        featured: jobs.featured,
        crossborderVisible: jobs.crossborderVisible,
        pngCreativeUrl: jobs.pngCreativeUrl,
      })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!row) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }
    if (row.status !== 'published') {
      throw codedBadRequest(
        'JOB_INVALID_STATE',
        'Only published jobs can be updated this way',
      );
    }

    const resolved: EmployerJobDraftBody = {
      ...input,
      featured: input.featured ?? row.featured,
      crossborderVisible: input.crossborderVisible ?? row.crossborderVisible,
      pngCreativeUrl:
        input.pngCreativeUrl !== undefined
          ? (input.pngCreativeUrl ?? null)
          : (row.pngCreativeUrl ?? null),
    };

    if (row.subscriptionId) {
      const bundle = await this.loadSubscriptionEntitlementsBundle(
        row.subscriptionId,
      );
      await this.assertDraftMatchesEntitlements(bundle.blob, resolved);
    }

    const cityId = await this.resolveCityId(input.citySlug);
    const categoryId = await this.resolveCategoryId(input.categorySlug);
    const apply = this.resolveApplyDraftFields(input);
    this.assertApplyUnchangedForPublished(row, apply);

    const now = new Date();
    await demotePublishedJobAfterDraftBodyEdit(database.db, {
      jobId,
      companyId: row.companyId,
      submittedByUserId: actorUserId,
      correlationId: getCorrelationId() ?? null,
      cityId,
      categoryId,
      apply,
      draft: resolved,
      now,
    });

    return { submittedAt: now.toISOString() };
  }

  /**
   * Staff: update listing body for `draft` or `submitted` without demoting
   * from published.
   */
  async staffUpdateDraftOrSubmittedJobBody(
    jobId: string,
    input: EmployerJobDraftBody,
  ): Promise<void> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const cityId = await this.resolveCityId(input.citySlug);
    const categoryId = await this.resolveCategoryId(input.categorySlug);

    const [existing] = await database.db
      .select({
        status: jobs.status,
        subscriptionId: jobs.subscriptionId,
        featured: jobs.featured,
        crossborderVisible: jobs.crossborderVisible,
        pngCreativeUrl: jobs.pngCreativeUrl,
      })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!existing) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }
    if (existing.status !== 'draft' && existing.status !== 'submitted') {
      throw codedBadRequest(
        'JOB_INVALID_STATE',
        'Only draft or submitted jobs can be updated this way',
      );
    }

    const resolved: EmployerJobDraftBody = {
      ...input,
      featured: input.featured ?? existing.featured,
      crossborderVisible:
        input.crossborderVisible ?? existing.crossborderVisible,
      pngCreativeUrl:
        input.pngCreativeUrl !== undefined
          ? (input.pngCreativeUrl ?? null)
          : (existing.pngCreativeUrl ?? null),
    };

    const apply = this.resolveApplyDraftFields(input);

    if (existing.subscriptionId) {
      const bundle = await this.loadSubscriptionEntitlementsBundle(
        existing.subscriptionId,
      );
      await this.assertDraftMatchesEntitlements(bundle.blob, resolved);
    }

    await database.db
      .update(jobs)
      .set({
        title: input.title,
        description: input.description,
        descriptionDoc: input.descriptionDoc ?? null,
        descriptionHtml: jobDescriptionHtmlFromDraftBody({
          description: input.description,
          descriptionDoc: input.descriptionDoc,
        }),
        cityId,
        categoryId,
        workModel: input.workModel,
        employmentType: input.employmentType,
        seniority: input.seniority,
        applyMode: apply.applyMode,
        externalApplyUrl: apply.externalApplyUrl,
        primaryLanguage: apply.primaryLanguage,
        featured: resolved.featured ?? false,
        crossborderVisible: resolved.crossborderVisible ?? false,
        pngCreativeUrl: resolved.pngCreativeUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));
  }

  async submitJobForModeration(
    userId: string,
    jobId: string,
  ): Promise<{ ok: true; status: 'submitted'; submittedAt: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const ctx = await this.requireCompanyContext(userId);

    const [existing] = await database.db
      .select({
        companyId: jobs.companyId,
        status: jobs.status,
        subscriptionId: jobs.subscriptionId,
        categoryId: jobs.categoryId,
      })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!existing) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }
    if (existing.companyId !== ctx.companyId) {
      throw codedForbidden(
        'JOB_FORBIDDEN_COMPANY',
        'Job belongs to another company',
      );
    }
    if (existing.status !== 'draft') {
      throw codedBadRequest(
        'JOB_NOT_DRAFT',
        'Only draft jobs can be submitted for review',
      );
    }

    if (!existing.subscriptionId) {
      throw codedForbidden(
        'JOB_POSTING_NO_SUBSCRIPTION',
        'This draft is not linked to a subscription. Create a new listing from the dashboard after choosing a package.',
      );
    }

    const [subRow] = await database.db
      .select({
        companyId: subscriptions.companyId,
        status: subscriptions.status,
        packageCode: subscriptions.packageCode,
        maxActiveJobsOverride: subscriptions.maxActiveJobsOverride,
        entitlementsJsonSnapshot: subscriptions.entitlementsJsonSnapshot,
      })
      .from(subscriptions)
      .where(eq(subscriptions.id, existing.subscriptionId))
      .limit(1);

    if (
      !subRow ||
      subRow.companyId !== ctx.companyId ||
      subRow.status !== 'active'
    ) {
      throw codedForbidden(
        'JOB_POSTING_PENDING_PAYMENT',
        'The subscription for this draft is not active. Complete payment or choose a package before submitting.',
      );
    }

    const entitlements = entitlementsBlobSchema.safeParse(
      subRow.entitlementsJsonSnapshot,
    );
    if (!entitlements.success) {
      throw codedInternalError(
        'PACKAGE_ENTITLEMENTS_INCOMPLETE',
        'Subscription has invalid entitlements',
      );
    }

    const packageCode = packageCodeSchema.parse(subRow.packageCode);
    const maxActiveJobs = effectiveMaxActiveJobs(
      packageCode,
      entitlements.data,
      subRow.maxActiveJobsOverride ?? null,
    );

    const [draftSnapshot] = await database.db
      .select({
        description: jobs.description,
        descriptionDoc: jobs.descriptionDoc,
        citySlug: cities.slug,
        featured: jobs.featured,
        crossborderVisible: jobs.crossborderVisible,
        pngCreativeUrl: jobs.pngCreativeUrl,
      })
      .from(jobs)
      .leftJoin(cities, eq(jobs.cityId, cities.id))
      .where(eq(jobs.id, jobId))
      .limit(1);

    await this.assertDraftMatchesEntitlements(entitlements.data, {
      description: draftSnapshot?.description ?? '',
      descriptionDoc:
        (draftSnapshot?.descriptionDoc as EmployerJobDraftBody['descriptionDoc']) ??
        null,
      citySlug: draftSnapshot?.citySlug ?? undefined,
      featured: draftSnapshot?.featured,
      crossborderVisible: draftSnapshot?.crossborderVisible,
      pngCreativeUrl: draftSnapshot?.pngCreativeUrl,
    });

    await assertPromoJobCategoryAllowed(database.db, {
      subscriptionId: existing.subscriptionId,
      categoryId: existing.categoryId,
    });

    const [pipelineRow] = await database.db
      .select({ n: count() })
      .from(jobs)
      .where(
        and(
          eq(jobs.subscriptionId, existing.subscriptionId),
          inArray(jobs.status, [...JOB_STATUSES_FOR_SUBSCRIPTION_CAP]),
        ),
      );
    const pipeline = Number(pipelineRow?.n ?? 0);
    if (pipeline >= maxActiveJobs) {
      throw codedForbidden(
        'JOB_POSTING_AT_CAPACITY',
        'All listing slots for this subscription are in use. Archive or upgrade before submitting another job.',
      );
    }

    const submittedAt = new Date();

    await database.db.transaction(async (tx) => {
      await tx
        .update(jobs)
        .set({
          status: 'submitted',
          submittedAt,
          updatedAt: submittedAt,
        })
        .where(eq(jobs.id, jobId));

      await tx.insert(outboxEvents).values({
        eventType: 'job_submitted',
        correlationId: getCorrelationId() ?? null,
        payload: {
          jobId,
          companyId: ctx.companyId,
          submittedByUserId: userId,
          submittedAt: submittedAt.toISOString(),
        },
      });
    });

    return {
      ok: true,
      status: 'submitted',
      submittedAt: submittedAt.toISOString(),
    };
  }

  async listJobApplications(
    userId: string,
    jobId: string,
  ): Promise<EmployerJobApplicationItem[]> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const ctx = await this.requireCompanyContext(userId);

    const [jobRow] = await database.db
      .select({ companyId: jobs.companyId })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!jobRow) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }
    if (jobRow.companyId !== ctx.companyId) {
      throw codedForbidden(
        'JOB_FORBIDDEN_COMPANY',
        'Job belongs to another company',
      );
    }

    const rows = await database.db
      .select({
        id: applications.id,
        status: applications.status,
        createdAt: applications.createdAt,
        email: users.email,
        resumeOriginalFilename: resumeAssets.originalFilename,
      })
      .from(applications)
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .innerJoin(users, eq(candidates.userId, users.id))
      .leftJoin(resumeAssets, eq(applications.resumeAssetId, resumeAssets.id))
      .where(eq(applications.jobId, jobId))
      .orderBy(desc(applications.createdAt));

    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      candidateEmail: r.email,
      createdAt: r.createdAt.toISOString(),
      resumeOriginalFilename: r.resumeOriginalFilename ?? null,
    }));
  }

  /**
   * Active catalogue from the Postgres mirror (Step 9 checkout). Omits packages
   * with no prices or invalid entitlement blobs.
   */
  async listPackageCatalogForEmployer(): Promise<EmployerPackageCatalogResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const pkgs = await database.db
      .select({
        code: packages.code,
        isEnterprise: packages.isEnterprise,
        displayOrder: packages.displayOrder,
        titleSr: packages.titleSr,
        titleEn: packages.titleEn,
        marketingDescriptionSr: packages.marketingDescriptionSr,
        marketingDescriptionEn: packages.marketingDescriptionEn,
        upgradeMessages: packages.upgradeMessages,
      })
      .from(packages)
      .where(eq(packages.isActive, true));

    pkgs.sort((a, b) => {
      const ao = a.displayOrder ?? 999;
      const bo = b.displayOrder ?? 999;
      if (ao !== bo) return ao - bo;
      return a.code.localeCompare(b.code);
    });

    const codes = pkgs.map((p) => p.code);
    if (codes.length === 0) {
      return { items: [] };
    }

    const priceRows = await database.db
      .select({
        packageCode: packagePrices.packageCode,
        durationDays: packagePrices.durationDays,
        amountMinor: packagePrices.amountMinor,
        currency: packagePrices.currency,
      })
      .from(packagePrices)
      .where(inArray(packagePrices.packageCode, codes));

    const entRows = await database.db
      .select({
        packageCode: packageEntitlements.packageCode,
        key: packageEntitlements.key,
        value: packageEntitlements.value,
      })
      .from(packageEntitlements)
      .where(inArray(packageEntitlements.packageCode, codes));

    const pricesByCode = new Map<
      string,
      Array<{ durationDays: number; amountMinor: number; currency: string }>
    >();
    for (const pr of priceRows) {
      const list = pricesByCode.get(pr.packageCode) ?? [];
      list.push({
        durationDays: pr.durationDays,
        amountMinor: pr.amountMinor,
        currency: pr.currency,
      });
      pricesByCode.set(pr.packageCode, list);
    }

    const entByCode = new Map<string, Record<string, unknown>>();
    for (const er of entRows) {
      const m = entByCode.get(er.packageCode) ?? {};
      m[er.key] = er.value as unknown;
      entByCode.set(er.packageCode, m);
    }

    const items: EmployerPackageCatalogResponse['items'] = [];
    for (const p of pkgs) {
      const rawEnt = entByCode.get(p.code);
      if (!rawEnt) {
        continue;
      }
      let entitlements;
      try {
        entitlements = entitlementsBlobSchema.parse(rawEnt);
      } catch {
        continue;
      }
      const prices = pricesByCode.get(p.code) ?? [];
      if (prices.length === 0) {
        continue;
      }
      let upgradeMessages: EmployerPackageCatalogResponse['items'][number]['upgradeMessages'];
      if (p.upgradeMessages != null) {
        const parsed = employerPackageUpgradeMessageSchema
          .array()
          .safeParse(p.upgradeMessages);
        upgradeMessages = parsed.success ? parsed.data : undefined;
      }
      items.push({
        code: p.code as PackageCode,
        isEnterprise: p.isEnterprise,
        prices,
        entitlements,
        titleSr: p.titleSr ?? null,
        titleEn: p.titleEn ?? null,
        marketingDescriptionSr: p.marketingDescriptionSr ?? null,
        marketingDescriptionEn: p.marketingDescriptionEn ?? null,
        upgradeMessages,
      });
    }

    return { items };
  }

  async listEmployerSubscriptions(
    userId: string,
  ): Promise<EmployerSubscriptionsListResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const ctx = await this.requireCompanyContext(userId);

    const rows = await database.db
      .select({
        id: subscriptions.id,
        packageCode: subscriptions.packageCode,
        packageNameSnapshot: subscriptions.packageNameSnapshot,
        status: subscriptions.status,
        startsAt: subscriptions.startsAt,
        endsAt: subscriptions.endsAt,
        proformaId: subscriptions.proformaId,
      })
      .from(subscriptions)
      .where(eq(subscriptions.companyId, ctx.companyId))
      .orderBy(desc(subscriptions.createdAt));

    return {
      items: rows.map((row) => ({
        id: row.id,
        packageCode: row.packageCode as PackageCode,
        packageNameSnapshot: row.packageNameSnapshot,
        status: row.status,
        startsAt: row.startsAt?.toISOString() ?? null,
        endsAt: row.endsAt?.toISOString() ?? null,
        proformaId: row.proformaId,
      })),
    };
  }

  async getEmployerProforma(
    userId: string,
    proformaId: string,
  ): Promise<EmployerProformaDetail> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const ctx = await this.requireCompanyContext(userId);

    const [row] = await database.db
      .select({
        id: proformas.id,
        number: proformas.number,
        totalMinor: proformas.totalMinor,
        currency: proformas.currency,
        issuedAt: proformas.issuedAt,
        paidAt: proformas.paidAt,
        pdfStorageKey: proformas.pdfStorageKey,
        subscriptionId: proformas.subscriptionId,
        subscriptionStatus: subscriptions.status,
        companyInvoiceLanguage: companies.invoiceLanguage,
      })
      .from(proformas)
      .innerJoin(subscriptions, eq(proformas.subscriptionId, subscriptions.id))
      .innerJoin(companies, eq(subscriptions.companyId, companies.id))
      .where(
        and(
          eq(proformas.id, proformaId),
          eq(subscriptions.companyId, ctx.companyId),
        ),
      )
      .limit(1);

    if (!row) {
      throw codedNotFound('NOT_FOUND', 'Proforma not found');
    }

    const contentLocale = row.companyInvoiceLanguage === 'en' ? 'en' : 'sr';
    const [paymentInstructionsHtml, refundPolicyExcerpt] = await Promise.all([
      this.billingContent.paymentInstructionsHtml(contentLocale, {
        proformaNumber: row.number,
      }),
      this.billingContent.refundExcerpt(contentLocale),
    ]);

    return {
      id: row.id,
      number: row.number,
      totalMinor: row.totalMinor,
      currency: row.currency,
      issuedAt: row.issuedAt.toISOString(),
      paidAt: row.paidAt?.toISOString() ?? null,
      subscriptionId: row.subscriptionId,
      subscriptionStatus: row.subscriptionStatus,
      pdfStorageKey: row.pdfStorageKey ?? null,
      paymentInstructionsHtml: paymentInstructionsHtml ?? null,
      refundPolicyExcerpt: refundPolicyExcerpt ?? null,
    };
  }

  async getEmployerProformaPdfForDownload(
    userId: string,
    proformaId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const ctx = await this.requireCompanyContext(userId);

    const [row] = await database.db
      .select({
        number: proformas.number,
        pdfStorageKey: proformas.pdfStorageKey,
      })
      .from(proformas)
      .innerJoin(subscriptions, eq(proformas.subscriptionId, subscriptions.id))
      .where(
        and(
          eq(proformas.id, proformaId),
          eq(subscriptions.companyId, ctx.companyId),
        ),
      )
      .limit(1);

    if (!row) {
      throw codedNotFound('NOT_FOUND', 'Proforma not found');
    }
    if (!row.pdfStorageKey) {
      throw codedNotFound(
        'NOT_FOUND',
        'Proforma PDF is not available yet; try again shortly.',
      );
    }
    const buffer = await this.billingPdf.readPdf(row.pdfStorageKey);
    if (!buffer) {
      throw codedNotFound('NOT_FOUND', 'Proforma PDF could not be loaded');
    }
    const safeNum = row.number.replace(/[^\w.-]+/g, '_');
    return { buffer, filename: `proforma-${safeNum}.pdf` };
  }

  async uploadEmployerJobDescriptionImage(
    userId: string,
    jobId: string,
    file: Express.Multer.File,
  ): Promise<{ url: string }> {
    const ctx = await this.requireCompanyContext(userId);
    return this.jobDescriptionMedia.uploadAsEmployer(
      ctx.userId,
      ctx.companyId,
      jobId,
      file,
    );
  }
}
