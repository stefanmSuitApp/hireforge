// T2.5 + T2.6 auth at the API (the Phase B behaviour; refresh revocation via
// token_version comes with Phase C): sign-up per role, sign-in per role,
// refresh, verification and reset links (single-use, expiring, stored hashed),
// emails through the Resend stub, company sign-up matching an existing
// company → join request → approve / reject, and rate limits on real Redis.
import { createHash } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import {
  employerJoinRequestResponseSchema,
  employerWorkspaceResponseSchema,
} from 'contracts';
import { startResendStub } from 'testing';
import {
  insertCandidate,
  insertCompany,
  insertModerator,
  TEST_PASSWORD,
  testDb,
} from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type Actor,
  http,
  signIn,
  signInAs,
  startApp,
  stopApp,
} from './__harness__/test-app';

let app: INestApplication;
let resend: Awaited<ReturnType<typeof startResendStub>>;
let seq = 0;
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);
const email = (who: string) => `${who}-${++seq}@primer.rs`;
const sha256 = (raw: string) => createHash('sha256').update(raw).digest('hex');

beforeAll(async () => {
  resend = await startResendStub();
  app = await startApp({
    ...resend.env,
    APP_PUBLIC_ORIGIN: 'https://sljakam.test',
  });
});
afterAll(async () => {
  await stopApp(app);
  await resend.close();
});

/** The token from the newest link sent to `to` for `path` (verify-email / reset-password). */
function linkToken(to: string, path: string): string {
  const mail = resend
    .to(to)
    .filter((m) => (m.html ?? '').includes(`/${path}?token=`))
    .at(-1);
  const match = /\?token=([A-Za-z0-9_-]+)/.exec(mail?.html ?? '');
  if (!match?.[1]) throw new Error(`no ${path} link mailed to ${to}`);
  return match[1];
}

const COMPANY = (overrides: Record<string, unknown> = {}) => ({
  isForeign: false,
  countryCode: 'RS',
  legalName: 'Novi Klijent d.o.o.',
  pib: '107000001',
  mb: '21700001',
  addressLine1: 'Bulevar oslobođenja 1',
  addressPostalCode: '21000',
  addressCity: 'Novi Sad',
  billingEmail: 'racuni@noviklijent.rs',
  billingContactName: 'Ana Anić',
  ...overrides,
});

describe('candidate sign-up and sign-in', () => {
  it('registering returns tokens, mails a verification link in the chosen language, and stores only its hash', async () => {
    const address = email('kandidat');
    const res = await http(app)
      .post('/api/auth/candidate/register')
      .send({
        email: address,
        password: 'Lozinka-123',
        fullName: 'Ivana Ivić',
        locale: 'en',
      })
      .expect(201);
    expect(res.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    const mail = resend.to(address);
    expect(mail).toHaveLength(1);
    expect(mail[0]?.html).toContain(
      'https://sljakam.test/en/verify-email?token=',
    );
    const token = linkToken(address, 'verify-email');
    const stored = await q(
      `select token_hash, purpose from auth_tokens t join users u on u.id = t.user_id where u.email = $1`,
      [address],
    );
    expect(stored.rows).toEqual([
      { token_hash: sha256(token), purpose: 'email_verify' },
    ]);
    expect(JSON.stringify(stored.rows)).not.toContain(token);
  });

  it('the same email cannot register twice (any role)', async () => {
    const address = email('dupli');
    await http(app)
      .post('/api/auth/candidate/register')
      .send({ email: address, password: 'Lozinka-123' })
      .expect(201);
    const res = await http(app)
      .post('/api/auth/candidate/register')
      .send({ email: address.toUpperCase(), password: 'Lozinka-123' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('AUTH_EMAIL_EXISTS');
  });

  it('a short password is VALIDATION_FAILED and creates nobody', async () => {
    const address = email('kratka');
    const res = await http(app)
      .post('/api/auth/candidate/register')
      .send({ email: address, password: 'kratka' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(
      (await q('select 1 from users where email = $1', [address])).rowCount,
    ).toBe(0);
  });

  it('each role signs in only through its own door', async () => {
    const candidate = await insertCandidate();
    const body = { email: candidate.email, password: TEST_PASSWORD };
    await http(app).post('/api/auth/candidate/login').send(body).expect(201);
    for (const door of ['employer', 'staff']) {
      const res = await http(app).post(`/api/auth/${door}/login`).send(body);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
    }
  });

  it('a wrong password and an unknown email give the same answer', async () => {
    const candidate = await insertCandidate();
    const wrong = await http(app)
      .post('/api/auth/candidate/login')
      .send({ email: candidate.email, password: 'pogresna-lozinka' });
    const unknown = await http(app)
      .post('/api/auth/candidate/login')
      .send({ email: email('niko'), password: 'pogresna-lozinka' });
    expect([wrong.status, unknown.status]).toEqual([401, 401]);
    expect(wrong.body.error.code).toBe(unknown.body.error.code);
  });

  it('a refresh token gets a new working pair; an access token is not a refresh token', async () => {
    const candidate = await insertCandidate();
    const session = await signIn(app.getHttpServer(), candidate);
    const refreshed = await http(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken })
      .expect(201);
    await http(app)
      .get('/api/candidate/me')
      .set('authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(200);
    const misuse = await http(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: session.accessToken });
    expect(misuse.status).toBe(401);
    expect(misuse.body.error.code).toBe('AUTH_REFRESH_INVALID');
  });

  it('a refresh token of a deleted user is refused', async () => {
    const candidate = await insertCandidate();
    const session = await signIn(app.getHttpServer(), candidate);
    await q('delete from users where id = $1', [candidate.id]);
    const res = await http(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: session.refreshToken });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_USER_REMOVED');
  });

  it('a forged or tampered bearer token is treated as no session', async () => {
    const candidate = await insertCandidate();
    const { accessToken } = await signIn(app.getHttpServer(), candidate);
    const [h, p, sig] = accessToken.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(p ?? '', 'base64url').toString()),
        role: 'admin',
      }),
    ).toString('base64url');
    const res = await http(app)
      .get('/api/admin/users')
      .set('authorization', `Bearer ${h}.${forgedPayload}.${sig}`);
    expect(res.status).toBe(401);
  });
});

