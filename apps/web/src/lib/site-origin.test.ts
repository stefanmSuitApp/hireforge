import { afterEach, describe, expect, it, vi } from 'vitest';

import { absoluteSiteOrigin } from './site-origin';

afterEach(() => vi.unstubAllEnvs());

describe('absoluteSiteOrigin', () => {
  it('prefers the runtime SITE_ORIGIN (staging runs the production image)', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://sljakam.com');
    vi.stubEnv('SITE_ORIGIN', 'https://staging.sljakam.com/');
    expect(absoluteSiteOrigin()).toBe('https://staging.sljakam.com');
  });

  it('falls back to the build-time NEXT_PUBLIC_APP_URL', () => {
    vi.stubEnv('SITE_ORIGIN', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://sljakam.com');
    expect(absoluteSiteOrigin()).toBe('https://sljakam.com');
  });
});
