import { Injectable, Logger } from '@nestjs/common';
import type {
  EmployerSubscriptionPurchaseResponse,
  PackageCode,
  PendingSubscriptionQueueResponse,
  PromoDiscountType,
  SubscriptionMarkPaidResponse,
  SubscriptionResponse,
} from 'contracts';
import {
  canTransition,
  discountedMinorFromPromo,
  entitlementsBlobSchema,
  packageAllowsSlotOverride,
  promoAppliesToPackageCode,
  promoWindowContainsNow,
  subscriptionPurchaseRequestSchema,
} from 'contracts';
import { and, count, desc, eq, isNull, lt, or, sql } from 'drizzle-orm';
import {
  companies,
  employers,
  invoices,
  outboxEvents,
  packageEntitlements,
  packagePrices,
  packages,
  proformas,
  promoCodes,
  promoRedemptions,
  staffAuditLog,
  subscriptions,
} from 'database';
import {
  BillingNumberingService,
  getCachedNbsMiddleRateOrFetch,
  type RedisStringCache,
} from 'server-billing';
import { z } from 'zod';

import { captureSubscriptionPurchasePromo } from '../analytics/posthog-stub';
import { BillingPdfService } from '../billing/billing-pdf.service';
import { getDb } from '../database';
import {
  codedBadRequest,
  codedForbidden,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { getCorrelationId } from '../observability/correlation-storage';
import { getRedis } from '../redis';

const PACKAGE_NAME_SNAPSHOT: Record<PackageCode, string> = {
  tezga: 'TEZGA',
  sljaka: 'ŠLJAKA',
  sef: 'ŠEF',
  gazda: 'GAZDA',
};

function billingRedisCache(): RedisStringCache | undefined {
  const redis = getRedis();
  if (!redis) {
    return undefined;
  }
  return {
    get: (key) => redis.get(key),
    setex: (key, sec, value) => redis.setex(key, sec, value),
  };
}

function subscriptionYearUtc(d: Date): number {
  return d.getUTCFullYear();
}

function addDurationDaysUtc(start: Date, durationDays: number): Date {
  return new Date(start.getTime() + durationDays * 86_400_000);
}

@Injectable()
export class SubscriptionsService {
  private readonly log = new Logger(SubscriptionsService.name);

  constructor(private readonly billingPdf: BillingPdfService) {}

  private async requireDb() {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    return database;
  }

  private async employerCompanyId(userId: string): Promise<string> {
    const { db } = await this.requireDb();
    const rows = await db
      .select({ companyId: employers.companyId })
      .from(employers)
      .where(eq(employers.userId, userId))
      .limit(1);
    const companyId = rows[0]?.companyId;
    if (!companyId) {
      throw codedForbidden(
        'EMPLOYER_NOT_SETUP',
        'Employer profile is not set up for this user',
      );
    }
    return companyId;
  }

  private toSubscriptionResponse(
    row: typeof subscriptions.$inferSelect,
  ): SubscriptionResponse {
    return {
      id: row.id,
      companyId: row.companyId,
      packageCode: row.packageCode as PackageCode,
      packageNameSnapshot: row.packageNameSnapshot,
      durationDaysSnapshot: row.durationDaysSnapshot,
      priceMinorSnapshot: row.priceMinorSnapshot,
      currencySnapshot: row.currencySnapshot,
      entitlementsJsonSnapshot: entitlementsBlobSchema.parse(
        row.entitlementsJsonSnapshot,
      ),
      status: row.status,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      enabledByUserId: row.enabledByUserId ?? null,
      enterpriseAdminUnlocked: row.enterpriseAdminUnlocked,
      proformaId: row.proformaId ?? null,
      invoiceId: row.invoiceId ?? null,
      maxActiveJobsOverride: row.maxActiveJobsOverride ?? null,
      appliedPromoCode: row.appliedPromoCode ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async createEmployerPurchase(
    employerUserId: string,
    body: unknown,
  ): Promise<EmployerSubscriptionPurchaseResponse> {
    const parsed = subscriptionPurchaseRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    const req = parsed.data;
    const ownedCompanyId = await this.employerCompanyId(employerUserId);
    if (req.companyId !== ownedCompanyId) {
      throw codedForbidden(
        'SUBSCRIPTION_FORBIDDEN',
        'Subscription purchase is only allowed for your employer company',
      );
    }
    if (req.packageCode === 'gazda') {
      throw codedBadRequest(
        'ENTERPRISE_PACKAGE_FORBIDDEN',
        'Enterprise package is activated by an administrator',
      );
    }

    const { db } = await this.requireDb();
    const now = new Date();

    const result = await db.transaction(async (tx) => {
      const [pkg] = await tx
        .select({
          code: packages.code,
          isActive: packages.isActive,
          isEnterprise: packages.isEnterprise,
        })
        .from(packages)
        .where(eq(packages.code, req.packageCode))
        .limit(1);
      if (!pkg) {
        throw codedNotFound(
          'PACKAGE_PRICE_NOT_FOUND',
          'Package is not available',
        );
      }
      if (!pkg.isActive) {
        throw codedBadRequest(
          'PACKAGE_PRICE_NOT_FOUND',
          'Package is not active',
        );
      }
      if (pkg.isEnterprise) {
        throw codedBadRequest(
          'ENTERPRISE_PACKAGE_FORBIDDEN',
          'Enterprise package is not sold via self-checkout',
        );
      }

      const [priceRow] = await tx
        .select({
          amountMinor: packagePrices.amountMinor,
          currency: packagePrices.currency,
        })
        .from(packagePrices)
        .where(
          and(
            eq(packagePrices.packageCode, req.packageCode),
            eq(packagePrices.durationDays, req.durationDays),
            eq(packagePrices.currency, req.currency),
          ),
        )
        .limit(1);
      if (!priceRow) {
        throw codedNotFound(
          'PACKAGE_PRICE_NOT_FOUND',
          'No price for this package, duration, and currency',
        );
      }

      const entRows = await tx
        .select({
          key: packageEntitlements.key,
          value: packageEntitlements.value,
        })
        .from(packageEntitlements)
        .where(eq(packageEntitlements.packageCode, req.packageCode));
      const blobRaw = Object.fromEntries(entRows.map((r) => [r.key, r.value]));
      let entitlements: ReturnType<typeof entitlementsBlobSchema.parse>;
      try {
        entitlements = entitlementsBlobSchema.parse(blobRaw);
      } catch {
        throw codedBadRequest(
          'PACKAGE_ENTITLEMENTS_INCOMPLETE',
          'Package entitlements are not configured in the catalogue mirror',
        );
      }

      let priceMinorSnapshot = priceRow.amountMinor;
      let proformaTotalMinor = priceRow.amountMinor;
      let appliedPromoCode: string | null = null;
      let promoForRedeem: (typeof promoCodes.$inferSelect) | null = null;

      if (req.promoCode) {
        const [promoRow] = await tx
          .select()
          .from(promoCodes)
          .where(eq(promoCodes.code, req.promoCode))
          .limit(1);

        if (!promoRow) {
          throw codedBadRequest(
            'PROMO_CODE_INVALID',
            'Unknown or invalid promo code',
            undefined,
          );
        }

        if (
          !promoWindowContainsNow(promoRow.validFrom, promoRow.validTo, now)
        ) {
          throw codedBadRequest(
            'PROMO_NOT_ACTIVE',
            'This promo code is not valid at this time',
            undefined,
          );
        }

        if (
          !promoAppliesToPackageCode(
            promoRow.applicablePackages ?? null,
            req.packageCode,
          )
        ) {
          throw codedBadRequest(
            'PROMO_PACKAGE_INELIGIBLE',
            'This promo does not apply to the selected package',
            undefined,
          );
        }

        if (promoRow.maxPerCompany != null) {
          const [cntRow] = await tx
            .select({ n: count() })
            .from(promoRedemptions)
            .where(
              and(
                eq(promoRedemptions.promoCodeId, promoRow.id),
                eq(promoRedemptions.companyId, req.companyId),
              ),
            );
          if (Number(cntRow?.n ?? 0) >= promoRow.maxPerCompany) {
            throw codedBadRequest(
              'PROMO_MAX_PER_COMPANY',
              'Your company has already used this promo the maximum number of times',
              undefined,
            );
          }
        }

        promoForRedeem = promoRow;
        appliedPromoCode = promoRow.code;
        priceMinorSnapshot = discountedMinorFromPromo(
          priceRow.amountMinor,
          promoRow.discountType as PromoDiscountType,
          promoRow.value,
        );
        proformaTotalMinor = priceMinorSnapshot;
      }

      const [sub] = await tx
        .insert(subscriptions)
        .values({
          companyId: req.companyId,
          packageCode: req.packageCode,
          packageNameSnapshot: PACKAGE_NAME_SNAPSHOT[req.packageCode],
          durationDaysSnapshot: req.durationDays,
          priceMinorSnapshot,
          currencySnapshot: priceRow.currency,
          entitlementsJsonSnapshot: entitlements,
          status: 'pending_payment',
          appliedPromoCode,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!sub) {
        throw codedBadRequest(
          'VALIDATION_FAILED',
          'Subscription insert failed',
        );
      }

      const { number: proformaNumber } = await BillingNumberingService.allocate(
        tx,
        'proforma',
        subscriptionYearUtc(now),
      );

      const [prof] = await tx
        .insert(proformas)
        .values({
          subscriptionId: sub.id,
          number: proformaNumber,
          totalMinor: proformaTotalMinor,
          currency: priceRow.currency,
          issuedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!prof) {
        throw codedBadRequest('VALIDATION_FAILED', 'Proforma insert failed');
      }

      const [updated] = await tx
        .update(subscriptions)
        .set({ proformaId: prof.id, updatedAt: now })
        .where(eq(subscriptions.id, sub.id))
        .returning();

      if (!updated) {
        throw codedBadRequest(
          'VALIDATION_FAILED',
          'Subscription update failed',
        );
      }

      if (promoForRedeem && appliedPromoCode) {
        const [updPromo] = await tx
          .update(promoCodes)
          .set({
            redemptionsCount: sql`${promoCodes.redemptionsCount} + 1`,
            updatedAt: now,
          })
          .where(
            and(
              eq(promoCodes.id, promoForRedeem.id),
              or(
                isNull(promoCodes.maxRedemptions),
                lt(promoCodes.redemptionsCount, promoCodes.maxRedemptions),
              ),
            ),
          )
          .returning({ id: promoCodes.id });

        if (!updPromo) {
          throw codedBadRequest(
            'PROMO_MAX_REDEMPTIONS',
            'This promo code has reached its redemption limit',
            undefined,
          );
        }

        await tx.insert(promoRedemptions).values({
          promoCodeId: promoForRedeem.id,
          code: appliedPromoCode,
          companyId: req.companyId,
          subscriptionId: updated.id,
          redeemedAt: now,
        });
      }

      const [co] = await tx
        .select({ invoiceLanguage: companies.invoiceLanguage })
        .from(companies)
        .where(eq(companies.id, req.companyId))
        .limit(1);
      const invoiceLanguagePayload = co?.invoiceLanguage === 'en' ? 'en' : 'sr';

      await tx.insert(outboxEvents).values({
        eventType: 'proforma_issued',
        correlationId: getCorrelationId() ?? null,
        payload: {
          proformaId: prof.id,
          subscriptionId: sub.id,
          companyId: req.companyId,
          invoiceLanguage: invoiceLanguagePayload,
        },
      });

      return {
        subscription: this.toSubscriptionResponse(updated),
        proforma: {
          id: prof.id,
          number: prof.number,
          totalMinor: prof.totalMinor,
          currency: prof.currency,
        },
      };
    });

    if (result.subscription.appliedPromoCode) {
      captureSubscriptionPurchasePromo({
        promo_code: result.subscription.appliedPromoCode,
        subscription_id: result.subscription.id,
        company_id: result.subscription.companyId,
      });
    }

    try {
      await this.billingPdf.generateProformaPdf(result.proforma.id);
    } catch (e) {
      this.log.error(
        `generateProformaPdf failed for ${result.proforma.id}: ${String(e)}`,
      );
    }
    return result;
  }

  async markPaidByModeratorOrAdmin(
    actor: { id: string; role: 'moderator' | 'admin' },
    subscriptionId: string,
  ): Promise<SubscriptionMarkPaidResponse> {
    const { db } = await this.requireDb();
    const now = new Date();
    const redis = billingRedisCache();

    const markPaidResult = await db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          sub: subscriptions,
          packIsEnterprise: packages.isEnterprise,
          companyCountry: companies.countryCode,
          companyModeratorId: companies.assignedModeratorId,
          companyInvoiceLanguage: companies.invoiceLanguage,
        })
        .from(subscriptions)
        .innerJoin(packages, eq(subscriptions.packageCode, packages.code))
        .innerJoin(companies, eq(subscriptions.companyId, companies.id))
        .where(eq(subscriptions.id, subscriptionId))
        .limit(1);

      if (!row) {
        throw codedNotFound('SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
      }
      if (row.packIsEnterprise) {
        throw codedForbidden(
          'SUBSCRIPTION_FORBIDDEN',
          'Enterprise subscriptions are activated by an administrator',
        );
      }
      if (row.sub.status !== 'pending_payment') {
        throw codedBadRequest(
          'SUBSCRIPTION_INVALID_STATE',
          'Subscription is not awaiting payment',
        );
      }
      if (!row.sub.proformaId) {
        throw codedBadRequest(
          'SUBSCRIPTION_INVALID_STATE',
          'Subscription has no proforma to mark paid against',
        );
      }

      if (actor.role === 'moderator') {
        if (row.companyModeratorId !== actor.id) {
          throw codedForbidden(
            'SUBSCRIPTION_FORBIDDEN',
            'Only the assigned moderator can mark this subscription paid',
          );
        }
      }

      const [prof] = await tx
        .select()
        .from(proformas)
        .where(eq(proformas.id, row.sub.proformaId))
        .limit(1);
      if (!prof || prof.voidedAt) {
        throw codedBadRequest(
          'SUBSCRIPTION_INVALID_STATE',
          'Proforma is missing or voided',
        );
      }

      const { number: invoiceNumber } = await BillingNumberingService.allocate(
        tx,
        'invoice',
        subscriptionYearUtc(now),
      );

      const rsCompany = row.companyCountry === 'RS';
      const nbs = rsCompany ? await getCachedNbsMiddleRateOrFetch(redis) : null;

      const [inv] = await tx
        .insert(invoices)
        .values({
          subscriptionId: row.sub.id,
          proformaId: prof.id,
          number: invoiceNumber,
          totalMinor: row.sub.priceMinorSnapshot,
          currency: row.sub.currencySnapshot,
          nbsRate: nbs,
          issuedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!inv) {
        throw codedBadRequest('VALIDATION_FAILED', 'Invoice insert failed');
      }

      await tx
        .update(proformas)
        .set({
          paidAt: now,
          paidMarkedByUserId: actor.id,
          updatedAt: now,
        })
        .where(eq(proformas.id, prof.id));

      const startsAt = now;
      const endsAt = addDurationDaysUtc(startsAt, row.sub.durationDaysSnapshot);

      const [updated] = await tx
        .update(subscriptions)
        .set({
          status: 'active',
          startsAt,
          endsAt,
          enabledByUserId: actor.id,
          invoiceId: inv.id,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, row.sub.id))
        .returning();

      if (!updated) {
        throw codedBadRequest(
          'VALIDATION_FAILED',
          'Subscription update failed',
        );
      }

      await tx.insert(outboxEvents).values({
        eventType: 'invoice_issued',
        correlationId: getCorrelationId() ?? null,
        payload: {
          invoiceId: inv.id,
          subscriptionId: row.sub.id,
          companyId: row.sub.companyId,
          invoiceLanguage: row.companyInvoiceLanguage === 'en' ? 'en' : 'sr',
        },
      });

      return {
        subscription: this.toSubscriptionResponse(updated),
        invoice: {
          id: inv.id,
          number: inv.number,
          totalMinor: inv.totalMinor,
          currency: inv.currency,
        },
      };
    });

    try {
      await this.billingPdf.generateInvoicePdf(markPaidResult.invoice.id);
    } catch (e) {
      this.log.error(
        `generateInvoicePdf failed for ${markPaidResult.invoice.id}: ${String(e)}`,
      );
    }
    return markPaidResult;
  }

  async listPendingPaymentForModerator(
    moderatorUserId: string,
  ): Promise<PendingSubscriptionQueueResponse> {
    const { db } = await this.requireDb();
    const rows = await db
      .select({
        subscriptionId: subscriptions.id,
        companyId: companies.id,
        companyLegalName: companies.legalName,
        packageCode: subscriptions.packageCode,
        packageNameSnapshot: subscriptions.packageNameSnapshot,
        priceMinorSnapshot: subscriptions.priceMinorSnapshot,
        currencySnapshot: subscriptions.currencySnapshot,
        proformaId: proformas.id,
        proformaNumber: proformas.number,
        proformaTotalMinor: proformas.totalMinor,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .innerJoin(companies, eq(subscriptions.companyId, companies.id))
      .innerJoin(packages, eq(subscriptions.packageCode, packages.code))
      .innerJoin(proformas, eq(subscriptions.proformaId, proformas.id))
      .where(
        and(
          eq(subscriptions.status, 'pending_payment'),
          eq(companies.assignedModeratorId, moderatorUserId),
          eq(packages.isEnterprise, false),
        ),
      )
      .orderBy(desc(subscriptions.createdAt));

    const items = rows.map((r) => ({
      subscriptionId: r.subscriptionId,
      companyId: r.companyId,
      companyLegalName: r.companyLegalName,
      packageCode: r.packageCode as PackageCode,
      packageNameSnapshot: r.packageNameSnapshot,
      priceMinor: r.priceMinorSnapshot,
      currency: r.currencySnapshot,
      proformaId: r.proformaId,
      proformaNumber: r.proformaNumber,
      proformaTotalMinor: r.proformaTotalMinor,
      createdAt: r.createdAt.toISOString(),
    }));
    return { items };
  }

  async listPendingEnterpriseActivations(): Promise<PendingSubscriptionQueueResponse> {
    const { db } = await this.requireDb();
    const rows = await db
      .select({
        subscriptionId: subscriptions.id,
        companyId: companies.id,
        companyLegalName: companies.legalName,
        packageCode: subscriptions.packageCode,
        packageNameSnapshot: subscriptions.packageNameSnapshot,
        priceMinorSnapshot: subscriptions.priceMinorSnapshot,
        currencySnapshot: subscriptions.currencySnapshot,
        proformaId: proformas.id,
        proformaNumber: proformas.number,
        proformaTotalMinor: proformas.totalMinor,
        createdAt: subscriptions.createdAt,
      })
      .from(subscriptions)
      .innerJoin(companies, eq(subscriptions.companyId, companies.id))
      .innerJoin(packages, eq(subscriptions.packageCode, packages.code))
      .leftJoin(proformas, eq(subscriptions.proformaId, proformas.id))
      .where(
        and(
          eq(subscriptions.status, 'pending_payment'),
          eq(packages.isEnterprise, true),
        ),
      )
      .orderBy(desc(subscriptions.createdAt));

    const items = rows.map((r) => ({
      subscriptionId: r.subscriptionId,
      companyId: r.companyId,
      companyLegalName: r.companyLegalName,
      packageCode: r.packageCode as PackageCode,
      packageNameSnapshot: r.packageNameSnapshot,
      priceMinor: r.priceMinorSnapshot,
      currency: r.currencySnapshot,
      proformaId: r.proformaId,
      proformaNumber: r.proformaNumber,
      proformaTotalMinor: r.proformaTotalMinor,
      createdAt: r.createdAt.toISOString(),
    }));
    return { items };
  }

  async activateEnterpriseByAdmin(
    adminUserId: string,
    subscriptionId: string,
  ): Promise<SubscriptionMarkPaidResponse> {
    const { db } = await this.requireDb();
    const now = new Date();
    const redis = billingRedisCache();

    const enterpriseResult = await db.transaction(async (tx) => {
      const [row] = await tx
        .select({
          sub: subscriptions,
          packIsEnterprise: packages.isEnterprise,
          companyCountry: companies.countryCode,
          companyInvoiceLanguage: companies.invoiceLanguage,
        })
        .from(subscriptions)
        .innerJoin(packages, eq(subscriptions.packageCode, packages.code))
        .innerJoin(companies, eq(subscriptions.companyId, companies.id))
        .where(eq(subscriptions.id, subscriptionId))
        .limit(1);

      if (!row) {
        throw codedNotFound('SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
      }
      if (row.sub.packageCode !== 'gazda' || !row.packIsEnterprise) {
        throw codedBadRequest(
          'SUBSCRIPTION_INVALID_STATE',
          'Only an enterprise (GAZDA) subscription can use this activation path',
        );
      }
      if (row.sub.status !== 'pending_payment') {
        throw codedBadRequest(
          'SUBSCRIPTION_INVALID_STATE',
          'Subscription is not awaiting activation',
        );
      }

      const { number: invoiceNumber } = await BillingNumberingService.allocate(
        tx,
        'invoice',
        subscriptionYearUtc(now),
      );

      const rsCompany = row.companyCountry === 'RS';
      const nbs = rsCompany ? await getCachedNbsMiddleRateOrFetch(redis) : null;

      const [inv] = await tx
        .insert(invoices)
        .values({
          subscriptionId: row.sub.id,
          proformaId: row.sub.proformaId,
          number: invoiceNumber,
          totalMinor: row.sub.priceMinorSnapshot,
          currency: row.sub.currencySnapshot,
          nbsRate: nbs,
          issuedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      if (!inv) {
        throw codedBadRequest('VALIDATION_FAILED', 'Invoice insert failed');
      }

      if (row.sub.proformaId) {
        await tx
          .update(proformas)
          .set({
            paidAt: now,
            paidMarkedByUserId: adminUserId,
            updatedAt: now,
          })
          .where(eq(proformas.id, row.sub.proformaId));
      }

      const startsAt = now;
      const endsAt = addDurationDaysUtc(startsAt, row.sub.durationDaysSnapshot);

      const [updated] = await tx
        .update(subscriptions)
        .set({
          status: 'active',
          startsAt,
          endsAt,
          enabledByUserId: adminUserId,
          invoiceId: inv.id,
          enterpriseAdminUnlocked: true,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, row.sub.id))
        .returning();

      if (!updated) {
        throw codedBadRequest(
          'VALIDATION_FAILED',
          'Subscription update failed',
        );
      }

      await tx.insert(outboxEvents).values({
        eventType: 'invoice_issued',
        correlationId: getCorrelationId() ?? null,
        payload: {
          invoiceId: inv.id,
          subscriptionId: row.sub.id,
          companyId: row.sub.companyId,
          invoiceLanguage: row.companyInvoiceLanguage === 'en' ? 'en' : 'sr',
        },
      });

      return {
        subscription: this.toSubscriptionResponse(updated),
        invoice: {
          id: inv.id,
          number: inv.number,
          totalMinor: inv.totalMinor,
          currency: inv.currency,
        },
      };
    });

    try {
      await this.billingPdf.generateInvoicePdf(enterpriseResult.invoice.id);
    } catch (e) {
      this.log.error(
        `generateInvoicePdf failed for ${enterpriseResult.invoice.id}: ${String(e)}`,
      );
    }
    return enterpriseResult;
  }

  async cancelByAdmin(
    _adminUserId: string,
    subscriptionId: string,
  ): Promise<SubscriptionResponse> {
    const { db } = await this.requireDb();
    const now = new Date();

    return db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, subscriptionId))
        .limit(1);
      if (!row) {
        throw codedNotFound('SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
      }
      const next: typeof row.status = 'cancelled';
      if (!canTransition(row.status, next)) {
        throw codedBadRequest(
          'SUBSCRIPTION_INVALID_STATE',
          `Cannot cancel subscription from status ${row.status}`,
        );
      }
      const [updated] = await tx
        .update(subscriptions)
        .set({ status: next, updatedAt: now })
        .where(eq(subscriptions.id, subscriptionId))
        .returning();
      if (!updated) {
        throw codedBadRequest(
          'VALIDATION_FAILED',
          'Subscription update failed',
        );
      }
      return this.toSubscriptionResponse(updated);
    });
  }

  async patchMaxActiveJobsOverrideByAdmin(
    adminUserId: string,
    subscriptionId: string,
    maxActiveJobsOverride: number | null,
  ): Promise<SubscriptionResponse> {
    const { db } = await this.requireDb();
    const now = new Date();

    const [row] = await db
      .select({
        id: subscriptions.id,
        packageCode: subscriptions.packageCode,
      })
      .from(subscriptions)
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);

    if (!row) {
      throw codedNotFound('SUBSCRIPTION_NOT_FOUND', 'Subscription not found');
    }

    const code = row.packageCode as PackageCode;
    if (!packageAllowsSlotOverride(code)) {
      throw codedForbidden(
        'SUBSCRIPTION_SLOT_OVERRIDE_FORBIDDEN',
        'Listing slot override is only allowed for ŠEF and GAZDA packages',
      );
    }

    if (maxActiveJobsOverride !== null && maxActiveJobsOverride < 1) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'maxActiveJobsOverride must be at least 1',
      );
    }

    const [updated] = await db
      .update(subscriptions)
      .set({
        maxActiveJobsOverride,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, subscriptionId))
      .returning();

    if (!updated) {
      throw codedBadRequest('VALIDATION_FAILED', 'Subscription update failed');
    }

    await db.insert(staffAuditLog).values({
      actorUserId: adminUserId,
      action: 'admin.subscription_max_active_jobs_override',
      entityType: 'subscription',
      entityId: subscriptionId,
      metadata: { maxActiveJobsOverride },
    });

    return this.toSubscriptionResponse(updated);
  }
}
