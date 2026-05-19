import { intersectCategoryAllowLists } from 'contracts';
import { eq } from 'drizzle-orm';
import type { DrizzleDbOrTx } from 'database';
import { jobCategories, promoCodes, promoRedemptions } from 'database';

import { codedBadRequest } from '../http/coded-http';

export async function assertPromoJobCategoryAllowed(
  db: DrizzleDbOrTx,
  params: {
    subscriptionId: string | null | undefined;
    categoryId: string | null | undefined;
  },
): Promise<void> {
  const { subscriptionId, categoryId } = params;
  if (!subscriptionId) {
    return;
  }

  const rows = await db
    .select({ cats: promoCodes.applicableCategories })
    .from(promoRedemptions)
    .innerJoin(promoCodes, eq(promoRedemptions.promoCodeId, promoCodes.id))
    .where(eq(promoRedemptions.subscriptionId, subscriptionId));

  const restrictive: string[][] = [];
  for (const r of rows) {
    const c = r.cats;
    if (c && c.length > 0) {
      restrictive.push([...c]);
    }
  }

  if (restrictive.length === 0) {
    return;
  }

  const allowed = intersectCategoryAllowLists(restrictive);
  if (allowed.length === 0) {
    throw codedBadRequest(
      'PROMO_CATEGORY_RULE_CONFLICT',
      'Promotional category rules conflict for this subscription; contact support.',
      undefined,
    );
  }

  if (!categoryId) {
    throw codedBadRequest(
      'PROMO_JOB_CATEGORY_REQUIRED',
      'This subscription requires a job category that matches the promotional offer.',
      undefined,
    );
  }

  const [cat] = await db
    .select({ slug: jobCategories.slug })
    .from(jobCategories)
    .where(eq(jobCategories.id, categoryId))
    .limit(1);

  if (!cat) {
    throw codedBadRequest(
      'PROMO_JOB_CATEGORY_REQUIRED',
      'Job category is missing or invalid for this promotional subscription.',
      undefined,
    );
  }

  if (!allowed.includes(cat.slug)) {
    throw codedBadRequest(
      'PROMO_JOB_CATEGORY_MISMATCH',
      'This job category is not allowed for the promotional subscription you used.',
      undefined,
    );
  }
}
