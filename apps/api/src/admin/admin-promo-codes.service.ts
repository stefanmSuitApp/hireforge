import { Injectable } from '@nestjs/common';
import type {
  AdminPromoCodesListQuery,
  AdminPromoCodesListResponse,
  PackageCode,
  PromoCodeCreateBody,
  PromoCodePatchBody,
  PromoCodeResponse,
  PromoDiscountType,
} from 'contracts';
import { asc, count, eq } from 'drizzle-orm';
import { promoCodes } from 'database';

import { getDb } from '../database';
import {
  codedBadRequest,
  codedConflict,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { StaffAuditService } from '../staff/staff-audit.service';

function rowToResponse(row: typeof promoCodes.$inferSelect): PromoCodeResponse {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discountType as PromoDiscountType,
    value: row.value,
    validFrom: row.validFrom?.toISOString() ?? null,
    validTo: row.validTo?.toISOString() ?? null,
    applicablePackages: (row.applicablePackages ?? null) as
      | PackageCode[]
      | null,
    applicableCategories: row.applicableCategories ?? null,
    maxRedemptions: row.maxRedemptions ?? null,
    maxPerCompany: row.maxPerCompany ?? null,
    redemptionsCount: row.redemptionsCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class AdminPromoCodesService {
  constructor(private readonly audit: StaffAuditService) {}

  async list(
    query: AdminPromoCodesListQuery,
  ): Promise<AdminPromoCodesListResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [totalRow] = await database.db
      .select({ n: count() })
      .from(promoCodes);

    const rows = await database.db
      .select()
      .from(promoCodes)
      .orderBy(asc(promoCodes.code))
      .limit(query.limit)
      .offset(query.offset);

    return {
      items: rows.map(rowToResponse),
      total: Number(totalRow?.n ?? 0),
    };
  }

  async create(
    actorUserId: string,
    body: PromoCodeCreateBody,
  ): Promise<PromoCodeResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const now = new Date();
    try {
      const [row] = await database.db
        .insert(promoCodes)
        .values({
          code: body.code,
          discountType: body.discountType,
          value: body.discountType === 'full_free' ? 0 : body.value,
          validFrom: body.validFrom ? new Date(body.validFrom) : null,
          validTo: body.validTo ? new Date(body.validTo) : null,
          applicablePackages: body.applicablePackages ?? null,
          applicableCategories: body.applicableCategories ?? null,
          maxRedemptions: body.maxRedemptions ?? null,
          maxPerCompany: body.maxPerCompany ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!row) {
        throw codedBadRequest(
          'VALIDATION_FAILED',
          'Promo code insert failed',
          undefined,
        );
      }

      await this.audit.log({
        actorUserId,
        action: 'promo_code.create',
        entityType: 'promo_code',
        entityId: row.id,
        metadata: { code: row.code },
      });

      return rowToResponse(row);
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        (e as { code?: string }).code === '23505'
      ) {
        throw codedConflict(
          'PROMO_CODE_DUPLICATE',
          'A promo code with this value already exists',
        );
      }
      throw e;
    }
  }

  async patch(
    actorUserId: string,
    id: string,
    body: PromoCodePatchBody,
  ): Promise<PromoCodeResponse> {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }

    const [existing] = await database.db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, id))
      .limit(1);

    if (!existing) {
      throw codedNotFound('PROMO_CODE_NOT_FOUND', 'Promo code not found');
    }

    const discountType =
      body.discountType ?? (existing.discountType as PromoDiscountType);
    const value =
      body.value !== undefined
        ? discountType === 'full_free'
          ? 0
          : body.value
        : existing.value;

    if (discountType === 'percent' && (value < 0 || value > 100)) {
      throw codedBadRequest(
        'PROMO_INVALID_VALUE',
        'For percent discounts, value must be 0..100',
        undefined,
      );
    }

    const validFrom =
      body.validFrom !== undefined
        ? body.validFrom
          ? new Date(body.validFrom)
          : null
        : existing.validFrom;
    const validTo =
      body.validTo !== undefined
        ? body.validTo
          ? new Date(body.validTo)
          : null
        : existing.validTo;

    if (validFrom && validTo && validFrom > validTo) {
      throw codedBadRequest(
        'PROMO_INVALID_WINDOW',
        'validTo must be on or after validFrom',
        undefined,
      );
    }

    const applicablePackages =
      body.applicablePackages !== undefined
        ? body.applicablePackages
        : existing.applicablePackages;
    const applicableCategories =
      body.applicableCategories !== undefined
        ? body.applicableCategories
        : existing.applicableCategories;
    const maxRedemptions =
      body.maxRedemptions !== undefined
        ? body.maxRedemptions
        : existing.maxRedemptions;
    const maxPerCompany =
      body.maxPerCompany !== undefined
        ? body.maxPerCompany
        : existing.maxPerCompany;

    const now = new Date();
    const [updated] = await database.db
      .update(promoCodes)
      .set({
        discountType,
        value,
        validFrom,
        validTo,
        applicablePackages,
        applicableCategories,
        maxRedemptions,
        maxPerCompany,
        updatedAt: now,
      })
      .where(eq(promoCodes.id, id))
      .returning();

    if (!updated) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Promo code update failed',
        undefined,
      );
    }

    await this.audit.log({
      actorUserId,
      action: 'promo_code.patch',
      entityType: 'promo_code',
      entityId: id,
      metadata: { code: updated.code },
    });

    return rowToResponse(updated);
  }
}
