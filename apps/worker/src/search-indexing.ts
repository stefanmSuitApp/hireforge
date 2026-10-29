import { inArray } from 'drizzle-orm';
import { importPKCS8, SignJWT } from 'jose';

import type { DrizzleDb } from 'database';
import { jobs } from 'database';
import { publicJobsEnabled, type OutboxEventType } from 'shared';

import { workerLog } from './worker-log';

/**
 * Tells search engines when a job page changes, from outbox events:
 * - IndexNow (Bing, Yandex, Seznam, Naver): every changed URL, one batch;
 * - Google Indexing API (supported for JobPosting pages): URL_UPDATED when a
 *   job goes live or expires (the page stays, noindex, no JobPosting),
 *   URL_DELETED when it is unpublished or archived (the page 404s).
 *
 * Off unless configured (`INDEXNOW_KEY`, `GOOGLE_INDEXING_SA_JSON`) and while
 * `PUBLIC_JOBS` is on. Events are queued in memory and flushed in batches on
 * a timer, outside the outbox transaction: a slow or failing engine never
 * blocks the outbox. Failures are retried a few times, logged, then dropped.
 */

type Change = 'updated' | 'deleted';

const CHANGE_BY_EVENT: Partial<Record<OutboxEventType, Change>> = {
  job_published: 'updated',
  job_expired: 'updated',
  job_unpublished: 'deleted',
  job_force_archived: 'deleted',
};

export type SearchIndexingConfig = {
  origin: string;
  locales: readonly string[];
  indexNowKey: string | null;
  google: { clientEmail: string; privateKey: string; tokenUri: string } | null;
};

/** `null` when nothing is configured (or jobs aren't public). */
export function searchIndexingConfigFromEnv(
  env: Record<string, string | undefined> = process.env,
): SearchIndexingConfig | null {
  if (!publicJobsEnabled(env)) return null;
  const origin = (env['APP_PUBLIC_ORIGIN'] || env['NEXT_PUBLIC_APP_URL'] || '')
    .trim()
    .replace(/\/$/, '');
  const indexNowKey = env['INDEXNOW_KEY']?.trim() || null;
  const google = parseGoogleServiceAccount(env['GOOGLE_INDEXING_SA_JSON']);
  if (!origin || (!indexNowKey && !google)) return null;
  const locales = (env['NEXT_PUBLIC_SUPPORTED_LOCALES'] || 'sr,en')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean);
  return { origin, locales, indexNowKey, google };
}

