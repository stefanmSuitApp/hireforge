import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  analyticsRecordsPath,
  clarityProjectId,
  parseAnalyticsConsent,
} from './analytics-consent';

describe('analyticsRecordsPath', () => {
  it.each([
    '/',
    '/jobs',
    '/jobs/kuvar-beograd-ab12',
    '/jobs/city/beograd',
    '/jobs/category/it/city/nis',
    '/companies/devlegion',
    '/employers',
    '/about',
    '/p/kako-radi',
    '/privacy',
    '/candidate/register',
    '/employer/register',
  ])('records the public page %s', (path) => {
    expect(analyticsRecordsPath(path)).toBe(true);
  });

  it.each([
    '/jobs/kuvar-beograd-ab12/apply',
    '/candidate',
    '/candidate/profile',
    '/candidate/login',
    '/employer',
    '/employer/jobs/new',
    '/employer/packages',
    '/employer/billing/proforma/1',
    '/employer/pending',
    '/moderator',
    '/moderator/login',
    '/admin/users',
    '/sign-in',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/integration',
  ])('never records %s', (path) => {
    expect(analyticsRecordsPath(path)).toBe(false);
  });
});

describe('parseAnalyticsConsent', () => {
  it('accepts only the two choices', () => {
    expect(parseAnalyticsConsent('granted')).toBe('granted');
    expect(parseAnalyticsConsent('denied')).toBe('denied');
    expect(parseAnalyticsConsent('yes')).toBeNull();
    expect(parseAnalyticsConsent(undefined)).toBeNull();
  });
});

describe('clarityProjectId', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is off without a valid id', () => {
    vi.stubEnv('CLARITY_PROJECT_ID', '');
    expect(clarityProjectId()).toBeNull();
    vi.stubEnv('CLARITY_PROJECT_ID', 'abc"/><script>');
    expect(clarityProjectId()).toBeNull();
  });

  it('returns a valid id', () => {
    vi.stubEnv('CLARITY_PROJECT_ID', ' t8k2m4p9qz ');
    expect(clarityProjectId()).toBe('t8k2m4p9qz');
  });
});
