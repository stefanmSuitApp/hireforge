import { afterEach, describe, expect, it, vi } from 'vitest';

import { withAcceptedTerms } from './accepted-terms';

const legal = vi.hoisted(() => ({
  pages: [] as Array<{ kind: string; effectiveFrom: string | null }>,
}));
vi.mock('@/lib/cms-content', () => ({
  fetchCmsPublishedLegalPages: async () => legal.pages,
}));

afterEach(() => {
  legal.pages = [];
});

describe('withAcceptedTerms', () => {
  it('adds the published terms version and ignores one sent by the client', async () => {
    legal.pages = [
      { kind: 'privacy', effectiveFrom: '2026-10-01' },
      { kind: 'terms', effectiveFrom: '2026-11-01' },
    ];
    expect(
      await withAcceptedTerms({
        email: 'a@b.rs',
        acceptedTermsVersion: '1999-01-01',
      }),
    ).toEqual({ email: 'a@b.rs', acceptedTermsVersion: '2026-11-01' });
  });

  it('records nothing while terms or privacy are unpublished', async () => {
    legal.pages = [{ kind: 'terms', effectiveFrom: '2026-11-01' }];
    expect(
      await withAcceptedTerms({
        email: 'a@b.rs',
        acceptedTermsVersion: '2026-11-01',
      }),
    ).toEqual({ email: 'a@b.rs' });
  });
});
