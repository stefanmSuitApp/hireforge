import { describe, expect, it } from 'vitest';

import { computeJobExpiresAt } from './job-publish';

const NOW = new Date('2026-10-28T10:00:00.000Z');

describe('computeJobExpiresAt', () => {
  it('sets published_at + subscription duration on first publish', () => {
    expect(computeJobExpiresAt(null, NOW, 30)?.toISOString()).toBe(
      '2026-11-27T10:00:00.000Z',
    );
  });

  it('keeps the original expiry when an edited job is re-published', () => {
    const original = new Date('2026-11-01T00:00:00.000Z');
    expect(computeJobExpiresAt(original, NOW, 30)).toBe(original);
  });

  it('leaves legacy jobs without a subscription non-expiring', () => {
    expect(computeJobExpiresAt(null, NOW, null)).toBeNull();
  });
});
