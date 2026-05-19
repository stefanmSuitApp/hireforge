import { describe, expect, it } from 'vitest';

import {
  discountedMinorFromPromo,
  intersectCategoryAllowLists,
  promoAppliesToPackageCode,
  promoWindowContainsNow,
} from './promo-checkout-math';

describe('discountedMinorFromPromo', () => {
  it('full_free zeroes amount', () => {
    expect(discountedMinorFromPromo(500_00, 'full_free', 0)).toBe(0);
  });

  it('percent floors correctly', () => {
    expect(discountedMinorFromPromo(100_00, 'percent', 10)).toBe(90_00);
    expect(discountedMinorFromPromo(99, 'percent', 50)).toBe(49);
  });

  it('fixed subtracts with floor', () => {
    expect(discountedMinorFromPromo(100_00, 'fixed', 30_00)).toBe(70_00);
    expect(discountedMinorFromPromo(10_00, 'fixed', 50_00)).toBe(0);
  });
});

describe('promoWindowContainsNow', () => {
  const mid = new Date('2026-06-15T12:00:00.000Z');

  it('allows when inside bounds', () => {
    expect(
      promoWindowContainsNow(
        new Date('2026-06-01T00:00:00.000Z'),
        new Date('2026-06-30T23:59:59.999Z'),
        mid,
      ),
    ).toBe(true);
  });

  it('rejects before validFrom', () => {
    expect(
      promoWindowContainsNow(new Date('2026-06-20T00:00:00.000Z'), null, mid),
    ).toBe(false);
  });

  it('rejects after validTo', () => {
    expect(
      promoWindowContainsNow(null, new Date('2026-06-01T00:00:00.000Z'), mid),
    ).toBe(false);
  });
});

describe('promoAppliesToPackageCode', () => {
  it('allows all when list missing or empty', () => {
    expect(promoAppliesToPackageCode(null, 'tezga')).toBe(true);
    expect(promoAppliesToPackageCode(undefined, 'tezga')).toBe(true);
    expect(promoAppliesToPackageCode([], 'tezga')).toBe(true);
  });

  it('matches membership', () => {
    expect(promoAppliesToPackageCode(['sljaka'], 'tezga')).toBe(false);
    expect(promoAppliesToPackageCode(['tezga', 'sljaka'], 'sljaka')).toBe(true);
  });
});

describe('intersectCategoryAllowLists', () => {
  it('intersects multiple sets', () => {
    expect(
      intersectCategoryAllowLists([
        ['a', 'b'],
        ['b', 'c'],
      ]),
    ).toEqual(['b']);
  });

  it('returns empty when disjoint', () => {
    expect(intersectCategoryAllowLists([['a'], ['b']])).toEqual([]);
  });
});
