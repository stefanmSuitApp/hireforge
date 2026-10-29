import type { PublicSitemapResponse } from 'contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadSitemapFiles } from './sitemap-files';

vi.mock('@/lib/nest-api-url', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  resolveNestPublicOrigin: () => 'http://api.test',
}));
const legal = vi.hoisted(() => ({
  pages: [] as Array<{ kind: string; updatedAt: string | null }>,
}));
vi.mock('@/lib/cms-content', () => ({
  fetchCmsEditorialSlugs: async () => [],
  fetchCmsPublishedLegalPages: async () => legal.pages,
}));

function apiLists(jobs: PublicSitemapResponse['jobs']) {
  const body: PublicSitemapResponse = { jobs, companies: [], facets: [] };
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(body)),
  );
}

const pagePaths = async () =>
  (await loadSitemapFiles()).get('pages.xml')?.map((e) => e.path);

afterEach(() => {
  vi.unstubAllGlobals();
  legal.pages = [];
});

describe('loadSitemapFiles', () => {
  it('leaves /jobs out while no job is live (the page is noindex then)', async () => {
    apiLists([]);
    expect(await pagePaths()).toEqual(['', '/employers']);
  });

  it('lists /jobs once a job is live', async () => {
    apiLists([
      { id: 'j1', slug: 'kuvar-ab12', lastmod: '2026-10-29T10:00:00Z' },
    ]);
    expect(await pagePaths()).toEqual(['', '/jobs', '/employers']);
  });

  it('lists published legal pages only', async () => {
    apiLists([]);
    legal.pages = [
      { kind: 'privacy', updatedAt: '2026-10-29T10:00:00Z' },
      { kind: 'terms', updatedAt: null },
    ];
    expect(await pagePaths()).toEqual(['', '/employers', '/privacy', '/terms']);
  });
});
