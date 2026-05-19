import type { PromoDiscountType } from './promo-codes';

/** Discounted catalogue minor units after applying a promo row (floor at 0). */
export function discountedMinorFromPromo(
  baseMinor: number,
  discountType: PromoDiscountType,
  value: number,
): number {
  if (discountType === 'full_free') {
    return 0;
  }
  if (discountType === 'percent') {
    return Math.max(0, Math.floor((baseMinor * (100 - value)) / 100));
  }
  if (discountType === 'fixed') {
    return Math.max(0, baseMinor - value);
  }
  return baseMinor;
}

/** Whether `now` falls inside `[validFrom, validTo]` when bounds are present. */
export function promoWindowContainsNow(
  validFrom: Date | null,
  validTo: Date | null,
  now: Date,
): boolean {
  if (validFrom && now < validFrom) {
    return false;
  }
  if (validTo && now > validTo) {
    return false;
  }
  return true;
}

/** `NULL`/empty applicable list ⇒ all packages. */
export function promoAppliesToPackageCode(
  applicablePackages: string[] | null | undefined,
  packageCode: string,
): boolean {
  if (!applicablePackages || applicablePackages.length === 0) {
    return true;
  }
  return applicablePackages.includes(packageCode);
}

/**
 * Intersection of allowed category slug sets from multiple restrictive promos.
 * Call only when each entry is a non-empty slug list.
 */
export function intersectCategoryAllowLists(sets: string[][]): string[] {
  if (sets.length === 0) {
    return [];
  }
  let acc = new Set(sets[0]);
  for (let i = 1; i < sets.length; i++) {
    const next = new Set(sets[i]);
    acc = new Set([...acc].filter((x) => next.has(x)));
  }
  return [...acc];
}
