import type { NbsRate } from 'contracts';
import { nbsRateSchema } from 'contracts';

/** Official NBS middle-rate list (HTML table). Overridable for tests. */
export const NBS_OFFICIAL_MIDDLE_RATE_PAGE_URL =
  'https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate';

/** Redis key for cached {@link NbsRate} JSON (shared across API + worker). */
export const NBS_EUR_RSD_REDIS_KEY = 'hireforge:billing:nbs_eur_rsd_middle:v1';

/** Match migration plan + operator expectation: daily refresh and cache TTL. */
export const NBS_EUR_RSD_CACHE_TTL_SEC = 86_400;

const EUR_MIDDLE_ROW_RE =
  /<td>EUR<\/td>\s*<td>978<\/td>[\s\S]*?<td>1<\/td>\s*<td>([0-9]+,[0-9]+)<\/td>/;

/**
 * Pulls the **middle** RSD amount per 1 EUR from the official NBS HTML (Serbian
 * decimal comma → `.`).
 */
export function extractEurMiddleRateRsdPerEurFromNbsOfficialHtml(
  html: string,
): string {
  const match = EUR_MIDDLE_ROW_RE.exec(html);
  if (!match) {
    throw new Error(
      'nbs_official_html_parse_failed: EUR (978) middle cell not found',
    );
  }
  const normalized = match[1].replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(
      'nbs_official_html_parse_failed: invalid decimal in EUR row',
    );
  }
  return normalized;
}

export async function fetchNbsOfficialMiddleRatePageHtml(
  url: string = NBS_OFFICIAL_MIDDLE_RATE_PAGE_URL,
): Promise<string> {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(
      `nbs_official_fetch_failed: HTTP ${String(res.status)} ${url}`,
    );
  }
  return res.text();
}

function buildNbsRateSnapshot(
  rateDecimal: string,
  sourceUrl: string,
  fetchedAt: Date,
): NbsRate {
  return nbsRateSchema.parse({
    rate: rateDecimal,
    source_url: sourceUrl,
    fetched_at: fetchedAt.toISOString(),
    base_currency: 'EUR',
    target_currency: 'RSD',
  });
}

/** Minimal Redis surface for JSON string caching (use `ioredis` in apps). */
export type RedisStringCache = {
  get(key: string): Promise<string | null>;
  setex(key: string, ttlSec: number, value: string): Promise<unknown>;
};

/**
 * Fetch from NBS, validate, write Redis with {@link NBS_EUR_RSD_CACHE_TTL_SEC}.
 * Intended for the worker refresh job.
 */
export async function refreshNbsMiddleRateCache(
  redis: RedisStringCache,
  options?: { sourceUrl?: string; fetchedAt?: Date },
): Promise<NbsRate> {
  const sourceUrl = options?.sourceUrl ?? NBS_OFFICIAL_MIDDLE_RATE_PAGE_URL;
  const fetchedAt = options?.fetchedAt ?? new Date();
  const html = await fetchNbsOfficialMiddleRatePageHtml(sourceUrl);
  const rateStr = extractEurMiddleRateRsdPerEurFromNbsOfficialHtml(html);
  const snapshot = buildNbsRateSnapshot(rateStr, sourceUrl, fetchedAt);
  await redis.setex(
    NBS_EUR_RSD_REDIS_KEY,
    NBS_EUR_RSD_CACHE_TTL_SEC,
    JSON.stringify(snapshot),
  );
  return snapshot;
}

/**
 * Cache-aside for invoice issuance: Redis hit → parse; miss → live NBS fetch + fill cache.
 */
export async function getCachedNbsMiddleRateOrFetch(
  redis: RedisStringCache | null | undefined,
  options?: { sourceUrl?: string },
): Promise<NbsRate> {
  const sourceUrl = options?.sourceUrl ?? NBS_OFFICIAL_MIDDLE_RATE_PAGE_URL;
  if (redis) {
    const hit = await redis.get(NBS_EUR_RSD_REDIS_KEY);
    if (hit) {
      try {
        const parsed = nbsRateSchema.safeParse(JSON.parse(hit) as unknown);
        if (parsed.success) {
          return parsed.data;
        }
      } catch {
        // treat as miss
      }
    }
  }
  const html = await fetchNbsOfficialMiddleRatePageHtml(sourceUrl);
  const rateStr = extractEurMiddleRateRsdPerEurFromNbsOfficialHtml(html);
  const snapshot = buildNbsRateSnapshot(rateStr, sourceUrl, new Date());
  if (redis) {
    await redis.setex(
      NBS_EUR_RSD_REDIS_KEY,
      NBS_EUR_RSD_CACHE_TTL_SEC,
      JSON.stringify(snapshot),
    );
  }
  return snapshot;
}
