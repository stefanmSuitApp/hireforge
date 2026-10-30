import {
  expect,
  request,
  test,
  type APIRequestContext,
} from '@playwright/test';

import {
  jobPublishTimes,
  jobSlug,
  SEED_ADMIN_EMAIL,
  SEED_EMPLOYER_VERIFIED,
  SEED_MODERATOR,
  SEED_PASSWORD,
} from './support/db';
import { expectEmail } from './support/mail';
import { resetRateLimits, seedNbsRateCache } from './support/redis';
import { API_ORIGIN } from './support/ports';

const API = `${API_ORIGIN}/api/`;
const DAY_MS = 24 * 60 * 60 * 1000;

test.beforeEach(async () => {
  await resetRateLimits();
  await seedNbsRateCache();
});

async function as(
  path: 'auth/employer/login' | 'auth/staff/login',
  email: string,
): Promise<APIRequestContext> {
  const anon = await request.newContext({ baseURL: API });
  const res = await anon.post(path, {
    data: { email, password: SEED_PASSWORD },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const { accessToken } = (await res.json()) as { accessToken: string };
  await anon.dispose();
  return request.newContext({
    baseURL: API,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Buys TEZGA 30d and has the assigned moderator mark it paid → active. */
async function activeSubscription(
  employer: APIRequestContext,
  moderator: APIRequestContext,
): Promise<string> {
  const purchase = await employer.post('employer/subscriptions', {
    data: {
      companyId: SEED_EMPLOYER_VERIFIED.companyId,
      packageCode: 'tezga',
      durationDays: 30,
      currency: 'EUR',
    },
  });
  expect(purchase.ok(), await purchase.text()).toBeTruthy();
  const { subscription } = (await purchase.json()) as {
    subscription: { id: string };
  };
  const paid = await moderator.post(
    `moderator/subscriptions/${subscription.id}/mark-paid`,
    { data: {} },
  );
  expect(paid.ok(), await paid.text()).toBeTruthy();
  return subscription.id;
}

function jobDraft(title: string) {
  return {
    title,
    description: 'Tražimo iskusnog programera za rad u timu u Beogradu.',
    citySlug: 'beograd',
    categorySlug: 'informacione-tehnologije',
    workModel: 'onsite',
    employmentType: 'full_time',
    seniority: 'mid',
  };
}

async function submittedJob(
  employer: APIRequestContext,
  subscriptionId: string,
  title: string,
): Promise<string> {
  const draft = await employer.post('employer/jobs', {
    data: { ...jobDraft(title), subscriptionId },
  });
  expect(draft.ok(), await draft.text()).toBeTruthy();
  const { id } = (await draft.json()) as { id: string };
  const submit = await employer.post(`employer/jobs/${id}/submit`);
  expect(submit.ok(), await submit.text()).toBeTruthy();
  return id;
}

test('publishing needs an active package and sets expiry from its duration', async () => {
  const employer = await as(
    'auth/employer/login',
    SEED_EMPLOYER_VERIFIED.email,
  );
  const moderator = await as('auth/staff/login', SEED_MODERATOR.email);
  const admin = await as('auth/staff/login', SEED_ADMIN_EMAIL);

  // 1) Package cancelled between submit and approval → cannot go live.
  const cancelledSub = await activeSubscription(employer, moderator);
  const orphanJob = await submittedJob(employer, cancelledSub, 'Programer A');
  const cancel = await admin.post(
    `admin/subscriptions/${cancelledSub}/cancel`,
    {
      data: {},
    },
  );
  expect(cancel.ok(), await cancel.text()).toBeTruthy();
  const refused = await moderator.post(`moderator/jobs/${orphanJob}/publish`);
  expect(refused.status()).toBe(400);
  expect(await refused.text()).toContain('JOB_SUBSCRIPTION_NOT_ACTIVE');
  expect((await jobPublishTimes(orphanJob)).status).toBe('submitted');

  // 2) Approved job expires published_at + 30 days (the package duration).
  const sub = await activeSubscription(employer, moderator);
  const job = await submittedJob(employer, sub, 'Programer B');
  const published = await moderator.post(`moderator/jobs/${job}/publish`);
  expect(published.ok(), await published.text()).toBeTruthy();
  const times = await jobPublishTimes(job);
  expect(times.status).toBe('published');
  expect(times.publishedAt).not.toBeNull();
  expect(times.expiresAt).not.toBeNull();
  expect(
    (times.expiresAt as Date).getTime() - (times.publishedAt as Date).getTime(),
  ).toBe(30 * DAY_MS);

  // The employer is told the listing is live.
  await expectEmail(
    SEED_EMPLOYER_VERIFIED.email,
    /oglas je objavljen: Programer B/,
  );

  // 3) Editing the live job sends it back to review; after re-approval the
  //    short id is kept and the old URL still resolves to the job.
  const firstSlug = (await jobSlug(job)) ?? '';
  expect(firstSlug).toMatch(/-[a-z0-9]{4}$/);
  const edited = await employer.patch(`employer/jobs/${job}`, {
    data: { ...jobDraft('Programer B senior inženjer'), subscriptionId: sub },
  });
  expect(edited.ok(), await edited.text()).toBeTruthy();
  const republished = await moderator.post(`moderator/jobs/${job}/publish`);
  expect(republished.ok(), await republished.text()).toBeTruthy();
  const secondSlug = (await jobSlug(job)) ?? '';
  expect(secondSlug).not.toBe(firstSlug);
  expect(secondSlug.slice(-5)).toBe(firstSlug.slice(-5));
  // Signed in: this package has no featured perk, so guests get a teaser.
  const oldLink = await moderator.get(`public/jobs/by-slug/${firstSlug}`);
  expect(oldLink.ok(), await oldLink.text()).toBeTruthy();
  expect(((await oldLink.json()) as { slug: string }).slug).toBe(secondSlug);

  // 4) Search finds the live job the way people type Serbian: without
  //    diacritics and in Cyrillic (title is "Programer B senior inženjer").
  const anonSearch = await request.newContext({ baseURL: API });
  for (const q of ['inzenjer', 'ПРОГРАМЕР инжењер', 'INŽENJER']) {
    const res = await anonSearch.get(`public/jobs?q=${encodeURIComponent(q)}`);
    expect(res.ok(), await res.text()).toBeTruthy();
    const ids = ((await res.json()) as { items: { id: string }[] }).items.map(
      (i) => i.id,
    );
    expect(ids, `search "${q}"`).toContain(job);
  }
  await anonSearch.dispose();

  // 5) A second approval of the same job is refused, not re-applied.
  const again = await moderator.post(`moderator/jobs/${job}/publish`);
  expect(again.status()).toBeGreaterThanOrEqual(400);

  await Promise.all([employer.dispose(), moderator.dispose(), admin.dispose()]);
});
