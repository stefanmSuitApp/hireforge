import { Injectable, Logger } from '@nestjs/common';
import type {
  ApplicationStatus,
  CandidateApplicationListItem,
  CandidateApplyBody,
  CandidateGenerateResumeBody,
  CandidateMeResponse,
  CandidateProfilePatch,
  CandidateResumeItem,
  CandidateSavedJobsResponse,
  CandidateSavedSearchBody,
  CandidateSavedSearchResponse,
  CvProfile,
  PublicJobListItem,
} from 'contracts';
import { cvProfileSchema, sanitizeCvProfileForPersist } from 'contracts';
import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

import { and, desc, eq, ne } from 'drizzle-orm';
import { isWithinReapplicationCooldown } from 'server-applications';
import { renderCvPdfBuffer } from 'server-cv-templates';
import {
  applications,
  candidates,
  cities,
  companies,
  jobCategories,
  jobs,
  outboxEvents,
  resumeAssets,
  savedJobSearches,
  savedJobs,
  users,
} from 'database';

import {
  codedBadRequest,
  codedConflict,
  codedForbidden,
  codedNotFound,
  codedServiceUnavailable,
  codedTooManyRequests,
} from '../http/coded-http';
import { getDb } from '../database';
import { getCorrelationId } from '../observability/correlation-storage';
import { getRedis } from '../redis';

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const LIST_EXCERPT_MAX = 200;

function jobListExcerpt(plain: string | null): string | null {
  if (!plain) return null;
  const trimmed = plain.trim();
  if (trimmed.length <= LIST_EXCERPT_MAX) return trimmed;
  return `${trimmed.slice(0, LIST_EXCERPT_MAX - 1)}…`;
}

function mapPublishedJoinRowToPublicListItem(r: {
  id: string;
  title: string;
  slug: string | null;
  shortId: string | null;
  featured: boolean;
  descriptionPlain: string | null;
  applyMode: string;
  publishedAt: Date | null;
  workModel: string;
  employmentType: string;
  seniority: string;
  companySlug: string;
  companyName: string;
  citySlug: string | null;
  cityNameSr: string;
  cityNameEn: string | null;
  cityPostalCode: string | null;
  categorySlug: string | null;
  catNameSr: string;
  catNameEn: string | null;
}): PublicJobListItem {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug ?? null,
    shortId: r.shortId ?? null,
    featured: r.featured,
    excerpt: jobListExcerpt(r.descriptionPlain),
    applyMode: r.applyMode === 'external' ? 'external' : 'internal',
    publishedAt: r.publishedAt?.toISOString() ?? null,
    workModel: r.workModel,
    employmentType: r.employmentType,
    seniority: r.seniority,
    company: { slug: r.companySlug, name: r.companyName },
    city:
      r.citySlug != null
        ? {
            slug: r.citySlug,
            nameSr: r.cityNameSr,
            nameEn: r.cityNameEn,
            postalCode: r.cityPostalCode ?? null,
          }
        : null,
    category:
      r.categorySlug != null
        ? {
            slug: r.categorySlug,
            nameSr: r.catNameSr,
            nameEn: r.catNameEn,
          }
        : null,
  };
}

const ALLOWED_RESUME_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function getUploadRoot(): string {
  const raw = process.env.CANDIDATE_UPLOAD_DIR?.trim();
  if (raw) {
    return path.resolve(raw);
  }
  return path.join(process.cwd(), 'var', 'candidate-uploads');
}

function safeBasename(original: string): string {
  const base = path.basename(original).replace(/[^\w.\-\s()]/g, '_');
  return base.slice(0, 180) || 'resume';
}

function parseCvProfile(raw: unknown): CvProfile {
  const parsed = cvProfileSchema.safeParse(raw ?? {});
  if (!parsed.success) {
    return cvProfileSchema.parse({});
  }
  return parsed.data;
}

function safeGeneratedCvFilename(
  templateCode: string,
  fullName: string | null,
): string {
  const slug = (fullName ?? 'CV')
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'CV';
  return `CV-${templateCode}-${slug}.pdf`;
}

@Injectable()
export class CandidateService {
  private readonly logger = new Logger(CandidateService.name);

  private mapListApplicationStatus(raw: string): ApplicationStatus {
    return raw === 'reviewed' ? 'viewed' : (raw as ApplicationStatus);
  }

