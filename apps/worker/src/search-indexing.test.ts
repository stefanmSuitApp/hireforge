import { generateKeyPairSync } from 'node:crypto';

import { decodeJwt } from 'jose';
import { describe, expect, it, vi } from 'vitest';

import {
  createSearchIndexingNotifier,
  searchIndexingConfigFromEnv,
  type SearchIndexingConfig,
} from './search-indexing';

const ORIGIN = 'https://sljakam.com';

function fakeFetch(statuses: number[] = []) {
  const calls: Array<{ url: string; body: string; auth?: string }> = [];
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    calls.push({
      url: u,
      body: String(init?.body ?? ''),
      auth: (init?.headers as Record<string, string> | undefined)?.[
        'authorization'
      ],
    });
    if (u.includes('oauth2')) {
      return new Response(
        JSON.stringify({ access_token: 'tok', expires_in: 3600 }),
      );
    }
    return new Response('', { status: statuses.shift() ?? 200 });
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

/** Every job is featured except `plain`; `gone` was deleted. */
const lookup = async (ids: string[]) =>
  new Map(
    ids
      .filter((id) => id !== 'gone')
      .map((id) => [
        id,
        { segment: `${id}-slug-ab12`, featured: id !== 'plain' },
      ]),
  );
const noSleep = async () => undefined;

const indexNowOnly: SearchIndexingConfig = {
  origin: ORIGIN,
  locales: ['sr', 'en'],
  indexNowKey: 'k3y-k3y-k3y',
  google: null,
};

describe('searchIndexingConfigFromEnv', () => {
  it('is off without keys, without an origin, or with PUBLIC_JOBS=false', () => {
    expect(
      searchIndexingConfigFromEnv({ NEXT_PUBLIC_APP_URL: ORIGIN }),
    ).toBeNull();
    expect(searchIndexingConfigFromEnv({ INDEXNOW_KEY: 'k' })).toBeNull();
    expect(
      searchIndexingConfigFromEnv({
        NEXT_PUBLIC_APP_URL: ORIGIN,
        INDEXNOW_KEY: 'k',
        PUBLIC_JOBS: 'false',
      }),
    ).toBeNull();
    expect(
      searchIndexingConfigFromEnv({
        NEXT_PUBLIC_APP_URL: `${ORIGIN}/`,
        INDEXNOW_KEY: 'k',
      }),
    ).toMatchObject({ origin: ORIGIN, indexNowKey: 'k', google: null });
  });

  it('ignores a malformed service account instead of crashing', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(
      searchIndexingConfigFromEnv({
        NEXT_PUBLIC_APP_URL: ORIGIN,
        GOOGLE_INDEXING_SA_JSON: 'not-base64-json',
      }),
    ).toBeNull();
    log.mockRestore();
  });
});

describe('createSearchIndexingNotifier', () => {
  it('batches every locale URL of changed jobs into one IndexNow call', async () => {
    const f = fakeFetch();
    const n = createSearchIndexingNotifier(indexNowOnly, {
      lookupSegments: lookup,
      fetch: f.fn,
      sleep: noSleep,
    });
    n.enqueue('job_published', { jobId: 'a' });
    n.enqueue('job_expired', { jobId: 'b' });
    n.enqueue('application_submitted', { jobId: 'c' }); // not a page change
    n.enqueue('job_published', { jobId: 'gone' }); // row deleted meanwhile
    await n.flush();

    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]?.url).toBe('https://api.indexnow.org/indexnow');
    expect(JSON.parse(f.calls[0]?.body ?? '{}')).toEqual({
      host: 'sljakam.com',
      key: 'k3y-k3y-k3y',
      keyLocation: `${ORIGIN}/k3y-k3y-k3y.txt`,
      urlList: [
        `${ORIGIN}/sr/jobs/a-slug-ab12`,
        `${ORIGIN}/en/jobs/a-slug-ab12`,
        `${ORIGIN}/sr/jobs/b-slug-ab12`,
        `${ORIGIN}/en/jobs/b-slug-ab12`,
      ],
    });
    expect(n.pendingCount()).toBe(0);
  });

  it('retries server errors, then drops without throwing', async () => {
    const f = fakeFetch([503, 503, 503, 503]);
    const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const n = createSearchIndexingNotifier(indexNowOnly, {
      lookupSegments: lookup,
      fetch: f.fn,
      sleep: noSleep,
    });
    n.enqueue('job_published', { jobId: 'a' });
    await expect(n.flush()).resolves.toBeUndefined();
    expect(f.calls).toHaveLength(4); // first try + 3 retries
    warn.mockRestore();
    log.mockRestore();
  });

  it('does not retry a rejected request (4xx)', async () => {
    const f = fakeFetch([422]);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const n = createSearchIndexingNotifier(indexNowOnly, {
      lookupSegments: lookup,
      fetch: f.fn,
      sleep: noSleep,
    });
    n.enqueue('job_published', { jobId: 'a' });
    await n.flush();
    expect(f.calls).toHaveLength(1);
    log.mockRestore();
    err.mockRestore();
  });

  it('tells Google URL_UPDATED / URL_DELETED with a signed service-account token', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const f = fakeFetch();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const n = createSearchIndexingNotifier(
      {
        ...indexNowOnly,
        locales: ['sr'],
        indexNowKey: null,
        google: {
          clientEmail: 'indexer@project.iam.gserviceaccount.com',
          privateKey: privateKey
            .export({ type: 'pkcs8', format: 'pem' })
            .toString(),
          tokenUri: 'https://oauth2.googleapis.com/token',
        },
      },
      { lookupSegments: lookup, fetch: f.fn, sleep: noSleep },
    );
    n.enqueue('job_published', { jobId: 'a' });
    n.enqueue('job_unpublished', { jobId: 'b' });
    // Not featured: guests get sign-in there, so it must leave the index.
    n.enqueue('job_published', { jobId: 'plain' });
    await n.flush();

    const token = f.calls.find((c) => c.url.includes('oauth2'));
    const assertion = new URLSearchParams(token?.body).get('assertion') ?? '';
    expect(decodeJwt(assertion)).toMatchObject({
      iss: 'indexer@project.iam.gserviceaccount.com',
      scope: 'https://www.googleapis.com/auth/indexing',
      aud: 'https://oauth2.googleapis.com/token',
    });
    const pings = f.calls.filter((c) => c.url.includes('indexing.googleapis'));
    expect(pings.map((p) => JSON.parse(p.body))).toEqual([
      { url: `${ORIGIN}/sr/jobs/a-slug-ab12`, type: 'URL_UPDATED' },
      { url: `${ORIGIN}/sr/jobs/b-slug-ab12`, type: 'URL_DELETED' },
      { url: `${ORIGIN}/sr/jobs/plain-slug-ab12`, type: 'URL_DELETED' },
    ]);
    expect(pings.every((p) => p.auth === 'Bearer tok')).toBe(true);
    // One token for the whole batch.
    expect(f.calls.filter((c) => c.url.includes('oauth2'))).toHaveLength(1);
    log.mockRestore();
  });

  it('keeps only the latest change per job', async () => {
    const f = fakeFetch();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const n = createSearchIndexingNotifier(indexNowOnly, {
      lookupSegments: lookup,
      fetch: f.fn,
      sleep: noSleep,
    });
    n.enqueue('job_published', { jobId: 'a' });
    n.enqueue('job_unpublished', { jobId: 'a' });
    expect(n.pendingCount()).toBe(1);
    await n.flush();
    expect(JSON.parse(f.calls[0]?.body ?? '{}').urlList).toHaveLength(2);
    log.mockRestore();
  });
});
