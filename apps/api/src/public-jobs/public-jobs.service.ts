import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  PublicCompanyDetailResponse,
  PublicEmployerDirectoryItem,
  PublicEmployerDirectoryResponse,
  PublicJobDetailResponse,
  PublicJobListItem,
  PublicJobListQuery,
  PublicJobListResponse,
  PublicJobPreviewsResponse,
  PublicJobTaxonomyDistrictGroup,
  PublicJobTaxonomyItem,
  PublicJobTaxonomyResponse,
  PublicSimilarJobsResponse,
} from 'contracts';
import { and, asc, count, desc, eq, ne, sql, type SQL } from 'drizzle-orm';
import { cities, companies, districts, jobCategories, jobs } from 'database';
import { effectiveJobDescriptionHtml } from 'server-jobs';

import { getDb } from '../database';
import { codedBadRequest, codedTooManyRequests } from '../http/coded-http';
import { getRedis } from '../redis';

const EXCERPT_MAX_CHARS = 200;

function isUuidSegment(ref: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    ref.trim(),
  );
}

function excerptOf(plain: string | null): string | null {
  if (!plain) return null;
  const trimmed = plain.trim();
  if (trimmed.length <= EXCERPT_MAX_CHARS) return trimmed;
  return `${trimmed.slice(0, EXCERPT_MAX_CHARS - 1)}…`;
}

type PublicJobListJoinRow = {
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
};

