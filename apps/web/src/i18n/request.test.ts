import { describe, expect, it, vi } from 'vitest';

// The real helper only loads under the react-server condition; it returns the
// callback as is.
vi.mock('next-intl/server', () => ({
  getRequestConfig: <T>(fn: T) => fn,
}));

describe('i18n request config', () => {
  it('formats dates in Belgrade time on the server too', async () => {
    const { default: getConfig } = await import('./request');
    const config = await getConfig({
      requestLocale: Promise.resolve('sr'),
      locale: undefined,
    } as never);
    expect(config.timeZone).toBe('Europe/Belgrade');
  });
});
