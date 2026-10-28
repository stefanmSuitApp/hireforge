import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildCompanyPublicMetadata } from '@/features/companies/lib/company-metadata';
import { buildJobDetailMetadata } from '@/features/jobs/lib/job-detail-metadata';

import { isPublicApiOutage, PublicApiUnavailableError } from './public-jobs';

vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
  setRequestLocale: () => undefined,
}));
vi.mock('@/lib/nest-api-url', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  resolveNestPublicOrigin: () => 'http://api.test',
}));
vi.mock('@/lib/cms-content', () => ({
  fetchCmsEmployerBranding: async () => null,
}));

const jobParams = Promise.resolve({ locale: 'sr', jobRef: 'kuvar-ab12' });
const companyParams = Promise.resolve({ locale: 'sr', slug: 'devlegion' });

function apiAnswers(status: number) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('isPublicApiOutage', () => {
  it.each([
    [{ error: 'fetch failed' }, true],
    [{ error: 'HTTP 502', status: 502 }, true],
    [{ error: 'HTTP 503', status: 503 }, true],
    [{ error: 'HTTP 429', status: 429 }, true],
    [{ error: 'HTTP 404', status: 404 }, false],
    [{ error: 'HTTP 400', status: 400 }, false],
    [{ error: 'missing_api_url' }, false],
  ])('%o → %s', (result, outage) => {
    expect(isPublicApiOutage(result)).toBe(outage);
  });
});

describe('public page metadata while the API is down', () => {
  it('job page: throws (a 5xx) instead of serving noindex', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    await expect(buildJobDetailMetadata(jobParams)).rejects.toBeInstanceOf(
      PublicApiUnavailableError,
    );
  });

  it('job page: a 503 from the API throws too', async () => {
    apiAnswers(503);
    await expect(buildJobDetailMetadata(jobParams)).rejects.toBeInstanceOf(
      PublicApiUnavailableError,
    );
  });

  it('job page: a missing job is still noindex', async () => {
    apiAnswers(404);
    const meta = await buildJobDetailMetadata(jobParams);
    expect(meta.robots).toMatchObject({ index: false });
  });

  it('company page: throws instead of serving noindex', async () => {
    apiAnswers(502);
    await expect(
      buildCompanyPublicMetadata(companyParams),
    ).rejects.toBeInstanceOf(PublicApiUnavailableError);
  });

  it('company page: a missing company is still noindex', async () => {
    apiAnswers(404);
    const meta = await buildCompanyPublicMetadata(companyParams);
    expect(meta.robots).toMatchObject({ index: false });
  });
});
