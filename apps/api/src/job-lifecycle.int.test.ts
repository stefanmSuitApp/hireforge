// T2.5 job lifecycle at the API: draft → submit → publish / reject /
// publish-directly → expire / unpublish / force-archive, and the rule that
// publishing needs an active subscription. Each step is checked in the
// database, in the public API and in the outbox.
import type { INestApplication } from '@nestjs/common';
import { createDb } from 'database';
import {
  expirePublishedJobsPastExpiresAt,
  notifyPublishedJobsExpiringSoon,
} from 'server-jobs';
import { insertSubscription, testDb } from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type Actor,
  http,
  signInAs,
  startApp,
  stopApp,
} from './__harness__/test-app';

let app: INestApplication;
let employer: Actor;
let moderator: Actor;
let admin: Actor;

const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);
const job = async (id: string) =>
  (
    await q(
      `select status, slug, short_id, subscription_id, published_at, expires_at,
              rejected_reason, archived_at, submitted_at from jobs where id = $1`,
      [id],
    )
  ).rows[0];
const outbox = async (type: string, jobId: string) =>
  (
    await q(
      `select payload from outbox_events where event_type = $1 and payload->>'jobId' = $2`,
      [type, jobId],
    )
  ).rows;

const DRAFT = {
  title: 'Električar za industrijska postrojenja',
  description: 'Održavanje elektro instalacija u fabrici u Novom Sadu.',
  citySlug: 'novi-sad',
  categorySlug: 'it',
  workModel: 'onsite',
  employmentType: 'full_time',
  seniority: 'senior',
};

beforeAll(async () => {
  app = await startApp();
  const server = app.getHttpServer();
  [employer, moderator, admin] = await Promise.all([
    signInAs(server, 'employer'),
    signInAs(server, 'moderator'),
    signInAs(server, 'admin'),
  ]);
});
afterAll(() => stopApp(app));

/** A draft of a fresh employer (each has its own ŠEF plan: 3 active jobs). */
async function draftOf(): Promise<{ id: string; owner: Actor }> {
  const owner = await signInAs(app.getHttpServer(), 'employer');
  const res = await http(app)
    .post('/api/employer/jobs')
    .set(owner.headers)
    .send(DRAFT);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return { id: res.body.id as string, owner };
}

async function draft(): Promise<string> {
  return (await draftOf()).id;
}

async function submitted(): Promise<string> {
  const { id, owner } = await draftOf();
  await http(app)
    .post(`/api/employer/jobs/${id}/submit`)
    .set(owner.headers)
    .expect(201);
  return id;
}

