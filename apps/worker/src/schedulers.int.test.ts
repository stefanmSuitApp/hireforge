// T4.3 what the worker's schedulers run, against real Postgres and Redis with
// stubbed NBS and Sanity: subscription expiry, the NBS middle-rate refresh
// (failure keeps the last rate) and the CMS packages reconcile.
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cmsPackageCodes } from 'contracts';
import { createDb } from 'database';
import {
  expireSubscriptionsPastEndDate,
  getCachedNbsMiddleRateOrFetch,
  NBS_EUR_RSD_REDIS_KEY,
  refreshNbsMiddleRateCache,
} from 'server-billing';
import {
  mapSanityPackageDefinitionDoc,
  upsertPackageMirrorAndAudit,
} from 'server-cms-sync';
import { fakeSanityClient, FIXED_NOW, startNbsStub } from 'testing';
import { insertCompany, insertSubscription, testDb } from 'testing/db';
import { testRedisUrl } from 'testing/redis';

const { db, pool } = createDb(testDb().url);
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);
let redis: Redis;
let nbs: Awaited<ReturnType<typeof startNbsStub>>;

beforeAll(async () => {
  redis = new Redis(testRedisUrl());
  nbs = await startNbsStub('117,2345');
});
afterAll(async () => {
  await redis.quit();
  await nbs.close();
  await pool.end();
});

describe('subscription expiry', () => {
  it('ends active plans past their end date, and only those', async () => {
    const company = await insertCompany();
    const past = await insertSubscription(company.id);
    const current = await insertSubscription(company.id);
    const pending = await insertSubscription(company.id, {
      status: 'pending_payment',
    });
    await q(
      `update subscriptions set ends_at = now() - interval '1 second' where id = $1`,
      [past.id],
    );
    expect(await expireSubscriptionsPastEndDate(db)).toBeGreaterThanOrEqual(1);
    const { rows } = await q(
      'select id, status from subscriptions where id = any($1)',
      [[past.id, current.id, pending.id]],
    );
    const status = Object.fromEntries(rows.map((r) => [r.id, r.status]));
    expect(status).toEqual({
      [past.id]: 'expired',
      [current.id]: 'active',
      [pending.id]: 'pending_payment',
    });
    expect(await expireSubscriptionsPastEndDate(db)).toBe(0);
  });
});

describe('NBS middle rate', () => {
  it('the refresh parses the official page and caches the EUR rate for a day', async () => {
    const snapshot = await refreshNbsMiddleRateCache(redis, {
      sourceUrl: nbs.pageUrl,
      fetchedAt: FIXED_NOW,
    });
    expect(snapshot).toMatchObject({
      rate: '117.2345',
      base_currency: 'EUR',
      target_currency: 'RSD',
    });
    expect(
      JSON.parse((await redis.get(NBS_EUR_RSD_REDIS_KEY)) ?? '{}').rate,
    ).toBe('117.2345');
    const ttl = await redis.ttl(NBS_EUR_RSD_REDIS_KEY);
    expect(ttl).toBeGreaterThan(86_000);
    expect(ttl).toBeLessThanOrEqual(86_400);
  });

  it('when NBS is down, the refresh fails and the last good rate stays in the cache', async () => {
    await refreshNbsMiddleRateCache(redis, { sourceUrl: nbs.pageUrl });
    nbs.fail();
    try {
      await expect(
        refreshNbsMiddleRateCache(redis, { sourceUrl: nbs.pageUrl }),
      ).rejects.toThrow(/nbs_official_fetch_failed/);
      expect(
        JSON.parse((await redis.get(NBS_EUR_RSD_REDIS_KEY)) ?? '{}').rate,
      ).toBe('117.2345');
    } finally {
      nbs.reply({
        status: 200,
        body: (await import('testing')).nbsMiddleRateHtml('117,2345'),
      });
    }
  });

  it('invoicing reads the cached rate and never calls NBS while the cache is warm', async () => {
    await refreshNbsMiddleRateCache(redis, { sourceUrl: nbs.pageUrl });
    const before = nbs.requests.length;
    const rate = await getCachedNbsMiddleRateOrFetch(redis, {
      sourceUrl: nbs.pageUrl,
    });
    expect(rate.rate).toBe('117.2345');
    expect(nbs.requests.length).toBe(before);
  });

  it('a page without the EUR row is a parse error, not a wrong rate', async () => {
    nbs.reply({
      status: 200,
      body: '<html><table><tr><td>USD</td></tr></table></html>',
    });
    try {
      await expect(
        refreshNbsMiddleRateCache(redis, { sourceUrl: nbs.pageUrl }),
      ).rejects.toThrow(/parse_failed/);
    } finally {
      nbs.reply({
        status: 200,
        body: (await import('testing')).nbsMiddleRateHtml('117,2345'),
      });
    }
  });
});

describe('CMS packages reconcile', () => {
  const doc = (code: string, amountMinor: number) => ({
    _id: `packageDefinition.${code}`,
    _type: 'packageDefinition',
    code,
    isActive: true,
    isEnterprise: false,
    displayOrder: 1,
    prices: [{ durationDays: 30, amountMinor, currency: 'EUR' }],
    entitlements: {
      maxActiveJobs: 2,
      maxCitiesUnlimited: false,
      maxCitiesCount: 2,
      maxCharacters: 1000,
      featuredListing: false,
      pngCreative: false,
      socialPublish: false,
      paidSocialAds: false,
      crossborderVisible: false,
      hyperlinksMaxCount: 1,
      editor: {
        bold: true,
        italic: true,
        underline: false,
        headings: false,
        lists: false,
        blockquote: false,
        inline_code: false,
        code_block: false,
        text_align: false,
        image_upload: false,
        embed: false,
        hyperlinks: true,
      },
    },
  });

  it('the documents Sanity returns update the price and entitlement mirror, audited as the reconcile job', async () => {
    const sanity = fakeSanityClient([doc('tezga', 3900), doc('sljaka', 4900)]);
    // The query the worker sends (apps/worker/src/main.ts).
    const docs = await sanity.fetch<unknown[]>(
      '*[_type == "packageDefinition" && code in $codes]',
      {
        codes: [...cmsPackageCodes],
      },
    );
    for (const d of docs) {
      await upsertPackageMirrorAndAudit(db, mapSanityPackageDefinitionDoc(d), {
        source: 'cms_reconcile_job',
      });
    }
    const { rows } = await q(
      `select package_code, amount_minor from package_prices where duration_days = 30 and currency = 'EUR' and package_code in ('tezga', 'sljaka') order by package_code`,
    );
    expect(rows).toEqual([
      { package_code: 'sljaka', amount_minor: 4900 },
      { package_code: 'tezga', amount_minor: 3900 },
    ]);
    const audit = await q(
      `select metadata from staff_audit_log where action = 'cms.package_synced' and entity_id = 'tezga'`,
    );
    expect(audit.rows.at(-1)?.metadata).toEqual({
      actor: 'cms_reconcile_job',
      cmsRef: 'packageDefinition.tezga',
    });
  });

  it('a malformed document is rejected by the mapper before anything is written', () => {
    expect(() =>
      mapSanityPackageDefinitionDoc({ ...doc('tezga', 1), prices: 'free' }),
    ).toThrow(/prices must be an array/);
    expect(() =>
      mapSanityPackageDefinitionDoc({ ...doc('tezga', 1), _type: 'page' }),
    ).toThrow(/packageDefinition/);
  });
});
