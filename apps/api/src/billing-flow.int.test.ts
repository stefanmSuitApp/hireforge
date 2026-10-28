// T2.5 billing and promo at the API: purchase → proforma (+PDF) → mark paid →
// invoice → cancel; enterprise activation; every promo rule. NBS is the cached
// rate (seedNbsRate), never the live site.
import type { INestApplication } from '@nestjs/common';
import {
  discountedMinorFromPromo,
  employerProformaDetailSchema,
  employerSubscriptionPurchaseResponseSchema,
  employerSubscriptionsListResponseSchema,
  pendingSubscriptionQueueResponseSchema,
  subscriptionMarkPaidResponseSchema,
} from 'contracts';
import {
  insertCompany,
  insertEmployer,
  insertModerator,
  insertPromoCode,
  insertSubscription,
  type PromoInput,
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
let admin: Actor;
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);

beforeAll(async () => {
  app = await startApp();
  await seedNbsRate('117.1234');
  admin = await signInAs(app.getHttpServer(), 'admin');
});
afterAll(() => stopApp(app));

interface Buyer {
  headers: Record<string, string>;
  companyId: string;
  userId: string;
  moderator: Actor;
}

/** A company in a moderator's pipeline, with a (verified unless told) employer and no plan yet. */
async function buyer({ verified = true } = {}): Promise<Buyer> {
  const mod = await insertModerator();
  const company = await insertCompany({
    salesStatus: 'pipeline',
    assignedModeratorId: mod.id,
  });
  const user = await insertEmployer(company.id, { verified });
  const server = app.getHttpServer();
  return {
    ...(await signIn(server, user)),
    companyId: company.id,
    userId: user.id,
    moderator: { ...mod, ...(await signIn(server, mod)) },
  };
}

const purchase = (b: Buyer, body: Record<string, unknown> = {}) =>
  http(app)
    .post('/api/employer/subscriptions')
    .set(b.headers)
    .send({
      companyId: b.companyId,
      packageCode: 'tezga',
      durationDays: 30,
      currency: 'EUR',
      ...body,
    });

