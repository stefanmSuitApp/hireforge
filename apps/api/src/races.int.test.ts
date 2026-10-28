// T3.4 races, as real parallel requests against real Postgres: whoever loses
// gets a clean 4xx, never a 500, and the database holds exactly one result.
import type { INestApplication } from '@nestjs/common';
import {
  insertCandidate,
  insertCompany,
  insertEmployer,
  insertJob,
  insertJoinRequest,
  insertModerator,
  insertPromoCode,
  insertSubscription,
  testDb,
} from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type Actor,
  http,
  seedNbsRate,
  signIn,
  signInAs,
  startApp,
  stopApp,
} from './__harness__/test-app';

let app: INestApplication;
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);
const count = async (sql: string, params: unknown[]) =>
  (await q(sql, params)).rows[0].n as number;
const ROUNDS = 5;

beforeAll(async () => {
  app = await startApp();
  await seedNbsRate();
});
afterAll(() => stopApp(app));

/** One winner with `ok`, every other answer a 4xx: never two winners, never a crash. */
function oneWinner(statuses: number[], ok: number) {
  expect(
    statuses.filter((s) => s === ok),
    `statuses ${statuses}`,
  ).toHaveLength(1);
  for (const s of statuses.filter((x) => x !== ok)) {
    expect(s, `statuses ${statuses}`).toBeGreaterThanOrEqual(400);
    expect(s, `statuses ${statuses}`).toBeLessThan(500);
  }
}

describe('two staff act on the same thing at once', () => {
  let mods: Actor[];
  beforeAll(async () => {
    mods = await Promise.all([
      signInAs(app.getHttpServer(), 'moderator'),
      signInAs(app.getHttpServer(), 'moderator'),
    ]);
  });

  it(`two moderators publish the same job: one wins, one gets a coded refusal (${ROUNDS} rounds)`, async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const company = await insertCompany();
      const sub = await insertSubscription(company.id);
      const author = await insertEmployer(company.id);
      const job = await insertJob(company.id, author.id, {
        status: 'submitted',
        subscriptionId: sub.id,
      });
      const results = await Promise.all(
        mods.map((m) =>
          http(app)
            .post(`/api/moderator/jobs/${job.id}/publish`)
            .set(m.headers),
        ),
      );
      oneWinner(
        results.map((r) => r.status),
        201,
      );
      const loser = results.find((r) => r.status !== 201);
      expect(loser?.body.error.code).toBe('JOB_INVALID_STATE');
      expect(
        await count(
          `select count(*)::int as n from outbox_events where event_type = 'job_published' and payload->>'jobId' = $1`,
          [job.id],
        ),
      ).toBe(1);
    }
  });

  it(`the assigned moderator and an admin mark the same proforma paid: one invoice (${ROUNDS} rounds)`, async () => {
    const admin = await signInAs(app.getHttpServer(), 'admin');
    for (let round = 0; round < ROUNDS; round++) {
      const mod = await insertModerator();
      const modSession = await signIn(app.getHttpServer(), mod);
      const company = await insertCompany({
        salesStatus: 'pipeline',
        assignedModeratorId: mod.id,
      });
      const sub = await insertSubscription(company.id, {
        status: 'pending_payment',
      });
      const results = await Promise.all(
        [modSession.headers, admin.headers].map((h) =>
          http(app)
            .post(`/api/moderator/subscriptions/${sub.id}/mark-paid`)
            .set(h)
            .send({}),
        ),
      );
      oneWinner(
        results.map((r) => r.status),
        201,
      );
      expect(
        await count(
          'select count(*)::int as n from invoices where subscription_id = $1',
          [sub.id],
        ),
      ).toBe(1);
    }
  });

  it('two moderators decide the same join request: one decision stands', async () => {
    const company = await insertCompany();
    const user = await insertCandidate();
    await q(`update users set role = 'employer' where id = $1`, [user.id]);
    const request = await insertJoinRequest(user.id, company.id);
    const results = await Promise.all([
      http(app)
        .post(`/api/moderator/company-join-requests/${request}/approve`)
        .set(mods[0]?.headers ?? {}),
      http(app)
        .post(`/api/moderator/company-join-requests/${request}/reject`)
        .set(mods[1]?.headers ?? {}),
    ]);
    oneWinner(
      results.map((r) => r.status),
      201,
    );
    const memberships = await count(
      'select count(*)::int as n from employers where user_id = $1',
      [user.id],
    );
    const { rows } = await q(
      'select status from company_join_requests where id = $1',
      [request],
    );
    expect(memberships).toBe(rows[0].status === 'approved' ? 1 : 0);
  });
});

