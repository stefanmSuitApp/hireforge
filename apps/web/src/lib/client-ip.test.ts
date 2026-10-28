import { describe, expect, it } from 'vitest';

import { clientIpFromHeaders, forwardClientIpHeaders } from './client-ip';

describe('clientIpFromHeaders', () => {
  it('returns null without X-Forwarded-For', () => {
    expect(clientIpFromHeaders(new Headers())).toBeNull();
  });

  it('takes the right-most hop (the one Caddy appended), not a spoofed left entry', () => {
    const h = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7' });
    expect(clientIpFromHeaders(h)).toBe('203.0.113.7');
  });

  it('handles a single IPv6 address', () => {
    const h = new Headers({ 'x-forwarded-for': '2a01:4f8::1' });
    expect(clientIpFromHeaders(h)).toBe('2a01:4f8::1');
  });
});

describe('forwardClientIpHeaders', () => {
  it('omits the header when no client IP is known', () => {
    expect(forwardClientIpHeaders(new Headers())).toEqual({});
  });

  it('forwards exactly one address', () => {
    const h = new Headers({ 'x-forwarded-for': '1.1.1.1, 198.51.100.2' });
    expect(forwardClientIpHeaders(h)).toEqual({
      'X-Forwarded-For': '198.51.100.2',
    });
  });
});