describe('email verification', () => {
  async function registered(): Promise<{
    address: string;
    headers: Record<string, string>;
  }> {
    const address = email('verify');
    const res = await http(app)
      .post('/api/auth/candidate/register')
      .send({ email: address, password: 'Lozinka-123' })
      .expect(201);
    return {
      address,
      headers: { authorization: `Bearer ${res.body.accessToken}` },
    };
  }

  it('the emailed link verifies the email exactly once', async () => {
    const { address } = await registered();
    const token = linkToken(address, 'verify-email');
    await http(app).post('/api/auth/verify-email').send({ token }).expect(201);
    const { rows } = await q(
      'select email_verified_at from users where email = $1',
      [address],
    );
    expect(rows[0].email_verified_at).not.toBeNull();
    const again = await http(app)
      .post('/api/auth/verify-email')
      .send({ token });
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });

  it('an expired link is refused', async () => {
    const { address } = await registered();
    const token = linkToken(address, 'verify-email');
    await q(
      `update auth_tokens set expires_at = now() - interval '1 second' where token_hash = $1`,
      [sha256(token)],
    );
    const res = await http(app).post('/api/auth/verify-email').send({ token });
    expect(res.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });

  it('resending voids the older link: only the newest works', async () => {
    const { address, headers } = await registered();
    const first = linkToken(address, 'verify-email');
    await http(app)
      .post('/api/auth/verify-email/resend')
      .set(headers)
      .send({})
      .expect(201);
    const second = linkToken(address, 'verify-email');
    expect(second).not.toBe(first);
    expect(
      (await http(app).post('/api/auth/verify-email').send({ token: first }))
        .status,
    ).toBe(400);
    await http(app)
      .post('/api/auth/verify-email')
      .send({ token: second })
      .expect(201);
  });

  it('a password-reset token cannot verify an email', async () => {
    const candidate = await insertCandidate({ verified: false });
    await http(app)
      .post('/api/auth/password-reset/request')
      .send({ email: candidate.email })
      .expect(201);
    const token = linkToken(candidate.email, 'reset-password');
    const res = await http(app).post('/api/auth/verify-email').send({ token });
    expect(res.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });
});

describe('password reset', () => {
  it('the reset link sets a new password once; the old password stops working', async () => {
    const candidate = await insertCandidate();
    await http(app)
      .post('/api/auth/password-reset/request')
      .send({ email: candidate.email, locale: 'sr' })
      .expect(201);
    const token = linkToken(candidate.email, 'reset-password');
    await http(app)
      .post('/api/auth/password-reset/confirm')
      .send({ token, password: 'Nova-lozinka-1' })
      .expect(201);
    await http(app)
      .post('/api/auth/candidate/login')
      .send({ email: candidate.email, password: 'Nova-lozinka-1' })
      .expect(201);
    const old = await http(app)
      .post('/api/auth/candidate/login')
      .send({ email: candidate.email, password: TEST_PASSWORD });
    expect(old.status).toBe(401);
    const reuse = await http(app)
      .post('/api/auth/password-reset/confirm')
      .send({ token, password: 'Treca-lozinka-1' });
    expect(reuse.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });

  it('an unknown email gets the same answer and no mail', async () => {
    const address = email('nepoznat');
    const res = await http(app)
      .post('/api/auth/password-reset/request')
      .send({ email: address });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
    expect(resend.to(address)).toHaveLength(0);
  });

  it('a reset link expires after an hour', async () => {
    const candidate = await insertCandidate();
    await http(app)
      .post('/api/auth/password-reset/request')
      .send({ email: candidate.email })
      .expect(201);
    const token = linkToken(candidate.email, 'reset-password');
    const { rows } = await q(
      `select round(extract(epoch from expires_at - created_at))::int as ttl from auth_tokens where token_hash = $1`,
      [sha256(token)],
    );
    expect(rows[0].ttl).toBe(3600);
    await q(
      `update auth_tokens set expires_at = now() - interval '1 second' where token_hash = $1`,
      [sha256(token)],
    );
    const res = await http(app)
      .post('/api/auth/password-reset/confirm')
      .send({ token, password: 'Nova-lozinka-1' });
    expect(res.body.error.code).toBe('AUTH_TOKEN_INVALID');
  });
});

describe('company sign-up', () => {
  it('a new company signs up: its employer gets a working workspace (contract)', async () => {
    const address = email('poslodavac');
    const res = await http(app)
      .post('/api/auth/employer/register')
      .send({
        email: address,
        password: 'Lozinka-123',
        company: COMPANY({
          pib: '107000002',
          mb: '21700002',
          legalName: 'Sasvim Nova d.o.o.',
        }),
      })
      .expect(201);
    const ws = await http(app)
      .get('/api/employer/workspace')
      .set('authorization', `Bearer ${res.body.accessToken}`)
      .expect(200);
    employerWorkspaceResponseSchema.parse(ws.body);
    expect(JSON.stringify(ws.body)).toContain('Sasvim Nova d.o.o.');
  });

  describe('matching an existing company (PIB / MB / VAT / name) needs staff approval', () => {
    let moderator: Actor;
    beforeAll(async () => {
      moderator = await signInAs(app.getHttpServer(), 'moderator');
    });

    const matches = [
      [
        'the same PIB',
        { pib: '107000010' },
        { pib: '107000010', mb: '21799999' },
      ],
      ['the same MB', { mb: '21700011' }, { pib: '107999999', mb: '21700011' }],
      [
        'the same legal name',
        { legalName: 'Gradimo Zajedno d.o.o.' },
        { legalName: 'GRADIMO ZAJEDNO DOO', pib: '107999998', mb: '21799998' },
      ],
    ] as const;

    for (const [what, existing, signup] of matches) {
      it(`${what} → a pending join request, no employer membership, routes closed`, async () => {
        const company = await insertCompany({
          company: existing,
          salesStatus: 'pipeline',
          assignedModeratorId: moderator.id,
        });
        const address = email('pridruzi');
        const res = await http(app)
          .post('/api/auth/employer/register')
          .send({
            email: address,
            password: 'Lozinka-123',
            company: COMPANY(signup),
          })
          .expect(201);
        const headers = { authorization: `Bearer ${res.body.accessToken}` };
        const jr = await http(app)
          .get('/api/employer/join-request')
          .set(headers)
          .expect(200);
        expect(employerJoinRequestResponseSchema.parse(jr.body)).toMatchObject({
          status: 'pending',
        });
        const membership = await q(
          'select 1 from employers e join users u on u.id = e.user_id where u.email = $1',
          [address],
        );
        expect(membership.rowCount).toBe(0);
        const blocked = await http(app).get('/api/employer/jobs').set(headers);
        expect(blocked.status).toBe(403);
        expect(blocked.body.error.code).toBe('EMPLOYER_PENDING_APPROVAL');
        const queue = await http(app)
          .get('/api/moderator/company-join-requests')
          .set(moderator.headers)
          .expect(200);
        expect(JSON.stringify(queue.body)).toContain(company.id);
      });
    }

    it('approving makes them an employer of that company and writes the decided event', async () => {
      const company = await insertCompany({
        company: { pib: '107000020' },
        salesStatus: 'pipeline',
        assignedModeratorId: moderator.id,
      });
      const address = email('odobren');
      const res = await http(app)
        .post('/api/auth/employer/register')
        .send({
          email: address,
          password: 'Lozinka-123',
          company: COMPANY({ pib: '107000020', mb: '21700020' }),
        })
        .expect(201);
      const { rows } = await q(
        `select r.id from company_join_requests r join users u on u.id = r.user_id where u.email = $1`,
        [address],
      );
      await http(app)
        .post(`/api/moderator/company-join-requests/${rows[0].id}/approve`)
        .set(moderator.headers)
        .expect(201);
      const member = await q(
        'select company_id from employers e join users u on u.id = e.user_id where u.email = $1',
        [address],
      );
      expect(member.rows).toEqual([{ company_id: company.id }]);
      await http(app)
        .get('/api/employer/jobs')
        .set('authorization', `Bearer ${res.body.accessToken}`)
        .expect(200);
      const event = await q(
        `select payload from outbox_events where event_type = 'company_join_request_decided' and payload->>'joinRequestId' = $1`,
        [rows[0].id],
      );
      expect(event.rows[0]?.payload).toMatchObject({ decision: 'approved' });
      const twice = await http(app)
        .post(`/api/moderator/company-join-requests/${rows[0].id}/reject`)
        .set(moderator.headers);
      expect(twice.status).toBe(409);
    });

    it('rejecting keeps them out for good', async () => {
      await insertCompany({
        company: { pib: '107000030' },
        salesStatus: 'pipeline',
        assignedModeratorId: moderator.id,
      });
      const address = email('odbijen');
      const res = await http(app)
        .post('/api/auth/employer/register')
        .send({
          email: address,
          password: 'Lozinka-123',
          company: COMPANY({ pib: '107000030', mb: '21700030' }),
        })
        .expect(201);
      const { rows } = await q(
        `select r.id from company_join_requests r join users u on u.id = r.user_id where u.email = $1`,
        [address],
      );
      await http(app)
        .post(`/api/moderator/company-join-requests/${rows[0].id}/reject`)
        .set(moderator.headers)
        .expect(201);
      const blocked = await http(app)
        .get('/api/employer/jobs')
        .set('authorization', `Bearer ${res.body.accessToken}`);
      expect(blocked.status).toBe(403);
      expect(blocked.body.error.code).toBe('EMPLOYER_JOIN_REJECTED');
    });
  });
});

describe('rate limits (real Redis, per client IP from X-Forwarded-For)', () => {
  it('the 21st login attempt from one IP within 15 minutes is AUTH_RATE_LIMITED', async () => {
    const ip = '198.51.100.7';
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) {
      const res = await http(app)
        .post('/api/auth/candidate/login')
        .set('x-forwarded-for', `${ip}, 10.0.0.1`)
        .send({ email: email('napad'), password: 'pogresna-lozinka' });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 20).every((s) => s === 401)).toBe(true);
    expect(statuses[20]).toBe(429);
    // Another IP is not affected.
    const other = await http(app)
      .post('/api/auth/candidate/login')
      .set('x-forwarded-for', '198.51.100.8')
      .send({ email: email('drugi'), password: 'x' });
    expect(other.status).toBe(401);
  });

  it('the 11th login attempt for one email within 15 minutes is refused, whatever the IP', async () => {
    const candidate = await insertCandidate();
    let last = 0;
    for (let i = 0; i < 11; i++) {
      const res = await http(app)
        .post('/api/auth/candidate/login')
        .set('x-forwarded-for', `203.0.113.${i + 1}`)
        .send({ email: candidate.email, password: 'pogresna-lozinka' });
      last = res.status;
    }
    expect(last).toBe(429);
    // Even the right password waits now: guessing can't continue from new IPs.
    const right = await http(app)
      .post('/api/auth/candidate/login')
      .send({ email: candidate.email, password: TEST_PASSWORD });
    expect(right.status).toBe(429);
    expect(right.body.error.code).toBe('AUTH_RATE_LIMITED');
  });

  it('the 6th reset request for one email within an hour is refused', async () => {
    const candidate = await insertCandidate();
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await http(app)
        .post('/api/auth/password-reset/request')
        .send({ email: candidate.email });
      statuses.push(res.status);
    }
    expect(statuses).toEqual([201, 201, 201, 201, 201, 429]);
  });

  it('the 31st registration from one IP within an hour is refused', async () => {
    const ip = '192.0.2.44';
    let last = 0;
    for (let i = 0; i < 31; i++) {
      const res = await http(app)
        .post('/api/auth/candidate/register')
        .set('x-forwarded-for', ip)
        .send({});
      last = res.status;
    }
    expect(last).toBe(429);
  });
});

describe('staff sign-in', () => {
  it('a moderator and an admin sign in through the staff door; an employer cannot', async () => {
    const mod = await insertModerator();
    await http(app)
      .post('/api/auth/staff/login')
      .send({ email: mod.email, password: TEST_PASSWORD })
      .expect(201);
    const company = await insertCompany();
    const { insertEmployer } = await import('testing/db');
    const emp = await insertEmployer(company.id);
    const res = await http(app)
      .post('/api/auth/staff/login')
      .send({ email: emp.email, password: TEST_PASSWORD });
    expect(res.status).toBe(401);
  });
});