describe('promo limits under parallel checkouts', () => {
  async function verifiedBuyer(companyId?: string) {
    const company = companyId ?? (await insertCompany()).id;
    const user = await insertEmployer(company);
    return { companyId: company, ...(await signIn(app.getHttpServer(), user)) };
  }

  it(`a once-per-company code used by two employers of one company at once: one redemption (${ROUNDS} rounds)`, async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const code = await insertPromoCode({ maxPerCompany: 1 });
      const first = await verifiedBuyer();
      const second = await verifiedBuyer(first.companyId);
      const results = await Promise.all(
        [first, second].map((b) =>
          http(app).post('/api/employer/subscriptions').set(b.headers).send({
            companyId: b.companyId,
            packageCode: 'tezga',
            durationDays: 30,
            currency: 'EUR',
            promoCode: code.code,
          }),
        ),
      );
      oneWinner(
        results.map((r) => r.status),
        201,
      );
      expect(
        await count(
          'select count(*)::int as n from promo_redemptions where promo_code_id = $1',
          [code.id],
        ),
      ).toBe(1);
    }
  });

  it('a code with one redemption left, used by three companies at once: one redemption', async () => {
    const code = await insertPromoCode({ maxRedemptions: 1 });
    const buyers = await Promise.all([
      verifiedBuyer(),
      verifiedBuyer(),
      verifiedBuyer(),
    ]);
    const results = await Promise.all(
      buyers.map((b) =>
        http(app).post('/api/employer/subscriptions').set(b.headers).send({
          companyId: b.companyId,
          packageCode: 'tezga',
          durationDays: 30,
          currency: 'EUR',
          promoCode: code.code,
        }),
      ),
    );
    oneWinner(
      results.map((r) => r.status),
      201,
    );
    const { rows } = await q(
      'select redemptions_count from promo_codes where id = $1',
      [code.id],
    );
    expect(rows[0].redemptions_count).toBe(1);
  });
});

describe('a candidate double-clicks Apply', () => {
  it(`two parallel applications to one job: one is stored (${ROUNDS} rounds)`, async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const company = await insertCompany();
      const author = await insertEmployer(company.id);
      const job = await insertJob(company.id, author.id, {
        status: 'published',
      });
      const candidate = await insertCandidate();
      const session = await signIn(app.getHttpServer(), candidate);
      await http(app)
        .post('/api/candidate/resumes')
        .set(session.headers)
        .attach('file', Buffer.from('%PDF-1.4\n%%EOF\n'), {
          filename: 'cv.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);
      const results = await Promise.all(
        [1, 2].map(() =>
          http(app)
            .post('/api/candidate/applications')
            .set(session.headers)
            .send({ jobId: job.id }),
        ),
      );
      oneWinner(
        results.map((r) => r.status),
        201,
      );
      expect(
        await count(
          'select count(*)::int as n from applications where job_id = $1',
          [job.id],
        ),
      ).toBe(1);
    }
  });
});

describe('two people sign up the same new company at once', () => {
  const company = (pib: string, mb: string) => ({
    isForeign: false,
    countryCode: 'RS',
    legalName: `Ista Firma ${pib} d.o.o.`,
    pib,
    mb,
    addressLine1: 'Ulica 1',
    addressPostalCode: '11000',
    addressCity: 'Beograd',
    billingEmail: 'racuni@ista.rs',
    billingContactName: 'Ista Osoba',
  });

  // Known issue (PROGRESS.md): both requests see no company with that PIB, both
  // insert, and the loser hits companies_pib_unique → unhandled 500 instead of
  // becoming a join request. Flip to `it` when sign-up handles the race.
  it.fails(
    'one creates the company, the other becomes a pending join request — no 500',
    async () => {
      const results = await Promise.all(
        ['prvi', 'drugi'].map((who) =>
          http(app)
            .post('/api/auth/employer/register')
            .send({
              email: `${who}-istovremeno@primer.rs`,
              password: 'Lozinka-123',
              company: company('109000001', '23900001'),
            }),
        ),
      );
      expect(results.map((r) => r.status)).toEqual([201, 201]);
      expect(
        await count(
          `select count(*)::int as n from companies where pib = '109000001'`,
          [],
        ),
      ).toBe(1);
      expect(
        await count(
          `select count(*)::int as n from company_join_requests r join companies c on c.id = r.company_id where c.pib = '109000001'`,
          [],
        ),
      ).toBe(1);
    },
  );

  it('whatever happens, there is never a second company with the same PIB', async () => {
    await Promise.all(
      ['treci', 'cetvrti'].map((who) =>
        http(app)
          .post('/api/auth/employer/register')
          .send({
            email: `${who}-istovremeno@primer.rs`,
            password: 'Lozinka-123',
            company: company('109000002', '23900002'),
          }),
      ),
    );
    expect(
      await count(
        `select count(*)::int as n from companies where pib = '109000002'`,
        [],
      ),
    ).toBe(1);
  });
});
