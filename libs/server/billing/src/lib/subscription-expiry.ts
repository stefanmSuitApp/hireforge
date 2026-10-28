import { and, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import {
  promoCodes,
  promoRedemptions,
  proformas,
  staffAuditLog,
  subscriptions,
} from 'database';
import type { DrizzleDb, DrizzleDbOrTx } from 'database';

import { canTransition, type SubscriptionStatus } from 'contracts';

/**
 * Auto-expiry: transitions `active` subscriptions with `ends_at < now()` to `expired`.
 * Idempotent; safe to run on every scheduled tick.
 */
export async function expireSubscriptionsPastEndDate(
  db: DrizzleDbOrTx,
  now: Date = new Date(),
): Promise<number> {
  const from: SubscriptionStatus = 'active';
  const to: SubscriptionStatus = 'expired';
  if (!canTransition(from, to)) {
    throw new Error('subscription expiry transition misconfigured');
  }

  const rows = await db
    .update(subscriptions)
    .set({ status: to, updatedAt: now })
    .where(
      and(
        eq(subscriptions.status, 'active'),
        isNotNull(subscriptions.endsAt),
        lt(subscriptions.endsAt, now),
      ),
    )
    .returning({ id: subscriptions.id });

  return rows.length;
}

/** SSOT §10.5: an unpaid proforma (pending subscription) is abandoned after this. */
export const UNPAID_SUBSCRIPTION_TTL_DAYS = 14;

/**
 * Cancels `pending_payment` subscriptions older than
 * {@link UNPAID_SUBSCRIPTION_TTL_DAYS}: voids their proforma, gives back any
 * promo redemption they consumed, and audits it. Row-locked with
 * SKIP LOCKED, so concurrent worker ticks never process a row twice.
 */
export async function cancelAbandonedUnpaidSubscriptions(
  db: DrizzleDb,
  now: Date = new Date(),
  batchSize = 200,
): Promise<number> {
  if (!canTransition('pending_payment', 'cancelled')) {
    throw new Error('unpaid subscription transition misconfigured');
  }
  const cutoff = new Date(
    now.getTime() - UNPAID_SUBSCRIPTION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  return db.transaction(async (tx) => {
    const stale = await tx
      .select({
        id: subscriptions.id,
        companyId: subscriptions.companyId,
        proformaId: subscriptions.proformaId,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'pending_payment'),
          lt(subscriptions.createdAt, cutoff),
        ),
      )
      .for('update', { skipLocked: true })
      .limit(batchSize);

    for (const sub of stale) {
      await tx
        .update(subscriptions)
        .set({ status: 'cancelled', updatedAt: now })
        .where(eq(subscriptions.id, sub.id));

      if (sub.proformaId) {
        await tx
          .update(proformas)
          .set({ voidedAt: now, updatedAt: now })
          .where(
            and(eq(proformas.id, sub.proformaId), isNull(proformas.voidedAt)),
          );
      }

      // Abandoned checkouts must not use up a campaign's redemptions.
      const released = await tx
        .delete(promoRedemptions)
        .where(eq(promoRedemptions.subscriptionId, sub.id))
        .returning({ promoCodeId: promoRedemptions.promoCodeId });
      for (const r of released) {
        await tx
          .update(promoCodes)
          .set({
            redemptionsCount: sql`greatest(${promoCodes.redemptionsCount} - 1, 0)`,
            updatedAt: now,
          })
          .where(eq(promoCodes.id, r.promoCodeId));
      }

      await tx.insert(staffAuditLog).values({
        actorUserId: null,
        action: 'subscription.auto_cancel_unpaid',
        entityType: 'subscription',
        entityId: sub.id,
        metadata: {
          companyId: sub.companyId,
          proformaId: sub.proformaId,
          releasedPromoRedemptions: released.length,
          ttlDays: UNPAID_SUBSCRIPTION_TTL_DAYS,
        },
      });
    }
    return stale.length;
  });
}
