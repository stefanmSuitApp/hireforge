import { describe, expect, it } from 'vitest';

import {
  canTransition,
  subscriptionPurchaseRequestSchema,
  subscriptionStatuses,
} from './subscriptions';

describe('canTransition', () => {
  it('allows pending_payment → active', () => {
    expect(canTransition('pending_payment', 'active')).toBe(true);
  });

  it('allows pending_payment → cancelled', () => {
    expect(canTransition('pending_payment', 'cancelled')).toBe(true);
  });

  it('allows active → expired and active → cancelled', () => {
    expect(canTransition('active', 'expired')).toBe(true);
    expect(canTransition('active', 'cancelled')).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition('expired', 'active')).toBe(false);
    expect(canTransition('cancelled', 'active')).toBe(false);
    expect(canTransition('active', 'pending_payment')).toBe(false);
  });

  it('rejects no-op self-transitions', () => {
    for (const status of subscriptionStatuses) {
      expect(canTransition(status, status)).toBe(false);
    }
  });
});

describe('subscriptionPurchaseRequestSchema', () => {
  it('accepts a valid request', () => {
    const result = subscriptionPurchaseRequestSchema.safeParse({
      companyId: '00000000-0000-4000-8000-000000000001',
      packageCode: 'tezga',
      durationDays: 30,
      currency: 'EUR',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown package code', () => {
    const result = subscriptionPurchaseRequestSchema.safeParse({
      companyId: '00000000-0000-4000-8000-000000000001',
      packageCode: 'vip',
      durationDays: 30,
      currency: 'EUR',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive duration', () => {
    const result = subscriptionPurchaseRequestSchema.safeParse({
      companyId: '00000000-0000-4000-8000-000000000001',
      packageCode: 'tezga',
      durationDays: 0,
      currency: 'EUR',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional promoCode and uppercases', () => {
    const result = subscriptionPurchaseRequestSchema.safeParse({
      companyId: '00000000-0000-4000-8000-000000000001',
      packageCode: 'tezga',
      durationDays: 30,
      currency: 'EUR',
      promoCode: 'nedelja-free',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.promoCode).toBe('NEDELJA-FREE');
    }
  });

  it('treats empty promoCode as omitted', () => {
    const result = subscriptionPurchaseRequestSchema.safeParse({
      companyId: '00000000-0000-4000-8000-000000000001',
      packageCode: 'tezga',
      durationDays: 30,
      currency: 'EUR',
      promoCode: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.promoCode).toBeUndefined();
    }
  });
});
