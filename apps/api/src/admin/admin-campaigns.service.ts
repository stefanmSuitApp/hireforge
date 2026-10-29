import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import type {
  AdminCampaignsListResponse,
  CampaignCreateBody,
  CampaignDiscountType,
  CampaignPatchBody,
  CampaignResponse,
  PackageCode,
  PublicCampaign,
} from 'contracts';
import { and, desc, eq, gt, gte, lt, lte, ne, sql } from 'drizzle-orm';
import { promoCodes } from 'database';

import { getDb } from '../database';
import {
  codedConflict,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { StaffAuditService } from '../staff/staff-audit.service';

type Row = typeof promoCodes.$inferSelect;

function toResponse(row: Row): CampaignResponse {
  return {
    id: row.id,
    discountType: row.discountType as CampaignDiscountType,
    value: row.value,
    validFrom: row.validFrom?.toISOString() ?? '',
    validTo: row.validTo?.toISOString() ?? '',
    applicablePackages: (row.applicablePackages ?? null) as
      | PackageCode[]
      | null,
    maxRedemptions: row.maxRedemptions ?? null,
    redemptionsCount: row.redemptionsCount,
    isActive: row.isActive,
    bannerSr: row.bannerSr ?? null,
    bannerEn: row.bannerEn ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Serializes campaign writes so two can't be saved overlapping. */
const CAMPAIGN_LOCK_KEY = 0x6b616d70; // "kamp"

function requireDb() {
  const database = getDb();
  if (!database) {
    throw codedServiceUnavailable(
      'DATABASE_UNAVAILABLE',
      'Database is not configured (DATABASE_URL)',
    );
  }
  return database;
}

/**
 * Public campaigns: a promo row of kind `campaign`, applied at checkout
 * without a code and shown in the home banner. At most one active campaign
 * per moment, so the banner and the checkout always agree.
 */
@Injectable()
export class AdminCampaignsService {
  constructor(private readonly audit: StaffAuditService) {}

  async list(): Promise<AdminCampaignsListResponse> {
    const { db } = requireDb();
    const rows = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.kind, 'campaign'))
      .orderBy(desc(promoCodes.validFrom))
      .limit(100);
    return { items: rows.map(toResponse) };
  }

  /** The campaign running now, for the banner and the packages page. */
  async running(now = new Date()): Promise<PublicCampaign | null> {
    const { db } = requireDb();
    const [row] = await db
      .select()
      .from(promoCodes)
      .where(
        and(
          eq(promoCodes.kind, 'campaign'),
          eq(promoCodes.isActive, true),
          lte(promoCodes.validFrom, now),
          gte(promoCodes.validTo, now),
          sql`(${promoCodes.maxRedemptions} IS NULL OR ${promoCodes.redemptionsCount} < ${promoCodes.maxRedemptions})`,
        ),
      )
      .orderBy(desc(promoCodes.validFrom))
      .limit(1);
    if (!row?.validTo) return null;
    return {
      discountType: row.discountType as CampaignDiscountType,
      value: row.value,
      validTo: row.validTo.toISOString(),
      applicablePackages: (row.applicablePackages ?? null) as
        | PackageCode[]
        | null,
      bannerSr: row.bannerSr ?? null,
      bannerEn: row.bannerEn ?? null,
    };
  }

  async create(
    actorUserId: string,
    body: CampaignCreateBody,
  ): Promise<CampaignResponse> {
    const { db } = requireDb();
    const validFrom = new Date(body.validFrom);
    const validTo = new Date(body.validTo);
    const row = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${CAMPAIGN_LOCK_KEY})`);
      await assertNoOverlap(tx, validFrom, validTo, null);
      const day = validFrom.toISOString().slice(0, 10).replace(/-/g, '');
      const [created] = await tx
        .insert(promoCodes)
        .values({
          kind: 'campaign',
          // Never typed or shown; ties redemptions and audit rows to it.
          code: `KAMPANJA-${day}-${randomBytes(3).toString('hex').toUpperCase()}`,
          discountType: body.discountType,
          value: body.discountType === 'full_free' ? 0 : body.value,
          validFrom,
          validTo,
          applicablePackages: body.applicablePackages?.length
            ? body.applicablePackages
            : null,
          maxRedemptions: body.maxRedemptions ?? null,
          maxPerCompany: 1,
          bannerSr: body.bannerSr?.trim() || null,
          bannerEn: body.bannerEn?.trim() || null,
        })
        .returning();
      return created;
    });
    await this.audit.log({
      actorUserId,
      action: 'campaign.create',
      entityType: 'promo_code',
      entityId: row.id,
      metadata: {
        discountType: row.discountType,
        value: row.value,
        validFrom: body.validFrom,
        validTo: body.validTo,
      },
    });
    return toResponse(row);
  }

  async patch(
    actorUserId: string,
    id: string,
    body: CampaignPatchBody,
  ): Promise<CampaignResponse> {
    const { db } = requireDb();
    const row = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${CAMPAIGN_LOCK_KEY})`);
      const [existing] = await tx
        .select()
        .from(promoCodes)
        .where(and(eq(promoCodes.id, id), eq(promoCodes.kind, 'campaign')))
        .limit(1);
      if (!existing?.validFrom || !existing.validTo) {
        throw codedNotFound('CAMPAIGN_NOT_FOUND', 'Campaign not found');
      }
      const isActive = body.isActive ?? existing.isActive;
      const validTo = body.validTo ? new Date(body.validTo) : existing.validTo;
      if (validTo <= existing.validFrom) {
        throw codedConflict(
          'CAMPAIGN_OVERLAP',
          'The campaign must end after it starts',
        );
      }
      if (isActive) {
        await assertNoOverlap(tx, existing.validFrom, validTo, id);
      }
      const [updated] = await tx
        .update(promoCodes)
        .set({
          isActive,
          validTo,
          ...(body.bannerSr !== undefined
            ? { bannerSr: body.bannerSr?.trim() || null }
            : {}),
          ...(body.bannerEn !== undefined
            ? { bannerEn: body.bannerEn?.trim() || null }
            : {}),
          ...(body.maxRedemptions !== undefined
            ? { maxRedemptions: body.maxRedemptions }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(promoCodes.id, id))
        .returning();
      return updated;
    });
    await this.audit.log({
      actorUserId,
      action: 'campaign.patch',
      entityType: 'promo_code',
      entityId: id,
      metadata: { ...body },
    });
    return toResponse(row);
  }
}

async function assertNoOverlap(
  tx: Parameters<
    Parameters<NonNullable<ReturnType<typeof getDb>>['db']['transaction']>[0]
  >[0],
  from: Date,
  to: Date,
  exceptId: string | null,
): Promise<void> {
  const [clash] = await tx
    .select({ id: promoCodes.id })
    .from(promoCodes)
    .where(
      and(
        eq(promoCodes.kind, 'campaign'),
        eq(promoCodes.isActive, true),
        lt(promoCodes.validFrom, to),
        gt(promoCodes.validTo, from),
        ...(exceptId ? [ne(promoCodes.id, exceptId)] : []),
      ),
    )
    .limit(1);
  if (clash) {
    throw codedConflict(
      'CAMPAIGN_OVERLAP',
      'Another active campaign runs in that period',
    );
  }
}