describe('an employer buys a package', () => {
  it('an unverified email cannot buy, and nothing is created', async () => {
    const b = await buyer({ verified: false });
    const res = await purchase(b);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMPLOYER_EMAIL_NOT_VERIFIED');
    const { rows } = await q(
      'select count(*)::int as n from subscriptions where company_id = $1',
      [b.companyId],
    );
    expect(rows[0].n).toBe(0);
  });

  it('a purchase creates a pending subscription and a numbered proforma, matching the contract', async () => {
    const b = await buyer();
    const res = await purchase(b).expect(201);
    const body = employerSubscriptionPurchaseResponseSchema.parse(res.body);
    const sub = (
      await q(
        'select status, price_minor_snapshot, currency_snapshot, proforma_id from subscriptions where company_id = $1',
        [b.companyId],
      )
    ).rows[0];
    expect(sub).toMatchObject({
      status: 'pending_payment',
      price_minor_snapshot: 3700,
      currency_snapshot: 'EUR',
    });
    const proforma = (
      await q('select number, total_minor from proformas where id = $1', [
        sub.proforma_id,
      ])
    ).rows[0];
    expect(proforma.number).toMatch(/^PR-\d{4}\/\d{6}$/);
    expect(proforma.total_minor).toBe(3700);
    expect(JSON.stringify(body)).toContain(sub.proforma_id);
    const events = await q(
      `select 1 from outbox_events where event_type = 'proforma_issued' and payload->>'proformaId' = $1`,
      [sub.proforma_id],
    );
    expect(events.rowCount).toBe(1);
  });

  it('the employer reads the proforma (contract) and downloads its PDF', async () => {
    const b = await buyer();
    await purchase(b).expect(201);
    const list = await http(app)
      .get('/api/employer/subscriptions')
      .set(b.headers)
      .expect(200);
    employerSubscriptionsListResponseSchema.parse(list.body);
    const { rows } = await q(
      'select proforma_id from subscriptions where company_id = $1',
      [b.companyId],
    );
    const id = rows[0].proforma_id as string;
    const detail = await http(app)
      .get(`/api/employer/billing/proformas/${id}`)
      .set(b.headers)
      .expect(200);
    expect(employerProformaDetailSchema.parse(detail.body).number).toMatch(
      /^PR-/,
    );
    const pdf = await http(app)
      .get(`/api/employer/billing/proformas/${id}/pdf`)
      .set(b.headers)
      .buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(pdf.headers['content-type']).toBe('application/pdf');
    expect(pdf.headers['content-disposition']).toMatch(
      /^attachment; filename=/,
    );
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('GAZDA is not sold at checkout', async () => {
    const res = await purchase(await buyer(), { packageCode: 'gazda' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ENTERPRISE_PACKAGE_FORBIDDEN');
  });

  it('a duration without a price is a coded 404', async () => {
    const res = await purchase(await buyer(), { durationDays: 365 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PACKAGE_PRICE_NOT_FOUND');
  });

  it('a malformed purchase is VALIDATION_FAILED', async () => {
    const res = await purchase(await buyer(), { durationDays: 'thirty' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('a moderator marks the proforma paid', () => {
  async function pending(): Promise<{ b: Buyer; subscriptionId: string }> {
    const b = await buyer();
    const res = await purchase(b).expect(201);
    const { rows } = await q(
      'select id from subscriptions where company_id = $1',
      [b.companyId],
    );
    expect(res.status).toBe(201);
    return { b, subscriptionId: rows[0].id };
  }

  it('the pending payment shows in the assigned moderator queue (contract)', async () => {
    const { b, subscriptionId } = await pending();
    const res = await http(app)
      .get('/api/moderator/subscriptions/pending-payment')
      .set(b.moderator.headers)
      .expect(200);
    pendingSubscriptionQueueResponseSchema.parse(res.body);
    expect(JSON.stringify(res.body)).toContain(subscriptionId);
  });

  it('mark paid activates the plan, issues one invoice with the NBS rate, and audits the reference', async () => {
    const { b, subscriptionId } = await pending();
    const res = await http(app)
      .post(`/api/moderator/subscriptions/${subscriptionId}/mark-paid`)
      .set(b.moderator.headers)
      .send({ paymentReference: '97-2026-0001' })
      .expect(201);
    subscriptionMarkPaidResponseSchema.parse(res.body);
    const sub = (
      await q(
        'select status, starts_at, ends_at, invoice_id from subscriptions where id = $1',
        [subscriptionId],
      )
    ).rows[0];
    expect(sub.status).toBe('active');
    expect(sub.ends_at.getTime() - sub.starts_at.getTime()).toBe(
      30 * 86_400_000,
    );
    const inv = (
      await q(
        'select number, total_minor, nbs_rate from invoices where subscription_id = $1',
        [subscriptionId],
      )
    ).rows;
    expect(inv).toHaveLength(1);
    expect(inv[0].number).toMatch(/^RA-\d{4}\/\d{6}$/);
    expect(inv[0].nbs_rate?.rate).toBe('117.1234');
    const audit = await q(
      `select metadata from staff_audit_log where entity_id = $1 and actor_user_id = $2`,
      [subscriptionId, b.moderator.id],
    );
    expect(JSON.stringify(audit.rows)).toContain('97-2026-0001');
    const events = await q(
      `select 1 from outbox_events where event_type = 'invoice_issued' and payload->>'subscriptionId' = $1`,
      [subscriptionId],
    );
    expect(events.rowCount).toBe(1);
  });

  it('marking paid twice keeps one invoice and answers a coded error', async () => {
    const { b, subscriptionId } = await pending();
    const url = `/api/moderator/subscriptions/${subscriptionId}/mark-paid`;
    await http(app).post(url).set(b.moderator.headers).send({}).expect(201);
    const again = await http(app).post(url).set(b.moderator.headers).send({});
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBeTruthy();
    const { rows } = await q(
      'select count(*)::int as n from invoices where subscription_id = $1',
      [subscriptionId],
    );
    expect(rows[0].n).toBe(1);
  });

  it('an admin may mark any company paid', async () => {
    const { subscriptionId } = await pending();
    await http(app)
      .post(`/api/moderator/subscriptions/${subscriptionId}/mark-paid`)
      .set(admin.headers)
      .send({})
      .expect(201);
  });

  it('an admin cancels a plan with a reason, and the audit keeps it', async () => {
    const { subscriptionId } = await pending();
    await http(app)
      .post(`/api/admin/subscriptions/${subscriptionId}/cancel`)
      .set(admin.headers)
      .send({ reason: 'Kupac odustao' })
      .expect(201);
    const { rows } = await q('select status from subscriptions where id = $1', [
      subscriptionId,
    ]);
    expect(rows[0].status).toBe('cancelled');
    const audit = await q(
      'select metadata from staff_audit_log where entity_id = $1',
      [subscriptionId],
    );
    expect(JSON.stringify(audit.rows)).toContain('Kupac odustao');
  });
});

describe('enterprise (GAZDA) plans', () => {
  it('an admin activates a pending GAZDA plan and sets its job cap', async () => {
    const company = await insertCompany();
    const sub = await insertSubscription(company.id, {
      packageCode: 'gazda',
      status: 'pending_payment',
    });
    const queue = await http(app)
      .get('/api/admin/subscriptions/pending-enterprise')
      .set(admin.headers)
      .expect(200);
    expect(JSON.stringify(queue.body)).toContain(sub.id);
    await http(app)
      .post(`/api/admin/subscriptions/${sub.id}/activate`)
      .set(admin.headers)
      .send({})
      .expect(201);
    await http(app)
      .patch(`/api/admin/subscriptions/${sub.id}/max-active-jobs`)
      .set(admin.headers)
      .send({ maxActiveJobsOverride: 25 })
      .expect(200);
    const { rows } = await q(
      'select status, max_active_jobs_override from subscriptions where id = $1',
      [sub.id],
    );
    expect(rows[0]).toEqual({ status: 'active', max_active_jobs_override: 25 });
  });
});

describe('promo codes at checkout', () => {
  const buyWith = async (
    promo: PromoInput,
    body: Record<string, unknown> = {},
  ) => {
    const code = await insertPromoCode(promo);
    const b = await buyer();
    return {
      res: await purchase(b, { promoCode: code.code, ...body }),
      b,
      code,
    };
  };
  const price = async (companyId: string) =>
    (
      await q(
        'select price_minor_snapshot as p, applied_promo_code as c from subscriptions where company_id = $1',
        [companyId],
      )
    ).rows[0];

  it('a percent code discounts the price with the contract math and is recorded', async () => {
    const { res, b, code } = await buyWith({
      discountType: 'percent',
      value: 15,
    });
    expect(res.status).toBe(201);
    expect(await price(b.companyId)).toEqual({
      p: discountedMinorFromPromo(3700, 'percent', 15),
      c: code.code,
    });
    const redeemed = await q(
      'select company_id from promo_redemptions where promo_code_id = $1',
      [code.id],
    );
    expect(redeemed.rows).toEqual([{ company_id: b.companyId }]);
  });

  it('a fixed EUR code takes its amount off a EUR purchase', async () => {
    const { res, b } = await buyWith({
      discountType: 'fixed',
      value: 500,
      currency: 'EUR',
    });
    expect(res.status).toBe(201);
    expect((await price(b.companyId)).p).toBe(3200);
  });

  it('a fixed RSD code is refused on a EUR purchase (Phase B currency fix)', async () => {
    const { res, b } = await buyWith({
      discountType: 'fixed',
      value: 500_000,
      currency: 'RSD',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PROMO_CURRENCY_MISMATCH');
    expect(await price(b.companyId)).toBeUndefined();
  });

  it('a fixed code stored without a currency never applies', async () => {
    const { res } = await buyWith({
      discountType: 'fixed',
      value: 500,
      currency: null,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PROMO_CURRENCY_MISMATCH');
  });

  it('an unknown code is PROMO_CODE_INVALID', async () => {
    const res = await purchase(await buyer(), { promoCode: 'NE-POSTOJI' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PROMO_CODE_INVALID');
  });

  it('a code outside its validity window is PROMO_NOT_ACTIVE', async () => {
    const { res } = await buyWith({
      validFrom: new Date('2020-01-01'),
      validTo: new Date('2020-12-31'),
    });
    expect(res.body.error.code).toBe('PROMO_NOT_ACTIVE');
  });

  it('a code for other packages is PROMO_PACKAGE_INELIGIBLE', async () => {
    const { res } = await buyWith({ applicablePackages: ['sef'] });
    expect(res.body.error.code).toBe('PROMO_PACKAGE_INELIGIBLE');
  });

  it('the per-company cap holds: the same company cannot use a once-per-company code twice', async () => {
    const code = await insertPromoCode({ maxPerCompany: 1 });
    const b = await buyer();
    await purchase(b, { promoCode: code.code }).expect(201);
    const second = await purchase(b, { promoCode: code.code });
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe('PROMO_MAX_PER_COMPANY');
  });

  it('a code at its redemption limit is PROMO_MAX_REDEMPTIONS', async () => {
    const code = await insertPromoCode({ maxRedemptions: 1 });
    await purchase(await buyer(), { promoCode: code.code }).expect(201);
    const res = await purchase(await buyer(), { promoCode: code.code });
    expect(res.body.error.code).toBe('PROMO_MAX_REDEMPTIONS');
    const { rows } = await q(
      'select redemptions_count from promo_codes where id = $1',
      [code.id],
    );
    expect(rows[0].redemptions_count).toBe(1);
  });

  // Known issue (PROGRESS.md step 14): `full_free` doesn't auto-activate yet;
  // the plan waits for a payment of 0. Flip to `it` when it does.
  it.fails(
    'a full_free code activates the plan at once, with no payment to wait for',
    async () => {
      const { res, b } = await buyWith({ discountType: 'full_free', value: 0 });
      expect(res.status).toBe(201);
      const { rows } = await q(
        'select status, price_minor_snapshot from subscriptions where company_id = $1',
        [b.companyId],
      );
      expect(rows[0]).toEqual({ status: 'active', price_minor_snapshot: 0 });
    },
  );
});
