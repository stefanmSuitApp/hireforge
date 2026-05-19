import { Injectable } from '@nestjs/common';
import {
  isEUCountry,
  type StaffCompanyCloseLostBody,
  type StaffCompanyCreateBody,
  type StaffCompanyDetailResponse,
  type StaffCompanyListItem,
  type StaffCompanyPatchBody,
  type UserRole,
} from 'contracts';
import { and, count, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { companies, employers, users } from 'database';

import {
  codedBadRequest,
  codedConflict,
  codedForbidden,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { getDb } from '../database';
import { StaffAuditService } from './staff-audit.service';

function trimOrNull(s: string | null | undefined, max?: number): string | null {
  if (s === undefined || s === null) {
    return null;
  }
  const t = s.trim();
  if (!t) {
    return null;
  }
  return max !== undefined ? t.slice(0, max) : t;
}

@Injectable()
export class StaffCompaniesService {
  constructor(private readonly audit: StaffAuditService) {}

  async list(
    input: {
      q?: string;
      view?: 'my' | 'pool' | 'all';
      limit: number;
      offset: number;
    },
    ctx: { actorUserId: string; actorRole: UserRole },
  ): Promise<{ items: StaffCompanyListItem[]; total: number }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    if (input.view === 'all' && ctx.actorRole !== 'admin') {
      throw codedForbidden(
        'STAFF_COMPANY_LIST_VIEW_FORBIDDEN',
        'Only admins can use view=all',
      );
    }

    const qRaw = input.q?.trim();
    const q = qRaw ? `%${qRaw}%` : undefined;

    const searchExpr = q
      ? or(
          ilike(companies.legalName, q),
          ilike(companies.slug, q),
          ilike(companies.pib, q),
          ilike(companies.vatId, q),
          ilike(companies.taxId, q),
        )
      : undefined;

    let viewExpr:
      | ReturnType<typeof eq>
      | ReturnType<typeof inArray>
      | undefined;
    if (input.view === 'my') {
      viewExpr = eq(companies.assignedModeratorId, ctx.actorUserId);
    } else if (input.view === 'pool') {
      viewExpr = inArray(companies.salesStatus, ['unassigned', 'closed_lost']);
    }

    const whereExpr =
      searchExpr && viewExpr
        ? and(searchExpr, viewExpr)
        : (searchExpr ?? viewExpr ?? sql`true`);

    const [totalRow] = await database.db
      .select({ n: count() })
      .from(companies)
      .where(whereExpr);

    const rows = await database.db
      .select({
        id: companies.id,
        slug: companies.slug,
        legalName: companies.legalName,
        verifiedAt: companies.verifiedAt,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
        salesStatus: companies.salesStatus,
        assignedModeratorId: companies.assignedModeratorId,
        source: companies.source,
        assignedModeratorEmail: users.email,
      })
      .from(companies)
      .leftJoin(users, eq(companies.assignedModeratorId, users.id))
      .where(whereExpr)
      .orderBy(desc(companies.updatedAt))
      .limit(input.limit)
      .offset(input.offset);

    const items: StaffCompanyListItem[] = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      legalName: r.legalName,
      verified: r.verifiedAt != null,
      verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      salesStatus: r.salesStatus as StaffCompanyListItem['salesStatus'],
      assignedModeratorId: r.assignedModeratorId ?? null,
      assignedModeratorEmail: r.assignedModeratorEmail ?? null,
      source: r.source as StaffCompanyListItem['source'],
    }));

    return { items, total: Number(totalRow?.n ?? 0) };
  }

  async getById(companyId: string): Promise<StaffCompanyDetailResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const modUser = alias(users, 'company_mod');

    const [row] = await database.db
      .select({
        id: companies.id,
        slug: companies.slug,
        legalName: companies.legalName,
        verifiedAt: companies.verifiedAt,
        verifiedByUserId: companies.verifiedByUserId,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
        isForeign: companies.isForeign,
        countryCode: companies.countryCode,
        pib: companies.pib,
        mb: companies.mb,
        vatId: companies.vatId,
        taxId: companies.taxId,
        registrationNumber: companies.registrationNumber,
        addressLine1: companies.addressLine1,
        addressLine2: companies.addressLine2,
        addressPostalCode: companies.addressPostalCode,
        addressCity: companies.addressCity,
        addressStateRegion: companies.addressStateRegion,
        bankName: companies.bankName,
        iban: companies.iban,
        swiftBic: companies.swiftBic,
        bankCountryCode: companies.bankCountryCode,
        accountCurrency: companies.accountCurrency,
        invoiceCurrency: companies.invoiceCurrency,
        invoiceLanguage: companies.invoiceLanguage,
        vatTreatment: companies.vatTreatment,
        billingEmail: companies.billingEmail,
        billingPhone: companies.billingPhone,
        billingContactName: companies.billingContactName,
        responsiblePerson: companies.responsiblePerson,
        responsiblePosition: companies.responsiblePosition,
        salesStatus: companies.salesStatus,
        assignedModeratorId: companies.assignedModeratorId,
        closedWonAt: companies.closedWonAt,
        closedLostAt: companies.closedLostAt,
        source: companies.source,
        assignedModeratorEmail: modUser.email,
      })
      .from(companies)
      .leftJoin(modUser, eq(companies.assignedModeratorId, modUser.id))
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!row) {
      throw codedNotFound('COMPANY_NOT_FOUND', 'Company not found');
    }

    const members = await database.db
      .select({
        employerId: employers.id,
        userId: employers.userId,
        email: users.email,
      })
      .from(employers)
      .innerJoin(users, eq(employers.userId, users.id))
      .where(eq(employers.companyId, companyId));

    const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

    return {
      id: row.id,
      slug: row.slug,
      legalName: row.legalName,
      verified: row.verifiedAt != null,
      verifiedAt: iso(row.verifiedAt),
      verifiedByUserId: row.verifiedByUserId ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      employers: members.map((m) => ({
        employerId: m.employerId,
        userId: m.userId,
        email: m.email,
      })),
      isForeign: row.isForeign,
      countryCode: row.countryCode,
      pib: row.pib ?? null,
      mb: row.mb ?? null,
      vatId: row.vatId ?? null,
      taxId: row.taxId ?? null,
      registrationNumber: row.registrationNumber ?? null,
      addressLine1: row.addressLine1 ?? null,
      addressLine2: row.addressLine2 ?? null,
      addressPostalCode: row.addressPostalCode ?? null,
      addressCity: row.addressCity ?? null,
      addressStateRegion: row.addressStateRegion ?? null,
      bankName: row.bankName ?? null,
      iban: row.iban ?? null,
      swiftBic: row.swiftBic ?? null,
      bankCountryCode: row.bankCountryCode ?? null,
      accountCurrency: row.accountCurrency ?? null,
      invoiceCurrency: row.invoiceCurrency,
      invoiceLanguage: row.invoiceLanguage as 'sr' | 'en',
      vatTreatment:
        row.vatTreatment as StaffCompanyDetailResponse['vatTreatment'],
      billingEmail: row.billingEmail ?? null,
      billingPhone: row.billingPhone ?? null,
      billingContactName: row.billingContactName ?? null,
      responsiblePerson: row.responsiblePerson ?? null,
      responsiblePosition: row.responsiblePosition ?? null,
      salesStatus: row.salesStatus as StaffCompanyDetailResponse['salesStatus'],
      assignedModeratorId: row.assignedModeratorId ?? null,
      closedWonAt: iso(row.closedWonAt),
      closedLostAt: iso(row.closedLostAt),
      source: row.source as StaffCompanyDetailResponse['source'],
      assignedModeratorEmail: row.assignedModeratorEmail ?? null,
    };
  }

  async create(
    actorUserId: string,
    body: StaffCompanyCreateBody,
  ): Promise<{ id: string }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const now = new Date();
    const slug = body.slug.trim().toLowerCase();
    const isForeign = body.isForeign ?? false;
    if (isForeign && !body.countryCode?.trim()) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'countryCode is required for foreign leads',
      );
    }
    const countryCode = body.countryCode?.trim().toUpperCase() ?? 'RS';

    const vatTreatment =
      body.vatTreatment ??
      (isForeign && countryCode !== 'RS'
        ? isEUCountry(countryCode)
          ? 'rs_reverse_charge'
          : 'rs_export_no_vat'
        : 'rs_standard_20');

    const [dup] = await database.db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, slug))
      .limit(1);
    if (dup) {
      throw codedConflict('COMPANY_SLUG_TAKEN', 'Slug is already in use');
    }

    try {
      const [inserted] = await database.db
        .insert(companies)
        .values({
          slug,
          legalName: body.legalName.trim(),
          updatedAt: now,
          source: 'moderator_lead',
          salesStatus: 'unassigned',
          assignedModeratorId: null,
          closedWonAt: null,
          closedLostAt: null,
          isForeign,
          countryCode,
          pib: trimOrNull(body.pib ?? undefined),
          mb: trimOrNull(body.mb ?? undefined),
          vatId: trimOrNull(body.vatId ?? undefined),
          taxId: trimOrNull(body.taxId ?? undefined),
          registrationNumber: trimOrNull(
            body.registrationNumber ?? undefined,
            80,
          ),
          addressLine1: trimOrNull(body.addressLine1 ?? undefined, 300),
          addressLine2: trimOrNull(body.addressLine2 ?? undefined, 300),
          addressPostalCode: trimOrNull(
            body.addressPostalCode ?? undefined,
            40,
          ),
          addressCity: trimOrNull(body.addressCity ?? undefined, 200),
          addressStateRegion: trimOrNull(
            body.addressStateRegion ?? undefined,
            200,
          ),
          bankName: trimOrNull(body.bankName ?? undefined, 300),
          iban: body.iban?.replace(/\s/g, '').toUpperCase() ?? null,
          swiftBic: body.swiftBic?.trim().toUpperCase() ?? null,
          bankCountryCode: body.bankCountryCode?.trim().toUpperCase() ?? null,
          accountCurrency: body.accountCurrency?.trim().toUpperCase() ?? null,
          invoiceCurrency: body.invoiceCurrency?.trim().toUpperCase() ?? 'EUR',
          invoiceLanguage: body.invoiceLanguage ?? 'sr',
          vatTreatment,
          billingEmail: body.billingEmail
            ? body.billingEmail.trim().toLowerCase()
            : null,
          billingPhone: trimOrNull(body.billingPhone ?? undefined, 40),
          billingContactName: trimOrNull(body.billingContactName ?? undefined),
          responsiblePerson: trimOrNull(body.responsiblePerson ?? undefined),
          responsiblePosition: trimOrNull(
            body.responsiblePosition ?? undefined,
          ),
        })
        .returning({ id: companies.id });

      if (!inserted) {
        throw codedBadRequest('VALIDATION_FAILED', 'Could not create company');
      }

      await this.audit.log({
        actorUserId,
        action: 'company.create',
        entityType: 'company',
        entityId: inserted.id,
        metadata: {
          slug,
          legalName: body.legalName.trim(),
          source: 'moderator_lead',
        },
      });

      return { id: inserted.id };
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code?: string }).code === '23505'
      ) {
        throw codedConflict(
          'COMPANY_IDENTIFIER_TAKEN',
          'PIB, MB, VAT ID, or other unique company identifier is already in use',
        );
      }
      throw e;
    }
  }

  async patch(
    actorUserId: string,
    actorRole: UserRole,
    companyId: string,
    body: StaffCompanyPatchBody,
  ): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [existing] = await database.db
      .select({
        id: companies.id,
        slug: companies.slug,
        salesStatus: companies.salesStatus,
        assignedModeratorId: companies.assignedModeratorId,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!existing) {
      throw codedNotFound('COMPANY_NOT_FOUND', 'Company not found');
    }

    if (actorRole === 'moderator') {
      if (existing.salesStatus === 'closed_won') {
        throw codedForbidden(
          'STAFF_COMPANY_PATCH_FORBIDDEN',
          'Moderators cannot edit closed-won companies',
        );
      }
      const isOwner = existing.assignedModeratorId === actorUserId;
      const inPool =
        existing.salesStatus === 'unassigned' ||
        existing.salesStatus === 'closed_lost';
      if (!isOwner && !inPool) {
        throw codedForbidden(
          'STAFF_COMPANY_PATCH_FORBIDDEN',
          'You can only edit your companies or unassigned / closed-lost leads',
        );
      }
    }

    if (body.slug !== undefined) {
      const nextSlug = body.slug.trim().toLowerCase();
      const [slugDup] = await database.db
        .select({ id: companies.id })
        .from(companies)
        .where(and(eq(companies.slug, nextSlug), ne(companies.id, companyId)))
        .limit(1);
      if (slugDup) {
        throw codedConflict('COMPANY_SLUG_TAKEN', 'Slug is already in use');
      }
    }

    const now = new Date();
    const patch: Record<string, unknown> = { updatedAt: now };

    if (body.legalName !== undefined) {
      patch.legalName = body.legalName.trim();
    }
    if (body.slug !== undefined) {
      patch.slug = body.slug.trim().toLowerCase();
    }
    if (body.verified === true) {
      patch.verifiedAt = now;
      patch.verifiedByUserId = actorUserId;
    } else if (body.verified === false) {
      patch.verifiedAt = null;
      patch.verifiedByUserId = null;
    }
    if (body.isForeign !== undefined) {
      patch.isForeign = body.isForeign;
    }
    if (body.countryCode !== undefined) {
      patch.countryCode = body.countryCode.trim().toUpperCase();
    }
    if (body.pib !== undefined) {
      patch.pib = trimOrNull(body.pib);
    }
    if (body.mb !== undefined) {
      patch.mb = trimOrNull(body.mb);
    }
    if (body.vatId !== undefined) {
      patch.vatId = trimOrNull(body.vatId);
    }
    if (body.taxId !== undefined) {
      patch.taxId = trimOrNull(body.taxId);
    }
    if (body.registrationNumber !== undefined) {
      patch.registrationNumber = trimOrNull(body.registrationNumber, 80);
    }
    if (body.addressLine1 !== undefined) {
      patch.addressLine1 = trimOrNull(body.addressLine1, 300);
    }
    if (body.addressLine2 !== undefined) {
      patch.addressLine2 = trimOrNull(body.addressLine2, 300);
    }
    if (body.addressPostalCode !== undefined) {
      patch.addressPostalCode = trimOrNull(body.addressPostalCode, 40);
    }
    if (body.addressCity !== undefined) {
      patch.addressCity = trimOrNull(body.addressCity, 200);
    }
    if (body.addressStateRegion !== undefined) {
      patch.addressStateRegion = trimOrNull(body.addressStateRegion, 200);
    }
    if (body.bankName !== undefined) {
      patch.bankName = trimOrNull(body.bankName, 300);
    }
    if (body.iban !== undefined) {
      patch.iban = body.iban
        ? body.iban.replace(/\s/g, '').toUpperCase()
        : null;
    }
    if (body.swiftBic !== undefined) {
      patch.swiftBic = body.swiftBic?.trim().toUpperCase() ?? null;
    }
    if (body.bankCountryCode !== undefined) {
      patch.bankCountryCode =
        body.bankCountryCode?.trim().toUpperCase() ?? null;
    }
    if (body.accountCurrency !== undefined) {
      patch.accountCurrency =
        body.accountCurrency?.trim().toUpperCase() ?? null;
    }
    if (body.invoiceCurrency !== undefined) {
      patch.invoiceCurrency = body.invoiceCurrency.trim().toUpperCase();
    }
    if (body.invoiceLanguage !== undefined) {
      patch.invoiceLanguage = body.invoiceLanguage;
    }
    if (body.vatTreatment !== undefined) {
      patch.vatTreatment = body.vatTreatment;
    }
    if (body.billingEmail !== undefined) {
      patch.billingEmail = body.billingEmail
        ? body.billingEmail.trim().toLowerCase()
        : null;
    }
    if (body.billingPhone !== undefined) {
      patch.billingPhone = trimOrNull(body.billingPhone, 40);
    }
    if (body.billingContactName !== undefined) {
      patch.billingContactName = trimOrNull(body.billingContactName);
    }
    if (body.responsiblePerson !== undefined) {
      patch.responsiblePerson = trimOrNull(body.responsiblePerson);
    }
    if (body.responsiblePosition !== undefined) {
      patch.responsiblePosition = trimOrNull(body.responsiblePosition);
    }

    try {
      await database.db
        .update(companies)
        .set(patch as typeof companies.$inferInsert)
        .where(eq(companies.id, companyId));
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code?: string }).code === '23505'
      ) {
        throw codedConflict(
          'COMPANY_IDENTIFIER_TAKEN',
          'PIB, MB, VAT ID, or other unique company identifier is already in use',
        );
      }
      throw e;
    }

    await this.audit.log({
      actorUserId,
      action: 'company.update',
      entityType: 'company',
      entityId: companyId,
      metadata: { ...body },
    });

    return { ok: true };
  }

  async pickup(actorUserId: string, companyId: string): Promise<{ ok: true }> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [row] = await database.db
      .select({
        id: companies.id,
        salesStatus: companies.salesStatus,
        assignedModeratorId: companies.assignedModeratorId,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!row) {
      throw codedNotFound('COMPANY_NOT_FOUND', 'Company not found');
    }

    const inPool =
      row.salesStatus === 'unassigned' || row.salesStatus === 'closed_lost';
    if (!inPool) {
      throw codedForbidden(
        'STAFF_COMPANY_PICKUP_FORBIDDEN',
        'Only unassigned or closed-lost companies can be picked up',
      );
    }

    const now = new Date();
    await database.db
      .update(companies)
      .set({
        salesStatus: 'pipeline',
        assignedModeratorId: actorUserId,
        closedLostAt: null,
        updatedAt: now,
      })
      .where(eq(companies.id, companyId));

    await this.audit.log({
      actorUserId,
      action: 'company.sales.pickup',
      entityType: 'company',
      entityId: companyId,
      metadata: {},
    });

    return { ok: true };
  }

  async closeWon(
    actorUserId: string,
    companyId: string,
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
        id: companies.id,
        salesStatus: companies.salesStatus,
        assignedModeratorId: companies.assignedModeratorId,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!row) {
      throw codedNotFound('COMPANY_NOT_FOUND', 'Company not found');
    }
    if (
      row.salesStatus !== 'pipeline' ||
      row.assignedModeratorId !== actorUserId
    ) {
      throw codedForbidden(
        'STAFF_COMPANY_CLOSE_FORBIDDEN',
        'Only the assigned moderator can close-won from pipeline',
      );
    }

    const now = new Date();
    await database.db
      .update(companies)
      .set({
        salesStatus: 'closed_won',
        closedWonAt: now,
        updatedAt: now,
      })
      .where(eq(companies.id, companyId));

    await this.audit.log({
      actorUserId,
      action: 'company.sales.close_won',
      entityType: 'company',
      entityId: companyId,
      metadata: {},
    });

    return { ok: true };
  }

  async closeLost(
    actorUserId: string,
    companyId: string,
    body: StaffCompanyCloseLostBody,
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
        id: companies.id,
        salesStatus: companies.salesStatus,
        assignedModeratorId: companies.assignedModeratorId,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!row) {
      throw codedNotFound('COMPANY_NOT_FOUND', 'Company not found');
    }
    if (
      row.salesStatus !== 'pipeline' ||
      row.assignedModeratorId !== actorUserId
    ) {
      throw codedForbidden(
        'STAFF_COMPANY_CLOSE_FORBIDDEN',
        'Only the assigned moderator can close-lost from pipeline',
      );
    }

    const now = new Date();
    await database.db
      .update(companies)
      .set({
        salesStatus: 'closed_lost',
        closedLostAt: now,
        assignedModeratorId: null,
        updatedAt: now,
      })
      .where(eq(companies.id, companyId));

    await this.audit.log({
      actorUserId,
      action: 'company.sales.close_lost',
      entityType: 'company',
      entityId: companyId,
      metadata: body.note ? { note: body.note } : {},
    });

    return { ok: true };
  }
}
