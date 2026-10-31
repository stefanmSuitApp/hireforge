// Staff-created employer accounts: staff add an account to a company, the
// person activates it from the invite link, and staff can resend the link.
// Plus the identifier rule for staff-created companies.
import type { INestApplication } from '@nestjs/common';
import { insertCandidate, insertCompany, testDb } from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type Actor,
  http,
  signInAs,
  startApp,
  stopApp,
} from './__harness__/test-app';

let app: INestApplication;
let moderator: Actor;
let otherModerator: Actor;
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);
// Relative in tests (no public origin is configured).
const tokenFrom = (url: string) =>
  new URL(url, 'http://test.local').searchParams.get('token') ?? '';
const userRow = async (email: string) =>
  (
    await q(
      'select id, role, password_hash, email_verified_at, terms_version from users where email = $1',
      [email],
    )
  ).rows[0];

beforeAll(async () => {
  app = await startApp();
  const server = app.getHttpServer();
  [moderator, otherModerator] = await Promise.all([
    signInAs(server, 'moderator'),
    signInAs(server, 'moderator'),
  ]);
});
afterAll(() => stopApp(app));

async function addAccount(companyId: string, email: string, as = moderator) {
  return http(app)
    .post(`/api/moderator/companies/${companyId}/accounts`)
    .set(as.headers)
    .send({ email });
}

describe('staff add an employer account to a company', () => {
  it('links the account at once, without a password, and audits it', async () => {
    const company = await insertCompany();
    const res = await addAccount(company.id, 'Nova.Osoba@Example.com');
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.inviteUrl).toMatch(/\/sr\/accept-invite\?token=/);
    // No Resend key in tests: the link is still returned for staff.
    expect(res.body.emailSent).toBe(false);

    const user = await userRow('nova.osoba@example.com');
    expect(user).toMatchObject({ role: 'employer', password_hash: null });
    const links = await q(
      'select company_id from employers where user_id = $1',
      [user.id],
    );
    expect(links.rows).toEqual([{ company_id: company.id }]);
    const audit = await q(
      'select action from staff_audit_log where entity_id = $1',
      [company.id],
    );
    expect(audit.rows.map((r) => r.action)).toContain(
      'employer_account.invite',
    );

    const detail = await http(app)
      .get(`/api/moderator/companies/${company.id}`)
      .set(moderator.headers);
    expect(detail.body.employers).toEqual([
      expect.objectContaining({
        email: 'nova.osoba@example.com',
        activated: false,
      }),
    ]);
  });

  it("refuses another moderator's company", async () => {
    const company = await insertCompany({
      salesStatus: 'pipeline',
      assignedModeratorId: otherModerator.id,
    });
    const res = await addAccount(company.id, 'tudja@example.com');
    expect(res.status).toBe(403);
    expect(await userRow('tudja@example.com')).toBeUndefined();
  });

  it('refuses an email that already has an account', async () => {
    const company = await insertCompany();
    const candidate = await insertCandidate();
    const res = await addAccount(company.id, candidate.email.toUpperCase());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('STAFF_ACCOUNT_EMAIL_TAKEN');
    expect((await userRow(candidate.email)).role).toBe('candidate');
  });
});

describe('the invited person activates the account', () => {
  it('sets a password once, verifies the email, records the terms and can sign in', async () => {
    const company = await insertCompany();
    const email = 'aktivacija@example.com';
    const { body } = await addAccount(company.id, email);
    const token = tokenFrom(body.inviteUrl);

    // No password yet: sign-in fails.
    const before = await http(app)
      .post('/api/auth/employer/login')
      .send({ email, password: 'Aktivacija9!' });
    expect(before.status).toBe(401);

    const accept = await http(app).post('/api/auth/invite/accept').send({
      token,
      password: 'Aktivacija9!',
      acceptedTermsVersion: '2026-10-01',
    });
    expect(accept.status, JSON.stringify(accept.body)).toBe(201);
    const user = await userRow(email);
    expect(user.password_hash).not.toBeNull();
    expect(user.email_verified_at).not.toBeNull();
    expect(user.terms_version).toBe('2026-10-01');

    const again = await http(app)
      .post('/api/auth/invite/accept')
      .send({ token, password: 'Drugacija9!' });
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('AUTH_TOKEN_INVALID');

    const login = await http(app)
      .post('/api/auth/employer/login')
      .send({ email, password: 'Aktivacija9!' });
    expect(login.status).toBe(201);

    const detail = await http(app)
      .get(`/api/moderator/companies/${company.id}`)
      .set(moderator.headers);
    expect(detail.body.employers[0].activated).toBe(true);
  });

  it('a password-reset token is not an invite', async () => {
    const company = await insertCompany();
    const { body } = await addAccount(company.id, 'pogresan@example.com');
    const reset = await http(app)
      .post('/api/auth/password-reset/confirm')
      .send({ token: tokenFrom(body.inviteUrl), password: 'Aktivacija9!' });
    expect(reset.status).toBe(400);
  });
});

describe('staff resend an invite', () => {
  it('voids the old link; the new one works', async () => {
    const company = await insertCompany();
    const first = await addAccount(company.id, 'ponovo@example.com');
    const resend = await http(app)
      .post(
        `/api/moderator/companies/${company.id}/accounts/${first.body.userId}/invite`,
      )
      .set(moderator.headers)
      .send({ locale: 'en' });
    expect(resend.status, JSON.stringify(resend.body)).toBe(201);
    expect(resend.body.inviteUrl).toMatch(/\/en\/accept-invite\?token=/);

    const old = await http(app)
      .post('/api/auth/invite/accept')
      .send({ token: tokenFrom(first.body.inviteUrl), password: 'Ponovo999!' });
    expect(old.status).toBe(400);
    const fresh = await http(app)
      .post('/api/auth/invite/accept')
      .send({
        token: tokenFrom(resend.body.inviteUrl),
        password: 'Ponovo999!',
      });
    expect(fresh.status).toBe(201);

    const afterActive = await http(app)
      .post(
        `/api/moderator/companies/${company.id}/accounts/${first.body.userId}/invite`,
      )
      .set(moderator.headers)
      .send({});
    expect(afterActive.status).toBe(409);
    expect(afterActive.body.error.code).toBe('ACCOUNT_ALREADY_ACTIVE');
  });

  it("is refused for someone who isn't in that company", async () => {
    const [mine, other] = await Promise.all([insertCompany(), insertCompany()]);
    const { body } = await addAccount(other.id, 'drugde@example.com');
    const res = await http(app)
      .post(
        `/api/moderator/companies/${mine.id}/accounts/${body.userId}/invite`,
      )
      .set(moderator.headers)
      .send({});
    expect(res.status).toBe(404);
  });
});

describe('staff-created companies', () => {
  it('need no PIB or MB: the company fills them in when it signs up', async () => {
    const res = await http(app)
      .post('/api/moderator/companies')
      .set(moderator.headers)
      .send({ slug: 'bez-pib-a', legalName: 'Bez PIB-a d.o.o.' });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
  });

  it('accept a foreign company with a VAT ID', async () => {
    const res = await http(app)
      .post('/api/moderator/companies')
      .set(moderator.headers)
      .send({
        slug: 'strana-gmbh',
        legalName: 'Strana GmbH',
        isForeign: true,
        countryCode: 'DE',
        vatId: 'DE123456789',
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
  });
});
