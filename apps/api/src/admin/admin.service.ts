import { Injectable } from '@nestjs/common';
import type {
  AdminCompanyAssignmentHistoryResponse,
  AdminCompanyReassignBody,
  AdminJobCategoryCreateBody,
  AdminJobCategoryItem,
  AdminJobCategoryPatchBody,
  AdminJobPatchPublishBody,
  AdminUserListItem,
  AdminUserPatchBody,
  UserRole,
} from 'contracts';
import { userRoleSchema } from 'contracts';
import { and, count, desc, eq, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import {
  cities,
  companies,
  companyAssignmentsHistory,
  jobCategories,
  jobs,
  outboxEvents,
  packages,
  staffAuditLog,
  subscriptions,
  users,
} from 'database';

import {
  codedBadRequest,
  codedConflict,
  codedForbidden,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { getDb } from '../database';
import { getCorrelationId } from '../observability/correlation-storage';
import { assertPromoJobCategoryAllowed } from '../promo/assert-promo-job-category';
import { StaffAuditService } from '../staff/staff-audit.service';
import {
  isWithinTrivialPatchRatio,
  transitionJobToPublished,
  transliterateToAsciiBasic,
} from 'server-jobs';

@Injectable()
export class AdminService {
  constructor(private readonly audit: StaffAuditService) {}

  async listUsers(input: {
    role?: UserRole;
    limit: number;
    offset: number;
  }): Promise<{ items: AdminUserListItem[]; total: number }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const roleFilter = input.role ? eq(users.role, input.role) : sql`true`;

    const [totalRow] = await database.db
      .select({ n: count() })
      .from(users)
      .where(roleFilter);

    const rows = await database.db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(roleFilter)
      .orderBy(desc(users.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    const items: AdminUserListItem[] = rows.map((r) => ({
      id: r.id,
      email: r.email,
      role: userRoleSchema.parse(r.role),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return { items, total: Number(totalRow?.n ?? 0) };
  }

  async patchUser(
    actorUserId: string,
    targetUserId: string,
    body: AdminUserPatchBody,
  ): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    if (targetUserId === actorUserId) {
      throw codedConflict(
        'CANNOT_CHANGE_OWN_ROLE',
        'You cannot change your own role from this screen',
      );
    }

    const [target] = await database.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!target) {
      throw codedNotFound('NOT_FOUND', 'User not found');
    }

    const currentRole = userRoleSchema.parse(target.role);

    if (currentRole === 'admin' && body.role !== 'admin') {
      const [adminCount] = await database.db
        .select({ n: count() })
        .from(users)
        .where(eq(users.role, 'admin'));
      if (Number(adminCount?.n ?? 0) <= 1) {
        throw codedConflict(
          'LAST_ADMIN_REQUIRED',
          'At least one admin account must remain',
        );
      }
    }

    const now = new Date();
    await database.db
      .update(users)
      .set({ role: body.role, updatedAt: now })
      .where(eq(users.id, targetUserId));

    await this.audit.log({
      actorUserId,
      action: 'user.role_change',
      entityType: 'user',
      entityId: targetUserId,
      metadata: { from: currentRole, to: body.role },
    });

    return { ok: true };
  }

  async listJobCategories(): Promise<{ items: AdminJobCategoryItem[] }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const rows = await database.db
      .select({
        id: jobCategories.id,
        slug: jobCategories.slug,
        nameSr: jobCategories.nameSr,
        nameEn: jobCategories.nameEn,
        createdAt: jobCategories.createdAt,
      })
      .from(jobCategories)
      .orderBy(jobCategories.nameSr);

    const items: AdminJobCategoryItem[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      nameSr: r.nameSr,
      nameEn: r.nameEn ?? null,
      createdAt: r.createdAt.toISOString(),
    }));

    return { items };
  }

  async createJobCategory(
    actorUserId: string,
    body: AdminJobCategoryCreateBody,
  ): Promise<{ id: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const slug = body.slug.trim().toLowerCase();
    const [dup] = await database.db
      .select({ id: jobCategories.id })
      .from(jobCategories)
      .where(eq(jobCategories.slug, slug))
      .limit(1);
    if (dup) {
      throw codedConflict(
        'CATEGORY_SLUG_TAKEN',
        'Category slug is already in use',
      );
    }

    const [inserted] = await database.db
      .insert(jobCategories)
      .values({
        slug,
        nameSr: body.nameSr.trim(),
        nameEn: body.nameEn?.trim() || null,
      })
      .returning({ id: jobCategories.id });

    if (!inserted) {
      throw codedBadRequest('VALIDATION_FAILED', 'Could not create category');
    }

    await this.audit.log({
      actorUserId,
      action: 'job_category.create',
      entityType: 'job_category',
      entityId: inserted.id,
      metadata: { slug, nameSr: body.nameSr.trim() },
    });

    return { id: inserted.id };
  }

  async patchJobCategory(
    actorUserId: string,
    categoryId: string,
    body: AdminJobCategoryPatchBody,
  ): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [existing] = await database.db
      .select({ id: jobCategories.id, slug: jobCategories.slug })
      .from(jobCategories)
      .where(eq(jobCategories.id, categoryId))
      .limit(1);

    if (!existing) {
      throw codedNotFound('NOT_FOUND', 'Category not found');
    }

    if (body.slug !== undefined) {
      const nextSlug = body.slug.trim().toLowerCase();
      const [slugDup] = await database.db
        .select({ id: jobCategories.id })
        .from(jobCategories)
        .where(
          and(
            eq(jobCategories.slug, nextSlug),
            ne(jobCategories.id, categoryId),
          ),
        )
        .limit(1);
      if (slugDup) {
        throw codedConflict(
          'CATEGORY_SLUG_TAKEN',
          'Category slug is already in use',
        );
      }
    }

    const patch: {
      slug?: string;
      nameSr?: string;
      nameEn?: string | null;
    } = {};
    if (body.slug !== undefined) patch.slug = body.slug.trim().toLowerCase();
    if (body.nameSr !== undefined) patch.nameSr = body.nameSr.trim();
    if (body.nameEn !== undefined) {
      patch.nameEn = body.nameEn === null ? null : body.nameEn.trim();
    }

    await database.db
      .update(jobCategories)
      .set(patch)
      .where(eq(jobCategories.id, categoryId));

    await this.audit.log({
      actorUserId,
      action: 'job_category.update',
      entityType: 'job_category',
      entityId: categoryId,
      metadata: patch,
    });

    return { ok: true };
  }

  async deleteJobCategory(
    actorUserId: string,
    categoryId: string,
  ): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [existing] = await database.db
      .select({ id: jobCategories.id })
      .from(jobCategories)
      .where(eq(jobCategories.id, categoryId))
      .limit(1);

    if (!existing) {
      throw codedNotFound('NOT_FOUND', 'Category not found');
    }

    const [jobCount] = await database.db
      .select({ n: count() })
      .from(jobs)
      .where(eq(jobs.categoryId, categoryId));

    if (Number(jobCount?.n ?? 0) > 0) {
      throw codedConflict(
        'CATEGORY_IN_USE',
        'Cannot delete a category that is still referenced by jobs',
      );
    }

    await database.db
      .delete(jobCategories)
      .where(eq(jobCategories.id, categoryId));

    await this.audit.log({
      actorUserId,
      action: 'job_category.delete',
      entityType: 'job_category',
      entityId: categoryId,
    });

    return { ok: true };
  }

  async listAudit(input: { limit: number; offset: number }): Promise<{
    items: {
      id: string;
      actorUserId: string;
      actorEmail: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata: Record<string, unknown> | null;
      createdAt: string;
    }[];
    total: number;
  }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [totalRow] = await database.db
      .select({ n: count() })
      .from(staffAuditLog);

    const rows = await database.db
      .select({
        id: staffAuditLog.id,
        actorUserId: staffAuditLog.actorUserId,
        actorEmail: users.email,
        action: staffAuditLog.action,
        entityType: staffAuditLog.entityType,
        entityId: staffAuditLog.entityId,
        metadata: staffAuditLog.metadata,
        createdAt: staffAuditLog.createdAt,
      })
      .from(staffAuditLog)
      .leftJoin(users, eq(staffAuditLog.actorUserId, users.id))
      .orderBy(desc(staffAuditLog.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    return {
      items: rows.map((r) => ({
        id: r.id,
        actorUserId: r.actorUserId,
        actorEmail: r.actorEmail,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        metadata: r.metadata ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      total: Number(totalRow?.n ?? 0),
    };
  }

  /**
   * Draft or submitted → published only when the company has an active enterprise
   * (GAZDA) package subscription.
   */
  async publishEnterpriseJobDirectly(
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

    const [enterpriseSub] = await database.db
      .select({ id: subscriptions.id })
      .from(subscriptions)
      .innerJoin(packages, eq(subscriptions.packageCode, packages.code))
      .where(
        and(
          eq(subscriptions.companyId, row.companyId),
          eq(subscriptions.status, 'active'),
          eq(packages.isEnterprise, true),
        ),
      )
      .limit(1);

    if (!enterpriseSub) {
      throw codedForbidden(
        'JOB_ENTERPRISE_DIRECT_PUBLISH_FORBIDDEN',
        'Direct publish requires an active enterprise (GAZDA) subscription for this company',
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
      action: 'job.publish_direct_enterprise',
      entityType: 'job',
      entityId: jobId,
      metadata: {
        bypassedReview: true,
        previousStatus: prev,
      },
    });

    return { ok: true };
  }

  /**
   * Admin-only trivial correction on a published listing (SSOT §7.4):
   * `title` and/or plain description may change only within ~5% normalized
   * Levenshtein distance per edited field.
   */
  async patchPublishPublishedJob(
    actorUserId: string,
    jobId: string,
    body: AdminJobPatchPublishBody,
  ): Promise<{ ok: true }> {
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
        title: jobs.title,
        description: jobs.description,
        descriptionPlain: jobs.descriptionPlain,
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
        'Only published jobs can receive a trivial patch publish',
      );
    }

    const baselineDesc = row.descriptionPlain ?? row.description ?? '';
    let changed = false;

    if (body.title !== undefined && body.title !== row.title) {
      if (!isWithinTrivialPatchRatio(row.title, body.title)) {
        throw codedBadRequest(
          'JOB_TRIVIAL_PATCH_EXCEEDED',
          'Title change exceeds the allowed trivial edit threshold',
        );
      }
      changed = true;
    }
    if (
      body.descriptionPlain !== undefined &&
      body.descriptionPlain !== baselineDesc
    ) {
      if (!isWithinTrivialPatchRatio(baselineDesc, body.descriptionPlain)) {
        throw codedBadRequest(
          'JOB_TRIVIAL_PATCH_EXCEEDED',
          'Description change exceeds the allowed trivial edit threshold',
        );
      }
      changed = true;
    }

    if (!changed) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'No effective changes; values match the current listing',
      );
    }

    const now = new Date();
    const setFields: {
      updatedAt: Date;
      title?: string;
      description?: string;
      descriptionPlain?: string;
    } = { updatedAt: now };
    const diff: Record<string, { before: string; after: string }> = {};

    if (body.title !== undefined && body.title !== row.title) {
      setFields.title = body.title;
      diff.title = { before: row.title, after: body.title };
    }
    if (
      body.descriptionPlain !== undefined &&
      body.descriptionPlain !== baselineDesc
    ) {
      setFields.descriptionPlain = body.descriptionPlain;
      setFields.description = body.descriptionPlain;
      diff.descriptionPlain = {
        before: baselineDesc,
        after: body.descriptionPlain,
      };
    }

    await database.db.update(jobs).set(setFields).where(eq(jobs.id, jobId));

    await this.audit.log({
      actorUserId,
      action: 'job.patch_publish',
      entityType: 'job',
      entityId: jobId,
      metadata: { diff },
    });

    return { ok: true };
  }

  async forceArchiveJob(
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
      .select({ id: jobs.id, status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!row) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
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
        eventType: 'job_force_archived',
        correlationId: getCorrelationId() ?? null,
        payload: {
          jobId,
          previousStatus: row.status,
          archivedAt: now.toISOString(),
          actorUserId,
        },
      });
    });

    await this.audit.log({
      actorUserId,
      action: 'job.force_archive',
      entityType: 'job',
      entityId: jobId,
      metadata: { previousStatus: row.status },
    });

    return { ok: true };
  }

  async reassignCompany(
    adminUserId: string,
    companyId: string,
    body: AdminCompanyReassignBody,
  ): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [target] = await database.db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, body.toUserId))
      .limit(1);

    if (!target || target.role !== 'moderator') {
      throw codedBadRequest(
        'ADMIN_COMPANY_REASSIGN_TARGET_INVALID',
        'Target user must be an active moderator',
      );
    }

    const [company] = await database.db
      .select({
        id: companies.id,
        salesStatus: companies.salesStatus,
        assignedModeratorId: companies.assignedModeratorId,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!company) {
      throw codedNotFound('COMPANY_NOT_FOUND', 'Company not found');
    }

    if (company.assignedModeratorId === body.toUserId) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Company is already assigned to this moderator',
      );
    }

    const now = new Date();

    await database.db.transaction(async (tx) => {
      await tx.insert(companyAssignmentsHistory).values({
        companyId,
        fromUserId: company.assignedModeratorId,
        toUserId: body.toUserId,
        changedByAdminId: adminUserId,
        reason: body.reason,
      });

      await tx
        .update(companies)
        .set({
          assignedModeratorId: body.toUserId,
          updatedAt: now,
        })
        .where(eq(companies.id, companyId));
    });

    await this.audit.log({
      actorUserId: adminUserId,
      action: 'company.admin_reassign',
      entityType: 'company',
      entityId: companyId,
      metadata: {
        fromUserId: company.assignedModeratorId,
        toUserId: body.toUserId,
        reason: body.reason,
      },
    });

    return { ok: true };
  }

  async listCompanyAssignmentHistory(
    companyId: string,
  ): Promise<AdminCompanyAssignmentHistoryResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const fromU = alias(users, 'hist_from_user');
    const toU = alias(users, 'hist_to_user');
    const adminU = alias(users, 'hist_admin_user');

    const [co] = await database.db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!co) {
      throw codedNotFound('COMPANY_NOT_FOUND', 'Company not found');
    }

    const rows = await database.db
      .select({
        id: companyAssignmentsHistory.id,
        companyId: companyAssignmentsHistory.companyId,
        fromUserId: companyAssignmentsHistory.fromUserId,
        toUserId: companyAssignmentsHistory.toUserId,
        changedByAdminId: companyAssignmentsHistory.changedByAdminId,
        reason: companyAssignmentsHistory.reason,
        createdAt: companyAssignmentsHistory.createdAt,
        fromUserEmail: fromU.email,
        toUserEmail: toU.email,
        changedByAdminEmail: adminU.email,
      })
      .from(companyAssignmentsHistory)
      .leftJoin(fromU, eq(companyAssignmentsHistory.fromUserId, fromU.id))
      .leftJoin(toU, eq(companyAssignmentsHistory.toUserId, toU.id))
      .leftJoin(
        adminU,
        eq(companyAssignmentsHistory.changedByAdminId, adminU.id),
      )
      .where(eq(companyAssignmentsHistory.companyId, companyId))
      .orderBy(desc(companyAssignmentsHistory.createdAt));

    return {
      items: rows.map((r) => ({
        id: r.id,
        companyId: r.companyId,
        fromUserId: r.fromUserId ?? null,
        fromUserEmail: r.fromUserEmail ?? null,
        toUserId: r.toUserId ?? null,
        toUserEmail: r.toUserEmail ?? null,
        changedByAdminId: r.changedByAdminId,
        changedByAdminEmail: r.changedByAdminEmail,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
