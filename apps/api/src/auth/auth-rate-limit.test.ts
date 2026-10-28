import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { forwardedClientIp } from './auth-rate-limit';

const withHeader = (value: string | string[] | undefined) =>
  ({ headers: { 'x-forwarded-for': value } }) as unknown as Request;

describe('forwardedClientIp', () => {
  it('takes the first address the BFF forwarded', () => {
    expect(forwardedClientIp(withHeader('203.0.113.7, 10.0.0.2'))).toBe(
      '203.0.113.7',
    );
    expect(forwardedClientIp(withHeader(['198.51.100.1', '10.0.0.2']))).toBe(
      '198.51.100.1',
    );
  });

  it('returns null without the header, so IP limits are skipped instead of shared', () => {
    expect(forwardedClientIp(withHeader(undefined))).toBeNull();
    expect(forwardedClientIp(withHeader(' '))).toBeNull();
  });

  it('caps the value so a forged header cannot blow up Redis keys', () => {
    expect(forwardedClientIp(withHeader('x'.repeat(500)))).toHaveLength(64);
  });
});
