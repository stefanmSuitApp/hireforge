import { describe, expect, it } from 'vitest';

import { jobsListIndexing } from './jobs-list-metadata';

describe('jobsListIndexing', () => {
  it('keeps the plain list and its pages self-canonical', () => {
    expect(jobsListIndexing({})).toEqual({
      canonicalPath: '/jobs',
      noindex: false,
    });
    expect(jobsListIndexing({ page: '3' })).toEqual({
      canonicalPath: '/jobs?page=3',
      noindex: false,
    });
  });

  it('points city / category filters at their landing page', () => {
    expect(jobsListIndexing({ city: 'beograd' }).canonicalPath).toBe(
      '/jobs/city/beograd',
    );
    expect(
      jobsListIndexing({ city: 'nis', category: 'it', page: '2' })
        .canonicalPath,
    ).toBe('/jobs/category/it/city/nis?page=2');
  });

  it('keeps other permutations out of the index', () => {
    for (const sp of [
      { q: 'react' },
      { workModel: 'remote' },
      { city: 'beograd', easyApply: '1' },
      { postedWithin: '7d' },
      { pageSize: '50' },
    ]) {
      expect(jobsListIndexing(sp).noindex).toBe(true);
    }
  });

  it('ignores the desktop preview selection', () => {
    expect(jobsListIndexing({ job: 'x-ab12' })).toEqual({
      canonicalPath: '/jobs',
      noindex: false,
    });
  });
});
