// T5.1 NBS middle rate: fetch, parse, cache-aside. The page is the HTTP stub,
// the cache an in-memory map, so this runs without Docker.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { FIXED_NOW, nbsMiddleRateHtml, startNbsStub } from 'testing';
import {
  extractEurMiddleRateRsdPerEurFromNbsOfficialHtml,
  fetchNbsOfficialMiddleRatePageHtml,
  getCachedNbsMiddleRateOrFetch,
  NBS_EUR_RSD_CACHE_TTL_SEC,
  NBS_EUR_RSD_REDIS_KEY,
  NBS_OFFICIAL_MIDDLE_RATE_PAGE_URL,
  refreshNbsMiddleRateCache,
  type RedisStringCache,
} from './nbs-middle-rate';

function memoryCache(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const ttls = new Map<string, number>();
  const cache: RedisStringCache & { store: typeof store; ttls: typeof ttls } = {
    store,
    ttls,
    get: async (k) => store.get(k) ?? null,
    setex: async (k, ttl, v) => {
      store.set(k, v);
      ttls.set(k, ttl);
      return 'OK';
    },
  };
  return cache;
}

let nbs: Awaited<ReturnType<typeof startNbsStub>>;
beforeAll(async () => {
  nbs = await startNbsStub('117,1500');
});
afterAll(() => nbs.close());

describe('parsing the NBS page', () => {
  it('reads the EUR middle rate with a Serbian decimal comma', () => {
    expect(
      extractEurMiddleRateRsdPerEurFromNbsOfficialHtml(
        nbsMiddleRateHtml('117,0045'),
      ),
    ).toBe('117.0045');
  });

  it('refuses a malformed number in the EUR row', () => {
    expect(() =>
      extractEurMiddleRateRsdPerEurFromNbsOfficialHtml(
        nbsMiddleRateHtml('117,00,45'),
      ),
    ).toThrow(/parse_failed/);
  });
});

describe('fetching the NBS page', () => {
  it('returns the page body on 200', async () => {
    expect(await fetchNbsOfficialMiddleRatePageHtml(nbs.pageUrl)).toContain(
      '<td>EUR</td>',
    );
  });

  it('throws with the status on an error page', async () => {
    nbs.reply({ status: 502, body: 'bad gateway' });
    try {
      await expect(
        fetchNbsOfficialMiddleRatePageHtml(nbs.pageUrl),
      ).rejects.toThrow('nbs_official_fetch_failed: HTTP 502');
    } finally {
      nbs.reply({ status: 200, body: nbsMiddleRateHtml('117,1500') });
    }
  });
});

describe('the refresh job', () => {
  it('stores the snapshot for a day with source and time', async () => {
    const cache = memoryCache();
    const snap = await refreshNbsMiddleRateCache(cache, {
      sourceUrl: nbs.pageUrl,
      fetchedAt: FIXED_NOW,
    });
    expect(snap).toEqual({
      rate: '117.1500',
      source_url: nbs.pageUrl,
      fetched_at: FIXED_NOW.toISOString(),
      base_currency: 'EUR',
      target_currency: 'RSD',
    });
    expect(JSON.parse(cache.store.get(NBS_EUR_RSD_REDIS_KEY) ?? '{}')).toEqual(
      snap,
    );
    expect(cache.ttls.get(NBS_EUR_RSD_REDIS_KEY)).toBe(
      NBS_EUR_RSD_CACHE_TTL_SEC,
    );
  });
});

describe('cache-aside for invoices', () => {
  const cached = {
    rate: '116.9000',
    source_url: 'https://nbs.test',
    fetched_at: '2026-01-15T09:00:00.000Z',
    base_currency: 'EUR',
    target_currency: 'RSD',
  };

  it('a cache hit never calls NBS', async () => {
    const before = nbs.requests.length;
    const rate = await getCachedNbsMiddleRateOrFetch(
      memoryCache({ [NBS_EUR_RSD_REDIS_KEY]: JSON.stringify(cached) }),
      {
        sourceUrl: nbs.pageUrl,
      },
    );
    expect(rate).toEqual(cached);
    expect(nbs.requests.length).toBe(before);
  });

  it('a miss fetches, and fills the cache', async () => {
    const cache = memoryCache();
    const rate = await getCachedNbsMiddleRateOrFetch(cache, {
      sourceUrl: nbs.pageUrl,
    });
    expect(rate.rate).toBe('117.1500');
    expect(cache.store.has(NBS_EUR_RSD_REDIS_KEY)).toBe(true);
  });

  it('a corrupt or wrongly shaped cache entry counts as a miss', async () => {
    for (const bad of ['{not json', JSON.stringify({ rate: 'x' })]) {
      const rate = await getCachedNbsMiddleRateOrFetch(
        memoryCache({ [NBS_EUR_RSD_REDIS_KEY]: bad }),
        { sourceUrl: nbs.pageUrl },
      );
      expect(rate.rate).toBe('117.1500');
    }
  });

  it('without a cache it still fetches', async () => {
    expect(
      (await getCachedNbsMiddleRateOrFetch(null, { sourceUrl: nbs.pageUrl }))
        .rate,
    ).toBe('117.1500');
  });
});

describe('defaults', () => {
  it('without options both calls read the official NBS page (fetch stubbed, nothing leaves the machine)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () =>
          new Response(nbsMiddleRateHtml('118,0000'), { status: 200 }),
      );
    try {
      const snap = await refreshNbsMiddleRateCache(memoryCache());
      expect(snap.source_url).toBe(NBS_OFFICIAL_MIDDLE_RATE_PAGE_URL);
      expect((await getCachedNbsMiddleRateOrFetch(memoryCache())).rate).toBe(
        '118.0000',
      );
      expect(fetchSpy.mock.calls.map((c) => String(c[0]))).toEqual([
        NBS_OFFICIAL_MIDDLE_RATE_PAGE_URL,
        NBS_OFFICIAL_MIDDLE_RATE_PAGE_URL,
      ]);
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