describe('an employer drafts and submits a job', () => {
  it('a new draft is bound to the company subscription and is not public', async () => {
    const id = await draft();
    const row = await job(id);
    expect(row.status).toBe('draft');
    expect(row.subscription_id).not.toBeNull();
    await http(app).get(`/api/public/jobs/${id}`).expect(404);
  });

  it('the employer sees the draft in its own list and can edit it', async () => {
    const { id, owner } = await draftOf();
    const list = await http(app)
      .get('/api/employer/jobs')
      .set(owner.headers)
      .expect(200);
    expect(JSON.stringify(list.body)).toContain(id);
    await http(app)
      .patch(`/api/employer/jobs/${id}`)
      .set(owner.headers)
      .send({ ...DRAFT, title: 'Električar (izmenjeno)' })
      .expect(200);
    const detail = await http(app)
      .get(`/api/employer/jobs/${id}`)
      .set(owner.headers)
      .expect(200);
    expect(JSON.stringify(detail.body)).toContain('Električar (izmenjeno)');
  });

  it('a draft without a title is a coded validation error', async () => {
    const res = await http(app)
      .post('/api/employer/jobs')
      .set(employer.headers)
      .send({ ...DRAFT, title: '' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect(res.body.error.details).toBeDefined();
  });

  it('submitting moves it to the moderation queue and writes a job_submitted event', async () => {
    const id = await submitted();
    expect((await job(id)).status).toBe('submitted');
    const queue = await http(app)
      .get('/api/moderator/jobs/queue')
      .set(moderator.headers)
      .expect(200);
    expect(JSON.stringify(queue.body)).toContain(id);
    expect(await outbox('job_submitted', id)).toHaveLength(1);
  });

  it('submitting twice is refused the second time', async () => {
    const { id, owner } = await draftOf();
    await http(app)
      .post(`/api/employer/jobs/${id}/submit`)
      .set(owner.headers)
      .expect(201);
    const res = await http(app)
      .post(`/api/employer/jobs/${id}/submit`)
      .set(owner.headers);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

describe('the package caps active jobs', () => {
  it('a ŠEF plan (3 active jobs) refuses the fourth submission with JOB_POSTING_AT_CAPACITY', async () => {
    const owner = await signInAs(app.getHttpServer(), 'employer');
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await http(app)
        .post('/api/employer/jobs')
        .set(owner.headers)
        .send(DRAFT);
      ids.push(res.body.id);
    }
    for (const id of ids.slice(0, 3)) {
      await http(app)
        .post(`/api/employer/jobs/${id}/submit`)
        .set(owner.headers)
        .expect(201);
    }
    const fourth = await http(app)
      .post(`/api/employer/jobs/${ids[3]}/submit`)
      .set(owner.headers);
    expect(fourth.status).toBe(403);
    expect(fourth.body.error.code).toBe('JOB_POSTING_AT_CAPACITY');
    expect((await job(ids[3] ?? '')).status).toBe('draft');
  });
});

describe('a moderator reviews the job', () => {
  it('publishing makes it public with a slug, a short id and an expiry, and writes job_published', async () => {
    const id = await submitted();
    await http(app)
      .post(`/api/moderator/jobs/${id}/publish`)
      .set(moderator.headers)
      .expect(201);
    const row = await job(id);
    expect(row.status).toBe('published');
    expect(row.slug).toMatch(/^[a-z0-9-]+$/);
    expect(row.short_id).toBeTruthy();
    expect(row.expires_at.getTime()).toBeGreaterThan(
      row.published_at.getTime(),
    );
    const pub = await http(app).get(`/api/public/jobs/${id}`).expect(200);
    expect(JSON.stringify(pub.body)).toContain('Električar');
    expect(await outbox('job_published', id)).toHaveLength(1);
  });

  it('publishing an already published job is refused, and the job is unchanged', async () => {
    const id = await submitted();
    await http(app)
      .post(`/api/moderator/jobs/${id}/publish`)
      .set(moderator.headers)
      .expect(201);
    const before = await job(id);
    const res = await http(app)
      .post(`/api/moderator/jobs/${id}/publish`)
      .set(moderator.headers);
    expect(res.body.error.code).toBe('JOB_INVALID_STATE');
    expect(await job(id)).toEqual(before);
  });

  it('rejecting stores the reason, keeps it private and writes job_rejected', async () => {
    const id = await submitted();
    await http(app)
      .post(`/api/moderator/jobs/${id}/reject`)
      .set(moderator.headers)
      .send({ reason: 'Nedostaje opis radnog mesta.' })
      .expect(201);
    const row = await job(id);
    expect(row.status).toBe('rejected');
    expect(row.rejected_reason).toBe('Nedostaje opis radnog mesta.');
    await http(app).get(`/api/public/jobs/${id}`).expect(404);
    expect(await outbox('job_rejected', id)).toHaveLength(1);
  });

  it('rejecting without a reason is a validation error', async () => {
    const id = await submitted();
    const res = await http(app)
      .post(`/api/moderator/jobs/${id}/reject`)
      .set(moderator.headers)
      .send({})
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    expect((await job(id)).status).toBe('submitted');
  });

  it('publishing directly skips review and leaves an audit row', async () => {
    const id = await draft();
    await http(app)
      .post(`/api/moderator/jobs/${id}/publish-directly`)
      .set(moderator.headers)
      .expect(201);
    expect((await job(id)).status).toBe('published');
    const audit = await q(
      `select action, actor_user_id from staff_audit_log where entity_id = $1`,
      [id],
    );
    expect(audit.rows).toEqual([
      expect.objectContaining({ actor_user_id: moderator.id }),
    ]);
  });

  it('unpublishing archives it and takes it off the public list', async () => {
    const id = await submitted();
    await http(app)
      .post(`/api/moderator/jobs/${id}/publish`)
      .set(moderator.headers)
      .expect(201);
    await http(app)
      .post(`/api/moderator/jobs/${id}/unpublish`)
      .set(moderator.headers)
      .expect(201);
    expect((await job(id)).status).toBe('archived');
    await http(app).get(`/api/public/jobs/${id}`).expect(404);
    expect(await outbox('job_unpublished', id)).toHaveLength(1);
  });

  it('a job of a company whose subscription ended cannot be published', async () => {
    const id = await submitted();
    const { subscription_id } = await job(id);
    await q(`update subscriptions set status = 'expired' where id = $1`, [
      subscription_id,
    ]);
    const res = await http(app)
      .post(`/api/moderator/jobs/${id}/publish`)
      .set(moderator.headers);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('JOB_SUBSCRIPTION_NOT_ACTIVE');
    expect((await job(id)).status).toBe('submitted');
    await q(`update subscriptions set status = 'active' where id = $1`, [
      subscription_id,
    ]);
  });
});

describe('an admin steps in', () => {
  it('force-archiving a published job takes it down and writes job_force_archived', async () => {
    const id = await submitted();
    await http(app)
      .post(`/api/moderator/jobs/${id}/publish`)
      .set(moderator.headers)
      .expect(201);
    const res = await http(app)
      .post(`/api/admin/jobs/${id}/force-archive`)
      .set(admin.headers)
      .send({ reason: 'Prijava korisnika.' });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect((await job(id)).status).toBe('archived');
    await http(app).get(`/api/public/jobs/${id}`).expect(404);
    expect(await outbox('job_force_archived', id)).toHaveLength(1);
  });

  it('admin publish-directly needs an active GAZDA (enterprise) subscription', async () => {
    const { id, owner } = await draftOf();
    const refused = await http(app)
      .post(`/api/admin/jobs/${id}/publish-directly`)
      .set(admin.headers);
    expect(refused.status).toBe(403);
    expect((await job(id)).status).toBe('draft');
    await insertSubscription(await companyOf(owner.id), {
      packageCode: 'gazda',
    });
    await http(app)
      .post(`/api/admin/jobs/${id}/publish-directly`)
      .set(admin.headers)
      .expect(201);
    expect((await job(id)).status).toBe('published');
  });
});

describe('published jobs expire', () => {
  const { db, pool } = createDb(testDb().url);
  afterAll(() => pool.end());

  it('a job past its expiry is expired by the sweep, once, with a job_expired event', async () => {
    const id = await submitted();
    await http(app)
      .post(`/api/moderator/jobs/${id}/publish`)
      .set(moderator.headers)
      .expect(201);
    const { expires_at } = await job(id);
    const later = new Date(expires_at.getTime() + 60_000);
    expect(
      await expirePublishedJobsPastExpiresAt(db, { now: later }),
    ).toBeGreaterThanOrEqual(1);
    expect(await expirePublishedJobsPastExpiresAt(db, { now: later })).toBe(0);
    expect((await job(id)).status).toBe('expired');
    // The page stays (noindex, no apply) but the job is no longer live or listed.
    const detail = await http(app).get(`/api/public/jobs/${id}`).expect(200);
    expect(detail.body.live).toBe(false);
    const list = await http(app)
      .get('/api/public/jobs?pageSize=50')
      .expect(200);
    expect(JSON.stringify(list.body)).not.toContain(id);
    expect(await outbox('job_expired', id)).toHaveLength(1);
  });

  it('a job three days from expiry gets one expiring-soon notice', async () => {
    const id = await submitted();
    await http(app)
      .post(`/api/moderator/jobs/${id}/publish`)
      .set(moderator.headers)
      .expect(201);
    const { expires_at } = await job(id);
    const soon = new Date(expires_at.getTime() - 2 * 86_400_000);
    await notifyPublishedJobsExpiringSoon(db, { now: soon });
    await notifyPublishedJobsExpiringSoon(db, { now: soon });
    expect(await outbox('job_expiring_soon', id)).toHaveLength(1);
    expect((await job(id)).status).toBe('published');
  });
});

describe('subscriptions bound to jobs', () => {
  it('with two active subscriptions, a draft must name which one it uses', async () => {
    await insertSubscription(
      employer.companyId ?? (await companyOf(employer.id)),
      {
        packageCode: 'tezga',
      },
    );
    const res = await http(app)
      .post('/api/employer/jobs')
      .set(employer.headers)
      .send(DRAFT);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toMatch(/SUBSCRIPTION/);
  });
});

async function companyOf(userId: string): Promise<string> {
  const { rows } = await q(
    'select company_id from employers where user_id = $1',
    [userId],
  );
  return rows[0].company_id;
}
