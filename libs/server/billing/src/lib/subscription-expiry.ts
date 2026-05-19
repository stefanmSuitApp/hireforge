import { and, eq, isNotNull, lt } from 'drizzle-orm';
import { subscriptions } from 'database';
import type { DrizzleDbOrTx } from 'database';

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