  private async assertApplicationSubmitRateLimit(
    candidateId: string,
  ): Promise<void> {
    const redis = getRedis();
    if (!redis) {
      this.logger.warn(
        'REDIS_URL not set — skipping application submit rate limit (fail-open)',
      );
      return;
    }
    const key = `hf:cappl:rl:24h:${candidateId}`;
    const n = await redis.incr(key);
    if (n === 1) {
      await redis.expire(key, 86400);
    }
    if (n > 50) {
      throw codedTooManyRequests(
        'APPLICATION_SUBMIT_RATE_LIMITED',
        'Too many applications in the last 24 hours',
      );
    }
  }

  private async requireCandidate(userId: string): Promise<{
    candidateId: string;
    email: string;
    fullName: string | null;
    emailVerifiedAt: Date | null;
  }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const rows = await database.db
      .select({
        candidateId: candidates.id,
        email: users.email,
        fullName: candidates.fullName,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(candidates)
      .innerJoin(users, eq(candidates.userId, users.id))
      .where(and(eq(candidates.userId, userId), eq(users.role, 'candidate')))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw codedForbidden(
        'FORBIDDEN',
        'Candidate profile is not set up for this user',
      );
    }
    return row;
  }

  async getMe(userId: string): Promise<CandidateMeResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const base = await this.requireCandidate(userId);
    const [c] = await database.db
      .select({
        fullName: candidates.fullName,
        phone: candidates.phone,
        headline: candidates.headline,
        cityId: candidates.cityId,
        cvProfile: candidates.cvProfile,
        cityLabel: cities.nameSr,
      })
      .from(candidates)
      .leftJoin(cities, eq(candidates.cityId, cities.id))
      .where(eq(candidates.id, base.candidateId))
      .limit(1);
    const row = c ?? {
      fullName: base.fullName,
      phone: null as string | null,
      headline: null as string | null,
      cityId: null as string | null,
      cvProfile: {} as Record<string, unknown>,
      cityLabel: null as string | null,
    };
    return {
      user: {
        id: userId,
        email: base.email,
        role: 'candidate',
        emailVerified: base.emailVerifiedAt != null,
      },
      candidate: {
        id: base.candidateId,
        fullName: row.fullName,
        phone: row.phone ?? null,
        headline: row.headline ?? null,
        cityId: row.cityId ?? null,
        cityLabel: row.cityLabel ?? null,
        cvProfile: parseCvProfile(row.cvProfile),
      },
    };
  }

  async patchProfile(
    userId: string,
    patch: CandidateProfilePatch,
  ): Promise<CandidateMeResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const ctx = await this.requireCandidate(userId);
    const hasPatch =
      patch.fullName !== undefined ||
      patch.phone !== undefined ||
      patch.headline !== undefined ||
      patch.cityId !== undefined ||
      patch.cvProfile !== undefined;
    if (!hasPatch) {
      return this.getMe(userId);
    }

    if (patch.cityId !== undefined && patch.cityId !== null) {
      const [city] = await database.db
        .select({ id: cities.id })
        .from(cities)
        .where(eq(cities.id, patch.cityId))
        .limit(1);
      if (!city) {
        throw codedBadRequest('VALIDATION_FAILED', 'Unknown city id');
      }
    }

    const updates: Partial<{
      fullName: string | null;
      phone: string | null;
      headline: string | null;
      cityId: string | null;
      cvProfile: CvProfile;
    }> = {};

    if (patch.fullName !== undefined) {
      updates.fullName =
        patch.fullName === null ? null : patch.fullName.trim() || null;
    }
    if (patch.phone !== undefined) {
      updates.phone =
        patch.phone === null ? null : patch.phone.trim() || null;
    }
    if (patch.headline !== undefined) {
      updates.headline =
        patch.headline === null ? null : patch.headline.trim() || null;
    }
    if (patch.cityId !== undefined) {
      updates.cityId = patch.cityId;
    }
    if (patch.cvProfile !== undefined) {
      updates.cvProfile = cvProfileSchema.parse(
        sanitizeCvProfileForPersist(patch.cvProfile),
      );
    }

    await database.db
      .update(candidates)
      .set(updates)
      .where(eq(candidates.id, ctx.candidateId));
    return this.getMe(userId);
  }

  async listResumes(userId: string): Promise<CandidateResumeItem[]> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { candidateId } = await this.requireCandidate(userId);
    const rows = await database.db
      .select({
        id: resumeAssets.id,
        originalFilename: resumeAssets.originalFilename,
        mimeType: resumeAssets.mimeType,
        byteSize: resumeAssets.byteSize,
        createdAt: resumeAssets.createdAt,
        source: resumeAssets.source,
        templateCode: resumeAssets.templateCode,
      })
      .from(resumeAssets)
      .where(eq(resumeAssets.candidateId, candidateId))
      .orderBy(desc(resumeAssets.createdAt));
    return rows.map((r) => ({
      id: r.id,
      originalFilename: r.originalFilename,
      mimeType: r.mimeType,
      byteSize: r.byteSize,
      createdAt: r.createdAt.toISOString(),
      source: (r.source === 'generated' ? 'generated' : 'uploaded') as
        | 'uploaded'
        | 'generated',
      templateCode: r.templateCode as CandidateResumeItem['templateCode'],
    }));
  }

  async saveResumeUpload(params: {
    userId: string;
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
  }): Promise<CandidateResumeItem> {
    if (params.buffer.length > MAX_RESUME_BYTES) {
      throw codedBadRequest(
        'RESUME_INVALID_TYPE',
        'File is too large (max 5MB)',
      );
    }
    if (!ALLOWED_RESUME_MIME.has(params.mimeType)) {
      throw codedBadRequest(
        'RESUME_INVALID_TYPE',
        'Only PDF or Word documents are allowed',
      );
    }
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { candidateId } = await this.requireCandidate(params.userId);
    const ext = path.extname(params.originalFilename) || '.bin';
    const storageKey = path.posix.join(candidateId, `${randomUUID()}${ext}`);
    const root = getUploadRoot();
    const fullPath = path.join(root, ...storageKey.split('/'));
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, params.buffer);

    try {
      const row = await database.db.transaction(async (tx) => {
        await tx
          .update(resumeAssets)
          .set({ isPrimary: false })
          .where(eq(resumeAssets.candidateId, candidateId));

        const [inserted] = await tx
          .insert(resumeAssets)
          .values({
            candidateId,
            storageKey,
            originalFilename: safeBasename(params.originalFilename),
            mimeType: params.mimeType,
            byteSize: params.buffer.length,
            isPrimary: true,
            source: 'uploaded',
            templateCode: null,
          })
          .returning({
            id: resumeAssets.id,
            originalFilename: resumeAssets.originalFilename,
            mimeType: resumeAssets.mimeType,
            byteSize: resumeAssets.byteSize,
            createdAt: resumeAssets.createdAt,
            source: resumeAssets.source,
            templateCode: resumeAssets.templateCode,
          });
        return inserted ?? null;
      });
      if (!row) {
        throw new Error('insert resume failed');
      }
      return {
        id: row.id,
        originalFilename: row.originalFilename,
        mimeType: row.mimeType,
        byteSize: row.byteSize,
        createdAt: row.createdAt.toISOString(),
        source: (row.source === 'generated' ? 'generated' : 'uploaded') as
          | 'uploaded'
          | 'generated',
        templateCode: row.templateCode as CandidateResumeItem['templateCode'],
      };
    } catch (e) {
      try {
        await unlink(fullPath);
      } catch {
        /* ignore */
      }
      throw e;
    }
  }

  async getResumeDownloadStream(
    userId: string,
    resumeId: string,
  ): Promise<{
    stream: ReturnType<typeof createReadStream>;
    mimeType: string;
    filename: string;
  }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { candidateId } = await this.requireCandidate(userId);
    const [row] = await database.db
      .select({
        storageKey: resumeAssets.storageKey,
        originalFilename: resumeAssets.originalFilename,
        mimeType: resumeAssets.mimeType,
      })
      .from(resumeAssets)
      .where(
        and(
          eq(resumeAssets.id, resumeId),
          eq(resumeAssets.candidateId, candidateId),
        ),
      )
      .limit(1);
    if (!row) {
      throw codedNotFound('RESUME_NOT_FOUND', 'Resume not found');
    }
    const fullPath = path.join(getUploadRoot(), ...row.storageKey.split('/'));
    if (!existsSync(fullPath)) {
      throw codedNotFound('RESUME_NOT_FOUND', 'Resume file is missing');
    }
    return {
      stream: createReadStream(fullPath),
      mimeType: row.mimeType,
      filename: row.originalFilename,
    };
  }

  async deleteResume(userId: string, resumeId: string): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { candidateId } = await this.requireCandidate(userId);
    const [row] = await database.db
      .select({
        id: resumeAssets.id,
        storageKey: resumeAssets.storageKey,
      })
      .from(resumeAssets)
      .where(
        and(
          eq(resumeAssets.id, resumeId),
          eq(resumeAssets.candidateId, candidateId),
        ),
      )
      .limit(1);
    if (!row) {
      throw codedNotFound('RESUME_NOT_FOUND', 'Resume not found');
    }
    const used = await database.db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.resumeAssetId, resumeId))
      .limit(1);
    if (used[0]) {
      throw codedConflict(
        'RESUME_IN_USE',
        'This resume is attached to an application and cannot be deleted',
      );
    }
    const fullPath = path.join(getUploadRoot(), ...row.storageKey.split('/'));
    await database.db.delete(resumeAssets).where(eq(resumeAssets.id, resumeId));
    try {
      await unlink(fullPath);
    } catch {
      /* orphan file — ignore */
    }
    return { ok: true };
  }

  async submitApplication(
    userId: string,
    body: CandidateApplyBody,
  ): Promise<{ id: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const ctx = await this.requireCandidate(userId);

    if (!ctx.emailVerifiedAt) {
      throw codedForbidden(
        'CANDIDATE_EMAIL_NOT_VERIFIED',
        'Verify your email before applying to jobs',
      );
    }

    await this.assertApplicationSubmitRateLimit(ctx.candidateId);

    const coverLetterText = body.coverLetterText?.trim() || null;
    const { candidateId } = ctx;

    return database.db.transaction(async (tx) => {
      const [jobRow] = await tx
        .select({
          id: jobs.id,
          status: jobs.status,
          applyMode: jobs.applyMode,
        })
        .from(jobs)
        .where(eq(jobs.id, body.jobId))
        .limit(1);
      if (!jobRow) {
        throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
      }
      if (jobRow.status !== 'published') {
        throw codedBadRequest(
          'JOB_NOT_PUBLISHED',
          'This job is not accepting applications',
        );
      }
      if (jobRow.applyMode === 'external') {
        throw codedBadRequest(
          'JOB_EXTERNAL_APPLY_ONLY',
          'This job accepts applications only on the employer website',
        );
      }

      const [active] = await tx
        .select({ id: applications.id })
        .from(applications)
        .where(
          and(
            eq(applications.jobId, body.jobId),
            eq(applications.candidateId, candidateId),
            ne(applications.status, 'withdrawn'),
          ),
        )
        .limit(1);
      if (active) {
        throw codedConflict(
          'APPLICATION_ALREADY_EXISTS',
          'You have already applied to this job',
        );
      }

      const [lastWithdrawn] = await tx
        .select({ updatedAt: applications.updatedAt })
        .from(applications)
        .where(
          and(
            eq(applications.jobId, body.jobId),
            eq(applications.candidateId, candidateId),
            eq(applications.status, 'withdrawn'),
          ),
        )
        .orderBy(desc(applications.updatedAt))
        .limit(1);

      if (
        lastWithdrawn &&
        isWithinReapplicationCooldown(
          lastWithdrawn.updatedAt.getTime(),
          Date.now(),
        )
      ) {
        throw codedConflict(
          'APPLICATION_REAPPLY_COOLDOWN',
          'You must wait 24 hours after withdrawing before applying again',
        );
      }

      let resumeAssetIdForInsert: string;
      let resumeFilename: string;
      let resumeStorageKey: string;

      if (body.resumeAssetId) {
        const [ra] = await tx
          .select({
            id: resumeAssets.id,
            originalFilename: resumeAssets.originalFilename,
            storageKey: resumeAssets.storageKey,
          })
          .from(resumeAssets)
          .where(
            and(
              eq(resumeAssets.id, body.resumeAssetId),
              eq(resumeAssets.candidateId, candidateId),
            ),
          )
          .limit(1);
        if (!ra) {
          throw codedNotFound('RESUME_NOT_FOUND', 'Resume not found');
        }
        resumeAssetIdForInsert = ra.id;
        resumeFilename = ra.originalFilename;
        resumeStorageKey = ra.storageKey;
      } else {
        const [primary] = await tx
          .select({
            id: resumeAssets.id,
            originalFilename: resumeAssets.originalFilename,
            storageKey: resumeAssets.storageKey,
          })
          .from(resumeAssets)
          .where(
            and(
              eq(resumeAssets.candidateId, candidateId),
              eq(resumeAssets.isPrimary, true),
            ),
          )
          .limit(1);
        if (!primary) {
          throw codedBadRequest(
            'APPLICATION_RESUME_REQUIRED',
            'Set a primary CV or choose one before applying',
          );
        }
        resumeAssetIdForInsert = primary.id;
        resumeFilename = primary.originalFilename;
        resumeStorageKey = primary.storageKey;
      }

      const [appRow] = await tx
        .insert(applications)
        .values({
          jobId: body.jobId,
          candidateId,
          resumeAssetId: resumeAssetIdForInsert,
          resumeFilename,
          resumeStorageKey,
          coverLetterText,
          status: 'submitted',
        })
        .returning({ id: applications.id });

      if (!appRow) {
        throw codedServiceUnavailable(
          'DATABASE_UNAVAILABLE',
          'Could not create application',
        );
      }

      await tx.insert(outboxEvents).values({
        eventType: 'application_submitted',
        correlationId: getCorrelationId() ?? null,
        payload: {
          applicationId: appRow.id,
          jobId: body.jobId,
          candidateId,
        },
      });

      return { id: appRow.id };
    });
  }

  async generateResumeFromTemplate(
    userId: string,
    body: CandidateGenerateResumeBody,
  ): Promise<CandidateResumeItem> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const base = await this.requireCandidate(userId);
    const [row] = await database.db
      .select({
        fullName: candidates.fullName,
        phone: candidates.phone,
        headline: candidates.headline,
        cvProfile: candidates.cvProfile,
        cityLabel: cities.nameSr,
      })
      .from(candidates)
      .leftJoin(cities, eq(candidates.cityId, cities.id))
      .where(eq(candidates.id, base.candidateId))
      .limit(1);
    if (!row) {
      throw codedForbidden(
        'FORBIDDEN',
        'Candidate profile is not set up for this user',
      );
    }
    const profile = parseCvProfile(row.cvProfile);
    const layout = {
      fullName: row.fullName,
      phone: row.phone ?? null,
      headline: row.headline ?? null,
      cityLine: row.cityLabel ?? null,
      profile,
    };
    const buffer = await renderCvPdfBuffer(body.templateCode, layout);
    if (buffer.length > MAX_RESUME_BYTES) {
      throw codedBadRequest(
        'RESUME_INVALID_TYPE',
        'Generated CV exceeds maximum file size',
      );
    }
    const filename = safeGeneratedCvFilename(body.templateCode, row.fullName);
    const storageKey = path.posix.join(base.candidateId, `${randomUUID()}.pdf`);
    const root = getUploadRoot();
    const fullPath = path.join(root, ...storageKey.split('/'));
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    try {
      const out = await database.db.transaction(async (tx) => {
        await tx
          .update(resumeAssets)
          .set({ isPrimary: false })
          .where(eq(resumeAssets.candidateId, base.candidateId));
        const [inserted] = await tx
          .insert(resumeAssets)
          .values({
            candidateId: base.candidateId,
            storageKey,
            originalFilename: filename,
            mimeType: 'application/pdf',
            byteSize: buffer.length,
            isPrimary: true,
            source: 'generated',
            templateCode: body.templateCode,
          })
          .returning({
            id: resumeAssets.id,
            originalFilename: resumeAssets.originalFilename,
            mimeType: resumeAssets.mimeType,
            byteSize: resumeAssets.byteSize,
            createdAt: resumeAssets.createdAt,
            source: resumeAssets.source,
            templateCode: resumeAssets.templateCode,
          });
        return inserted;
      });
      if (!out) {
        throw new Error('insert generated resume failed');
      }
      return {
        id: out.id,
        originalFilename: out.originalFilename,
        mimeType: out.mimeType,
        byteSize: out.byteSize,
        createdAt: out.createdAt.toISOString(),
        source: 'generated',
        templateCode: out.templateCode as CandidateResumeItem['templateCode'],
      };
    } catch (e) {
      try {
        await unlink(fullPath);
      } catch {
        /* ignore */
      }
      throw e;
    }
  }

  async withdrawApplication(
    userId: string,
    applicationId: string,
  ): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { candidateId } = await this.requireCandidate(userId);
    const [row] = await database.db
      .select({
        id: applications.id,
        status: applications.status,
      })
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.candidateId, candidateId),
        ),
      )
      .limit(1);
    if (!row) {
      throw codedNotFound('NOT_FOUND', 'Application not found');
    }
    if (row.status !== 'submitted') {
      throw codedBadRequest(
        'APPLICATION_WITHDRAW_FORBIDDEN',
        'Only submitted applications can be withdrawn',
      );
    }
    await database.db
      .update(applications)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(eq(applications.id, applicationId));
    return { ok: true };
  }

  async listApplications(
    userId: string,
  ): Promise<CandidateApplicationListItem[]> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { candidateId } = await this.requireCandidate(userId);
    const rows = await database.db
      .select({
        id: applications.id,
        jobId: jobs.id,
        jobSlug: jobs.slug,
        jobTitle: jobs.title,
        companyName: companies.legalName,
        companySlug: companies.slug,
        status: applications.status,
        coverLetterText: applications.coverLetterText,
        resumeName: resumeAssets.originalFilename,
        createdAt: applications.createdAt,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .leftJoin(resumeAssets, eq(applications.resumeAssetId, resumeAssets.id))
      .where(eq(applications.candidateId, candidateId))
      .orderBy(desc(applications.createdAt));

    return rows.map((r) => ({
      id: r.id,
      jobId: r.jobId,
      jobSlug: r.jobSlug,
      jobTitle: r.jobTitle,
      companyName: r.companyName,
      companySlug: r.companySlug,
      status: this.mapListApplicationStatus(r.status),
      coverLetterText: r.coverLetterText,
      resumeOriginalFilename: r.resumeName ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async listSavedJobs(userId: string): Promise<CandidateSavedJobsResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { candidateId } = await this.requireCandidate(userId);
    const rows = await database.db
      .select({
        id: jobs.id,
        title: jobs.title,
        slug: jobs.slug,
        shortId: jobs.shortId,
        featured: jobs.featured,
        applyMode: jobs.applyMode,
        descriptionPlain: jobs.descriptionPlain,
        publishedAt: jobs.publishedAt,
        workModel: jobs.workModel,
        employmentType: jobs.employmentType,
        seniority: jobs.seniority,
        companySlug: companies.slug,
        companyName: companies.legalName,
        citySlug: cities.slug,
        cityNameSr: cities.nameSr,
        cityNameEn: cities.nameEn,
        cityPostalCode: cities.postalCode,
        categorySlug: jobCategories.slug,
        catNameSr: jobCategories.nameSr,
        catNameEn: jobCategories.nameEn,
      })
      .from(savedJobs)
      .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .leftJoin(cities, eq(jobs.cityId, cities.id))
      .leftJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
      .where(
        and(eq(savedJobs.candidateId, candidateId), eq(jobs.status, 'published')),
      )
      .orderBy(desc(savedJobs.createdAt));

    return { items: rows.map(mapPublishedJoinRowToPublicListItem) };
  }

  async saveJob(userId: string, jobId: string): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { candidateId } = await this.requireCandidate(userId);
    const [live] = await database.db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.status, 'published')))
      .limit(1);
    if (!live) {
      throw codedNotFound('JOB_NOT_FOUND', 'Job not found');
    }
    await database.db
      .insert(savedJobs)
      .values({ candidateId, jobId: live.id })
      .onConflictDoNothing({
        target: [savedJobs.candidateId, savedJobs.jobId],
      });
    return { ok: true };
  }

  async unsaveJob(userId: string, jobId: string): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { candidateId } = await this.requireCandidate(userId);
    await database.db
      .delete(savedJobs)
      .where(
        and(eq(savedJobs.candidateId, candidateId), eq(savedJobs.jobId, jobId)),
      );
    return { ok: true };
  }

  async saveSearch(
    userId: string,
    body: CandidateSavedSearchBody,
  ): Promise<CandidateSavedSearchResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { candidateId } = await this.requireCandidate(userId);
    const [row] = await database.db
      .insert(savedJobSearches)
      .values({
        candidateId,
        queryJson: body.query,
      })
      .returning({ id: savedJobSearches.id });
    if (!row) {
      throw codedBadRequest('VALIDATION_FAILED', 'Could not store search');
    }
    return { id: row.id };
  }
}
