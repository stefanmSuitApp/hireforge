// Go-to-market WP-A5: jobs that take applications by phone, Viber or e-mail.
// The number is only handed out on a tap, and each tap is counted per day.
import type { INestApplication } from '@nestjs/common';
import {
  insertCandidate,
  insertCompany,
  insertEmployer,
  insertJob,
  insertSubscription,
  testDb,
} from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { http, signIn, startApp, stopApp } from './__harness__/test-app';

let app: INestApplication;
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);

let company: { id: string; userId: string };

beforeAll(async () => {
  app = await startApp();
  const c = await insertCompany();
  const user = await insertEmployer(c.id);
  company = { id: c.id, userId: user.id };
});
afterAll(() => stopApp(app));

async function contactJob(
  mode: 'phone' | 'email',
  value: string,
  status: 'published' | 'draft' = 'published',
): Promise<string> {
  const { id } = await insertJob(company.id, company.userId, { status });
  await q(
    `update jobs set apply_mode = $2, apply_phone = $3, apply_email = $4 where id = $1`,
    [
      id,
      mode,
      mode === 'phone' ? value : null,
      mode === 'email' ? value : null,
    ],
  );
  return id;
}

const tap = (jobId: string, channel: string, sessionKey = 'session-0001') =>
  http(app)
    .post(`/api/public/jobs/${jobId}/contact`)
    .send({ channel, sessionKey });

const statsOf = async (jobId: string) =>
  (
    await q(
      `select coalesce(sum(calls), 0)::int as calls, coalesce(sum(viber), 0)::int as viber,
              coalesce(sum(emails), 0)::int as emails
         from job_daily_stats where job_id = $1`,
      [jobId],
    )
  ).rows[0];

describe('a phone job', () => {
  it('shows call and Viber buttons, but its number is not in the public job', async () => {
    const id = await contactJob('phone', '+381641234567');
    const res = await http(app).get(`/api/public/jobs/${id}`).expect(200);
    expect(res.body.applyMode).toBe('phone');
    expect(res.body.contactChannels).toEqual(['call', 'viber']);
    expect(JSON.stringify(res.body)).not.toContain('641234567');
  });

  it('a tap answers the tel: link and counts once per page view', async () => {
    const id = await contactJob('phone', '+381641234567');
    const first = await tap(id, 'call').expect(200);
    expect(first.body).toEqual({
      href: 'tel:+381641234567',
      display: '064 123 4567',
    });
    await tap(id, 'call').expect(200);
    await tap(id, 'call', 'session-0002').expect(200);
    expect(await statsOf(id)).toEqual({ calls: 2, viber: 0, emails: 0 });
  });

  it('Viber opens a chat with the number', async () => {
    const id = await contactJob('phone', '+381641234567');
    const res = await tap(id, 'viber').expect(200);
    expect(res.body.href).toBe('viber://chat?number=%2B381641234567');
    expect((await statsOf(id)).viber).toBe(1);
  });

  it('a landline has no Viber button, and asking for it is refused', async () => {
    const id = await contactJob('phone', '+38118123456');
    const pub = await http(app).get(`/api/public/jobs/${id}`).expect(200);
    expect(pub.body.contactChannels).toEqual(['call']);
    const res = await tap(id, 'viber');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('JOB_CONTACT_NOT_AVAILABLE');
  });

  it('candidates cannot send a Šljakam application to it', async () => {
    const id = await contactJob('phone', '+381641234567');
    const user = await insertCandidate();
    const session = await signIn(app.getHttpServer(), user);
    const res = await http(app)
      .post('/api/candidate/applications')
      .set(session.headers)
      .send({ jobId: id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('JOB_EXTERNAL_APPLY_ONLY');
  });
});

describe('an e-mail job', () => {
  it('answers a mailto: link with the job title as subject, and counts it', async () => {
    const id = await contactJob('email', 'posao@kafana.rs');
    const res = await tap(id, 'email').expect(200);
    expect(res.body.display).toBe('posao@kafana.rs');
    expect(res.body.href).toMatch(/^mailto:posao@kafana\.rs\?subject=/);
    expect(decodeURIComponent(res.body.href)).toContain(
      'Senior TypeScript developer',
    );
    expect((await statsOf(id)).emails).toBe(1);
  });
});

describe('what the contact endpoint refuses', () => {
  it('a job that applies on Šljakam has no contact to hand out', async () => {
    const { id } = await insertJob(company.id, company.userId, {
      status: 'published',
    });
    const res = await tap(id, 'call');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('JOB_CONTACT_NOT_AVAILABLE');
  });

  it('an unpublished job is not found, and nothing is counted', async () => {
    const id = await contactJob('phone', '+381641234567', 'draft');
    const res = await tap(id, 'call');
    expect(res.status).toBe(404);
    expect(await statsOf(id)).toEqual({ calls: 0, viber: 0, emails: 0 });
  });

  it('an unknown channel is VALIDATION_FAILED', async () => {
    const id = await contactJob('phone', '+381641234567');
    const res = await tap(id, 'sms');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('the employer sets it up', () => {
  it('a phone draft is stored normalized and shown back to the employer', async () => {
    const owner = await signIn(
      app.getHttpServer(),
      await insertEmployer(company.id),
    );
    await insertSubscription(company.id);
    const res = await http(app)
      .post('/api/employer/jobs')
      .set(owner.headers)
      .send({
        title: 'Konobar',
        description: 'Smene, bašta.',
        workModel: 'onsite',
        employmentType: 'part_time',
        seniority: 'junior',
        applyMode: 'phone',
        applyPhone: '064/123-4567',
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const mine = await http(app)
      .get(`/api/employer/jobs/${res.body.id}`)
      .set(owner.headers)
      .expect(200);
    expect(mine.body).toMatchObject({
      applyMode: 'phone',
      applyPhone: '+381641234567',
      applyEmail: null,
    });
  });

  it('the database refuses a phone job without a number', async () => {
    const { id } = await insertJob(company.id, company.userId);
    await expect(
      q(`update jobs set apply_mode = 'phone' where id = $1`, [id]),
    ).rejects.toThrow(/jobs_apply_contact_check/);
  });
});