function mapJoinRowToPublicListItem(r: PublicJobListJoinRow): PublicJobListItem {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug ?? null,
    shortId: r.shortId ?? null,
    featured: r.featured,
    excerpt: excerptOf(r.descriptionPlain),
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

@Injectable()
export class PublicJobsService {
  async listEmployersDirectory(): Promise<PublicEmployerDirectoryResponse> {
    const database = getDb();
    if (!database) {
      throw new ServiceUnavailableException(
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { db } = database;
    try {
      const rows = await db
        .select({
          slug: companies.slug,
          name: companies.legalName,
          publishedJobCount: count(jobs.id),
        })
        .from(companies)
        .innerJoin(
          jobs,
          and(eq(jobs.companyId, companies.id), eq(jobs.status, 'published')),
        )
        .groupBy(companies.id)
        .orderBy(asc(companies.legalName));

      const items: PublicEmployerDirectoryItem[] = rows.map((r) => ({
        slug: r.slug,
        name: r.name,
        publishedJobCount: Number(r.publishedJobCount ?? 0),
      }));

      return { items };
    } catch (e) {
      mapPublicJobsDbError(e);
    }
  }

  async getCompanyBySlug(slug: string): Promise<PublicCompanyDetailResponse> {
    const database = getDb();
    if (!database) {
      throw new ServiceUnavailableException(
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { db } = database;
    try {
      const [company] = await db
        .select({
          slug: companies.slug,
          name: companies.legalName,
        })
        .from(companies)
        .where(eq(companies.slug, slug))
        .limit(1);

      if (!company) {
        throw new NotFoundException('Company not found');
      }

      const rows = await db
        .select({
          id: jobs.id,
          title: jobs.title,
          jobSlug: jobs.slug,
          jobShortId: jobs.shortId,
          publishedAt: jobs.publishedAt,
          workModel: jobs.workModel,
          employmentType: jobs.employmentType,
          seniority: jobs.seniority,
          citySlug: cities.slug,
          cityNameSr: cities.nameSr,
          cityNameEn: cities.nameEn,
          cityPostalCode: cities.postalCode,
          categorySlug: jobCategories.slug,
          catNameSr: jobCategories.nameSr,
          catNameEn: jobCategories.nameEn,
        })
        .from(jobs)
        .innerJoin(companies, eq(jobs.companyId, companies.id))
        .leftJoin(cities, eq(jobs.cityId, cities.id))
        .leftJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
        .where(and(eq(companies.slug, slug), eq(jobs.status, 'published')))
        .orderBy(desc(jobs.publishedAt), desc(jobs.createdAt));

      return {
        company,
        jobs: rows.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.jobSlug ?? null,
          shortId: r.jobShortId ?? null,
          publishedAt: r.publishedAt?.toISOString() ?? null,
          workModel: r.workModel,
          employmentType: r.employmentType,
          seniority: r.seniority,
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
        })),
      };
    } catch (e) {
      mapPublicJobsDbError(e);
    }
  }

  async getById(id: string): Promise<PublicJobDetailResponse> {
    return this.loadPublishedJobDetail(eq(jobs.id, id));
  }

  async getBySlug(slug: string): Promise<PublicJobDetailResponse> {
    return this.loadPublishedJobDetail(eq(jobs.slug, slug));
  }

  private async loadPublishedJobDetail(
    jobKey: SQL,
  ): Promise<PublicJobDetailResponse> {
    const database = getDb();
    if (!database) {
      throw new ServiceUnavailableException(
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { db } = database;
    try {
      const [row] = await db
        .select({
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          descriptionHtml: jobs.descriptionHtml,
          descriptionDoc: jobs.descriptionDoc,
          slug: jobs.slug,
          shortId: jobs.shortId,
          applyMode: jobs.applyMode,
          externalApplyUrl: jobs.externalApplyUrl,
          primaryLanguage: jobs.primaryLanguage,
          featured: jobs.featured,
          crossborderVisible: jobs.crossborderVisible,
          pngCreativeUrl: jobs.pngCreativeUrl,
          publishedAt: jobs.publishedAt,
          expiresAt: jobs.expiresAt,
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
        .from(jobs)
        .innerJoin(companies, eq(jobs.companyId, companies.id))
        .leftJoin(cities, eq(jobs.cityId, cities.id))
        .leftJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
        .where(and(eq(jobs.status, 'published'), jobKey))
        .limit(1);

      if (!row) {
        throw new NotFoundException('Job not found');
      }

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        descriptionHtml: effectiveJobDescriptionHtml(
          row.descriptionHtml,
          row.descriptionDoc,
        ),
        slug: row.slug ?? null,
        shortId: row.shortId ?? null,
        applyMode: row.applyMode === 'external' ? 'external' : 'internal',
        externalApplyUrl: row.externalApplyUrl ?? null,
        primaryLanguage: row.primaryLanguage === 'en' ? 'en' : 'sr',
        featured: row.featured,
        crossborderVisible: row.crossborderVisible === true,
        pngCreativeUrl: row.pngCreativeUrl ?? null,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        expiresAt: row.expiresAt?.toISOString() ?? null,
        workModel: row.workModel,
        employmentType: row.employmentType,
        seniority: row.seniority,
        company: { slug: row.companySlug, name: row.companyName },
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
      };
    } catch (e) {
      mapPublicJobsDbError(e);
    }
  }

  async listJobTaxonomy(): Promise<PublicJobTaxonomyResponse> {
    const database = getDb();
    if (!database) {
      throw new ServiceUnavailableException(
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { db } = database;
    try {
      const cityRows = await db
        .select({
          id: cities.id,
          slug: cities.slug,
          nameSr: cities.nameSr,
          nameEn: cities.nameEn,
          postalCode: cities.postalCode,
          isCity: cities.isCity,
          districtSlug: cities.districtSlug,
          dSlug: districts.slug,
          dNameSr: districts.nameSr,
          dNameEn: districts.nameEn,
        })
        .from(cities)
        .leftJoin(districts, eq(cities.districtSlug, districts.slug));

      const sorted = [...cityRows].sort((a, b) => {
        if (a.districtSlug == null && b.districtSlug != null) return 1;
        if (a.districtSlug != null && b.districtSlug == null) return -1;
        const da = a.dNameSr ?? '';
        const dbn = b.dNameSr ?? '';
        const d = da.localeCompare(dbn, 'sr');
        if (d !== 0) return d;
        if (a.isCity !== b.isCity) return a.isCity ? -1 : 1;
        return a.nameSr.localeCompare(b.nameSr, 'sr');
      });

      const flat: PublicJobTaxonomyItem[] = sorted.map((r) => ({
        id: r.id,
        slug: r.slug,
        nameSr: r.nameSr,
        nameEn: r.nameEn,
        postalCode: r.postalCode ?? null,
      }));

      const cityGroups: PublicJobTaxonomyDistrictGroup[] = [];
      for (const r of sorted) {
        const item: PublicJobTaxonomyItem = {
          id: r.id,
          slug: r.slug,
          nameSr: r.nameSr,
          nameEn: r.nameEn,
          postalCode: r.postalCode ?? null,
        };
        const dslug = r.dSlug;
        const dist =
          dslug != null && r.dNameSr != null
            ? { slug: dslug, nameSr: r.dNameSr, nameEn: r.dNameEn }
            : null;
        const key = dist == null ? 'null' : dist.slug;
        const last = cityGroups[cityGroups.length - 1];
        const lastKey = last?.district == null ? 'null' : last.district.slug;
        if (!last || lastKey !== key) {
          cityGroups.push({ district: dist, cities: [item] });
        } else {
          last.cities.push(item);
        }
      }

      const categoryRows = await db
        .select({
          id: jobCategories.id,
          slug: jobCategories.slug,
          nameSr: jobCategories.nameSr,
          nameEn: jobCategories.nameEn,
        })
        .from(jobCategories)
        .orderBy(asc(jobCategories.nameSr));

      return {
        cities: flat.sort((a, b) => a.nameSr.localeCompare(b.nameSr, 'sr')),
        cityGroups,
        categories: categoryRows.map((r) => ({
          id: r.id,
          slug: r.slug,
          nameSr: r.nameSr,
          nameEn: r.nameEn,
        })),
      };
    } catch (e) {
      mapPublicJobsDbError(e);
    }
  }

  async list(params: PublicJobListQuery): Promise<PublicJobListResponse> {
    const database = getDb();
    if (!database) {
      throw new ServiceUnavailableException(
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { db } = database;
    const offset = (params.page - 1) * params.pageSize;

    const conditions = [eq(jobs.status, 'published')];

    if (params.city) {
      conditions.push(eq(cities.slug, params.city));
    }
    if (params.category) {
      conditions.push(eq(jobCategories.slug, params.category));
    }
    if (params.workModel) {
      conditions.push(eq(jobs.workModel, params.workModel));
    }
    if (params.employmentType) {
      conditions.push(eq(jobs.employmentType, params.employmentType));
    }
    if (params.postedWithin) {
      const interval =
        params.postedWithin === '1d'
          ? sql`interval '1 day'`
          : params.postedWithin === '7d'
            ? sql`interval '7 days'`
            : sql`interval '30 days'`;
      conditions.push(sql`${jobs.publishedAt} >= now() - ${interval}`);
    }
    if (params.easyApply) {
      conditions.push(eq(jobs.applyMode, 'internal'));
    }
    if (params.q) {
      const q = params.q;
      conditions.push(
        sql`to_tsvector('simple', ${jobs.title} || ' ' || coalesce(${jobs.description}, '')) @@ websearch_to_tsquery('simple', ${q})`,
      );
    }

    const wherePublished = and(...conditions);

    try {
      const [countRow] = await db
        .select({ total: count(jobs.id) })
        .from(jobs)
        .innerJoin(companies, eq(jobs.companyId, companies.id))
        .leftJoin(cities, eq(jobs.cityId, cities.id))
        .leftJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
        .where(wherePublished);
      const total = Number(countRow?.total ?? 0);

      const rows = await db
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
        .from(jobs)
        .innerJoin(companies, eq(jobs.companyId, companies.id))
        .leftJoin(cities, eq(jobs.cityId, cities.id))
        .leftJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
        .where(wherePublished)
        .orderBy(
          desc(jobs.featured),
          desc(jobs.publishedAt),
          desc(jobs.createdAt),
        )
        .limit(params.pageSize)
        .offset(offset);

      const items: PublicJobListItem[] = rows.map(mapJoinRowToPublicListItem);

      return {
        items,
        page: params.page,
        pageSize: params.pageSize,
        total,
      };
    } catch (e) {
      mapPublicJobsDbError(e);
    }
  }

  async batchPreviews(refs: string[]): Promise<PublicJobPreviewsResponse> {
    const database = getDb();
    if (!database) {
      throw new ServiceUnavailableException(
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { db } = database;
    const uniq = [...new Set(refs.map((r) => r.trim()).filter(Boolean))].slice(
      0,
      8,
    );
    try {
      const items: PublicJobListItem[] = [];
      for (const ref of uniq) {
        const jobKey = isUuidSegment(ref)
          ? eq(jobs.id, ref)
          : eq(jobs.slug, ref);
        const [row] = await db
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
          .from(jobs)
          .innerJoin(companies, eq(jobs.companyId, companies.id))
          .leftJoin(cities, eq(jobs.cityId, cities.id))
          .leftJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
          .where(and(eq(jobs.status, 'published'), jobKey))
          .limit(1);
        if (row) {
          items.push(mapJoinRowToPublicListItem(row));
        }
      }
      return { items };
    } catch (e) {
      mapPublicJobsDbError(e);
    }
  }

  async listSimilar(jobId: string, limit = 6): Promise<PublicSimilarJobsResponse> {
    const database = getDb();
    if (!database) {
      throw new ServiceUnavailableException(
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { db } = database;
    try {
      const [src] = await db
        .select({
          title: jobs.title,
          descriptionPlain: jobs.descriptionPlain,
          description: jobs.description,
        })
        .from(jobs)
        .where(and(eq(jobs.id, jobId), eq(jobs.status, 'published')))
        .limit(1);

      if (!src) {
        throw new NotFoundException('Job not found');
      }

      const qText = src.title.trim();
      if (!qText) {
        return { items: [] };
      }

      const similarWhere = and(
        eq(jobs.status, 'published'),
        ne(jobs.id, jobId),
        sql`to_tsvector('simple', ${jobs.title} || ' ' || coalesce(${jobs.descriptionPlain}, ${jobs.description}, '')) @@ websearch_to_tsquery('simple', ${qText})`,
      );

      const rows = await db
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
        .from(jobs)
        .innerJoin(companies, eq(jobs.companyId, companies.id))
        .leftJoin(cities, eq(jobs.cityId, cities.id))
        .leftJoin(jobCategories, eq(jobs.categoryId, jobCategories.id))
        .where(similarWhere)
        .orderBy(
          desc(jobs.featured),
          desc(jobs.publishedAt),
          desc(jobs.createdAt),
        )
        .limit(limit);

      return { items: rows.map(mapJoinRowToPublicListItem) };
    } catch (e) {
      mapPublicJobsDbError(e);
    }
  }

  /**
   * Anonymous telemetry for external-apply jobs (Step 10.2).
   * Redis-backed per-IP rate limit + per-(job,sessionKey) idempotency when `REDIS_URL` is set.
   */
  async recordExternalApplyClick(
    jobId: string,
    sessionKey: string,
    clientIp: string,
  ): Promise<{ ok: true; counted: boolean }> {
    const database = getDb();
    if (!database) {
      throw new ServiceUnavailableException(
        'Database is not configured (DATABASE_URL)',
      );
    }
    const { db } = database;

    try {
      const [row] = await db
        .select({
          id: jobs.id,
          status: jobs.status,
          applyMode: jobs.applyMode,
        })
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .limit(1);

      if (!row) {
        throw new NotFoundException('Job not found');
      }
      if (row.status !== 'published' || row.applyMode !== 'external') {
        throw codedBadRequest(
          'JOB_INVALID_STATE',
          'External apply tracking is only available for published external-apply jobs',
        );
      }

      const redis = getRedis();
      const safeIp = clientIp?.trim() || 'unknown';

      if (redis) {
        const rlKey = `hf:extclk:rl:${safeIp}`;
        const n = await redis.incr(rlKey);
        if (n === 1) {
          await redis.expire(rlKey, 3600);
        }
        if (n > 120) {
          throw codedTooManyRequests(
            'EXTERNAL_APPLY_CLICK_RATE_LIMITED',
            'Too many requests; try again later',
          );
        }

        const dedupeKey = `hf:extclk:${jobId}:${sessionKey}`;
        const setOk = await redis.set(dedupeKey, '1', 'EX', 86400 * 7, 'NX');
        if (setOk !== 'OK') {
          return { ok: true, counted: false };
        }
      }

      await db
        .update(jobs)
        .set({
          externalApplyClicks: sql`${jobs.externalApplyClicks} + 1`,
        })
        .where(eq(jobs.id, jobId));

      return { ok: true, counted: true };
    } catch (e) {
      mapPublicJobsDbError(e);
    }
  }
}

/** Drizzle wraps PG errors in `cause`; see `DrizzleQueryError` in drizzle-orm/errors.js */
function mapPublicJobsDbError(e: unknown): never {
  const chain = collectErrorMessages(e).join(' ');
  if (/relation ["']?jobs["']? does not exist/i.test(chain)) {
    throw new HttpException(
      'Database is missing the jobs table — run migrations: `pnpm db:migrate` (or `pnpm db:push` for dev) against DATABASE_URL.',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
  throw e;
}

function collectErrorMessages(e: unknown): string[] {
  if (!(e instanceof Error)) {
    return [String(e)];
  }
  const out: string[] = [e.message];
  let c: unknown = (e as { cause?: unknown }).cause;
  let depth = 0;
  while (c instanceof Error && depth < 8) {
    out.push(c.message);
    c = (c as { cause?: unknown }).cause;
    depth += 1;
  }
  return out;
}
