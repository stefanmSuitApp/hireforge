import { describe, expect, it } from 'vitest';

import {
  promoCodeCreateBodySchema,
  promoCodeStringSchema,
  promoDiscountTypeSchema,
} from './promo-codes';

describe('promoCodeStringSchema', () => {
  it('accepts SUMMER-2026 / WELCOME / X1Y2', () => {
    for (const code of ['SUMMER-2026', 'WELCOME', 'X1Y2', 'DEV-LEGION-50']) {
      expect(promoCodeStringSchema.safeParse(code).success).toBe(true);
    }
  });

  it('rejects lowercase, leading/trailing dash, too short', () => {
    for (const bad of [
      'summer',
      '-START',
      'END-',
      'AB',
      'WITH SPACE',
      'WITH_UNDERSCORE',
    ]) {
      expect(promoCodeStringSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe('promoDiscountTypeSchema', () => {
  it('accepts the three documented types', () => {
    for (const t of ['percent', 'fixed', 'full_free']) {
      expect(promoDiscountTypeSchema.safeParse(t).success).toBe(true);
    }
  });

  it('rejects unknown types', () => {
    expect(promoDiscountTypeSchema.safeParse('bogo').success).toBe(false);
  });
});

describe('promoCodeCreateBodySchema', () => {
  it('accepts a valid percent code', () => {
    const result = promoCodeCreateBodySchema.safeParse({
      code: 'SUMMER-2026',
      discountType: 'percent',
      value: 25,
    });
    expect(result.success).toBe(true);
  });

  it('rejects percent with value > 100', () => {
    const result = promoCodeCreateBodySchema.safeParse({
      code: 'OVER',
      discountType: 'percent',
      value: 120,
    });
    expect(result.success).toBe(false);
  });

  it('accepts fixed with arbitrary positive value', () => {
    const result = promoCodeCreateBodySchema.safeParse({
      code: 'FIXED-1000',
      discountType: 'fixed',
      value: 1000,
    });
    expect(result.success).toBe(true);
  });

  it('accepts full_free regardless of value', () => {
    const result = promoCodeCreateBodySchema.safeParse({
      code: 'FREEWEEK',
      discountType: 'full_free',
      value: 0,
    });
    expect(result.success).toBe(true);
  });

  it('rejects validity window with validTo before validFrom', () => {
    const result = promoCodeCreateBodySchema.safeParse({
      code: 'WINDOW',
      discountType: 'fixed',
      value: 500,
      validFrom: '2026-12-01T00:00:00.000Z',
      validTo: '2026-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('accepts applicablePackages limited to known package codes', () => {
    const result = promoCodeCreateBodySchema.safeParse({
      code: 'TEZGA-ONLY',
      discountType: 'percent',
      value: 10,
      applicablePackages: ['tezga'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects applicablePackages with an unknown code', () => {
    const result = promoCodeCreateBodySchema.safeParse({
      code: 'BAD-SCOPE',
      discountType: 'percent',
      value: 10,
      applicablePackages: ['vip'],
    });
    expect(result.success).toBe(false);
  });
});