/** Service account key JSON, base64-encoded (env-friendly). */
function parseGoogleServiceAccount(
  raw: string | undefined,
): SearchIndexingConfig['google'] {
  if (!raw?.trim()) return null;
  try {
    const sa = JSON.parse(Buffer.from(raw.trim(), 'base64').toString('utf8'));
    if (
      typeof sa.client_email !== 'string' ||
      typeof sa.private_key !== 'string'
    ) {
      throw new Error('missing client_email / private_key');
    }
    return {
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
      tokenUri: sa.token_uri || 'https://oauth2.googleapis.com/token',
    };
  } catch (e) {
    workerLog('error', 'search_indexing_bad_google_sa', {
      service: 'worker',
      err: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

type Fetch = typeof fetch;
/** Job id → path segment (slug, else id), for the jobs that still exist. */
type LookupSegments = (jobIds: string[]) => Promise<Map<string, string>>;

export function dbJobSegments(db: DrizzleDb): LookupSegments {
  return async (jobIds) => {
    const rows = await db
      .select({ id: jobs.id, slug: jobs.slug })
      .from(jobs)
      .where(inArray(jobs.id, jobIds));
    return new Map(rows.map((r) => [r.id, r.slug ?? r.id]));
  };
}

const RETRY_DELAYS_MS = [1_000, 5_000, 20_000];

async function withRetries(
  what: string,
  attempt: () => Promise<Response>,
  sleep: (ms: number) => Promise<void>,
): Promise<boolean> {
  for (let i = 0; ; i++) {
    let status = 0;
    let err = '';
    try {
      const res = await attempt();
      if (res.ok) return true;
      status = res.status;
      err = (await res.text().catch(() => '')).slice(0, 300);
      // 4xx other than rate limiting won't get better by retrying.
      if (status >= 400 && status < 500 && status !== 429)
        i = RETRY_DELAYS_MS.length;
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    }
    if (i >= RETRY_DELAYS_MS.length) {
      workerLog('warn', 'search_indexing_dropped', {
        service: 'worker',
        target: what,
        status: String(status),
        err,
      });
      return false;
    }
    await sleep(RETRY_DELAYS_MS[i] ?? 0);
  }
}

export function createSearchIndexingNotifier(
  config: SearchIndexingConfig,
  deps: {
    lookupSegments: LookupSegments;
    fetch?: Fetch;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
  },
) {
  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = deps.now ?? Date.now;
  /** Latest change per job wins (published then unpublished → deleted). */
  const pending = new Map<string, Change>();
  let googleToken: { value: string; expiresAt: number } | null = null;
  let flushing: Promise<void> | null = null;

  async function googleAccessToken(): Promise<string> {
    const google = config.google;
    if (!google) throw new Error('google not configured');
    if (googleToken && googleToken.expiresAt > now() + 60_000) {
      return googleToken.value;
    }
    const key = await importPKCS8(google.privateKey, 'RS256');
    const assertion = await new SignJWT({
      scope: 'https://www.googleapis.com/auth/indexing',
    })
      .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
      .setIssuer(google.clientEmail)
      .setAudience(google.tokenUri)
      .setIssuedAt(Math.floor(now() / 1000))
      .setExpirationTime(Math.floor(now() / 1000) + 3600)
      .sign(key);
    const res = await doFetch(google.tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    if (!res.ok) throw new Error(`token HTTP ${res.status}`);
    const body = (await res.json()) as {
      access_token: string;
      expires_in?: number;
    };
    googleToken = {
      value: body.access_token,
      expiresAt: now() + (body.expires_in ?? 3600) * 1000,
    };
    return googleToken.value;
  }

  async function flushNow(): Promise<void> {
    if (pending.size === 0) return;
    const batch = new Map(pending);
    pending.clear();

    let segments: Map<string, string>;
    try {
      segments = await deps.lookupSegments([...batch.keys()]);
    } catch (e) {
      workerLog('warn', 'search_indexing_lookup_failed', {
        service: 'worker',
        err: e instanceof Error ? e.message : String(e),
      });
      return;
    }
    const changes: Array<{ url: string; change: Change }> = [];
    for (const [jobId, change] of batch) {
      const segment = segments.get(jobId);
      if (!segment) continue; // deleted row: nothing left to point at
      for (const locale of config.locales) {
        changes.push({
          url: `${config.origin}/${locale}/jobs/${segment}`,
          change,
        });
      }
    }
    if (changes.length === 0) return;

    if (config.indexNowKey) {
      const host = new URL(config.origin).host;
      const ok = await withRetries(
        'indexnow',
        () =>
          doFetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: { 'content-type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
              host,
              key: config.indexNowKey,
              keyLocation: `${config.origin}/${config.indexNowKey}.txt`,
              urlList: changes.map((c) => c.url),
            }),
          }),
        sleep,
      );
      workerLog(ok ? 'info' : 'warn', 'search_indexing_indexnow', {
        service: 'worker',
        urls: String(changes.length),
        ok: String(ok),
      });
    }

    if (config.google) {
      let sent = 0;
      for (const { url, change } of changes) {
        const ok = await withRetries(
          'google',
          async () =>
            doFetch(
              'https://indexing.googleapis.com/v3/urlNotifications:publish',
              {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  authorization: `Bearer ${await googleAccessToken()}`,
                },
                body: JSON.stringify({
                  url,
                  type: change === 'deleted' ? 'URL_DELETED' : 'URL_UPDATED',
                }),
              },
            ),
          sleep,
        );
        if (ok) sent += 1;
      }
      workerLog('info', 'search_indexing_google', {
        service: 'worker',
        urls: String(changes.length),
        sent: String(sent),
      });
    }
  }

  return {
    /** Synchronous and cheap: safe to call right after an outbox commit. */
    enqueue(eventType: string, payload: unknown): void {
      const change = CHANGE_BY_EVENT[eventType as OutboxEventType];
      const jobId = (payload as { jobId?: unknown } | null)?.jobId;
      if (!change || typeof jobId !== 'string' || !jobId) return;
      pending.set(jobId, change);
    },
    /** Sends what is queued; never throws. Concurrent calls share one run. */
    flush(): Promise<void> {
      flushing ??= flushNow()
        .catch((e) =>
          workerLog('error', 'search_indexing_flush_failed', {
            service: 'worker',
            err: e instanceof Error ? e.message : String(e),
          }),
        )
        .finally(() => {
          flushing = null;
        });
      return flushing;
    },
    pendingCount: () => pending.size,
  };
}

export type SearchIndexingNotifier = ReturnType<
  typeof createSearchIndexingNotifier
>;
