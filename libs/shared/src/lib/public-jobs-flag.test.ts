import { describe, expect, it } from 'vitest';

import { publicJobsEnabled } from './public-jobs-flag';

describe('publicJobsEnabled', () => {
  it('is on when unset or truthy', () => {
    expect(publicJobsEnabled({})).toBe(true);
    expect(publicJobsEnabled({ PUBLIC_JOBS: '' })).toBe(true);
    expect(publicJobsEnabled({ PUBLIC_JOBS: 'true' })).toBe(true);
    expect(publicJobsEnabled({ PUBLIC_JOBS: '1' })).toBe(true);
  });

  it('is off for explicit false values', () => {
    for (const v of ['false', 'FALSE', '0', 'off', ' no ']) {
      expect(publicJobsEnabled({ PUBLIC_JOBS: v })).toBe(false);
    }
  });
});
