// T2.5 applications at the API: verify-before-first-apply, CVs, apply,
// duplicates, withdraw + 24 h cooldown, what the employer sees, saved jobs
// and searches, profile.
import type { INestApplication } from '@nestjs/common';
import {
  insertCandidate,
  insertCompany,
  insertEmployer,
  insertJob,
  testDb,
} from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { http, signIn, startApp, stopApp } from './__harness__/test-app';

let app: INestApplication;
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);

const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);

beforeAll(async () => {
  app = await startApp();
});
afterAll(() => stopApp(app));

async function candidate({ verified = true, withCv = true } = {}) {
  const user = await insertCandidate({ verified });
  const session = await signIn(app.getHttpServer(), user);
  let cvId: string | undefined;
  if (withCv) {
    const res = await http(app)
      .post('/api/candidate/resumes')
      .set(session.headers)
      .attach('file', PDF, {
        filename: 'Petar Petrović CV.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    cvId = res.body.id;
  }
  return { ...user, ...session, cvId };
}

let employerOf: {
  headers: Record<string, string>;
  companyId: string;
  userId: string;
};
async function job(
  status: 'published' | 'draft' = 'published',
  external = false,
) {
  if (!employerOf) {
    const company = await insertCompany();
    const user = await insertEmployer(company.id);
    employerOf = {
      ...(await signIn(app.getHttpServer(), user)),
      companyId: company.id,
      userId: user.id,
    };
  }
  return (
    await insertJob(employerOf.companyId, employerOf.userId, {
      status,
      applyMode: external ? 'external' : 'internal',
      externalApplyUrl: external
        ? 'https://karijere.example.com/posao/1'
        : null,
    })
  ).id;
}

const apply = (
  c: { headers: Record<string, string> },
  body: Record<string, unknown>,
) => http(app).post('/api/candidate/applications').set(c.headers).send(body);

describe('applying', () => {
  it('a candidate who has not verified their email cannot apply yet', async () => {
    const c = await candidate({ verified: false });
    const res = await apply(c, { jobId: await job() });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANDIDATE_EMAIL_NOT_VERIFIED');
  });

  it('a verified candidate applies with their CV; the employer sees it, and an event is written', async () => {
    const c = await candidate();
    const jobId = await job();
    const res = await apply(c, {
      jobId,
      coverLetterText: 'Imam 5 godina iskustva.',
    }).expect(201);
    // The API answers `{ id }`; contracts' applicationResponseSchema is unused (log note).
    const body = res.body as { id: string };
    expect(Object.keys(body)).toEqual(['id']);
    const stored = await q(
      'select status, resume_asset_id from applications where id = $1',
      [body.id],
    );
    expect(stored.rows[0]).toEqual({
      status: 'submitted',
      resume_asset_id: c.cvId,
    });
    const seen = await http(app)
      .get(`/api/employer/jobs/${jobId}/applications`)
      .set(employerOf.headers)
      .expect(200);
    expect(seen.body).toEqual([
      expect.objectContaining({
        id: body.id,
        status: 'submitted',
        candidateEmail: c.email,
      }),
    ]);
    const events = await q(
      `select 1 from outbox_events where event_type = 'application_submitted' and payload->>'applicationId' = $1`,
      [body.id],
    );
    expect(events.rowCount).toBe(1);
    const mine = await http(app)
      .get('/api/candidate/applications')
      .set(c.headers)
      .expect(200);
    expect(JSON.stringify(mine.body)).toContain(body.id);
  });

  // The applicants list carries the cover letter (it used to be stored only).
  it("the employer can read the candidate's cover letter", async () => {
    const c = await candidate();
    const jobId = await job();
    await apply(c, {
      jobId,
      coverLetterText: 'Imam 5 godina iskustva.',
    }).expect(201);
    const seen = await http(app)
      .get(`/api/employer/jobs/${jobId}/applications`)
      .set(employerOf.headers)
      .expect(200);
    expect(JSON.stringify(seen.body)).toContain('Imam 5 godina iskustva.');
  });

  it('applying twice to the same job is APPLICATION_ALREADY_EXISTS', async () => {
    const c = await candidate();
    const jobId = await job();
    await apply(c, { jobId }).expect(201);
    const again = await apply(c, { jobId });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('APPLICATION_ALREADY_EXISTS');
  });

  it('a draft job takes no applications', async () => {
    const res = await apply(await candidate(), { jobId: await job('draft') });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('JOB_NOT_PUBLISHED');
  });

  it('a job with external apply sends candidates away instead', async () => {
    const res = await apply(await candidate(), {
      jobId: await job('published', true),
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('JOB_EXTERNAL_APPLY_ONLY');
  });

  it('an unknown job is JOB_NOT_FOUND', async () => {
    const res = await apply(await candidate(), {
      jobId: '00000000-0000-4000-8000-00000000dead',
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('JOB_NOT_FOUND');
  });

  it('a cover letter over 1500 characters is VALIDATION_FAILED', async () => {
    const res = await apply(await candidate(), {
      jobId: await job(),
      coverLetterText: 'x'.repeat(1501),
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('a candidate without any CV gets a coded error, not a crash', async () => {
    const res = await apply(await candidate({ withCv: false }), {
      jobId: await job(),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.body.error.code).toMatch(/RESUME|CV/);
  });
});

describe('withdrawing', () => {
  it('a withdrawn application can be re-sent only after 24 hours', async () => {
    const c = await candidate();
    const jobId = await job();
    const first = await apply(c, { jobId }).expect(201);
    await http(app)
      .patch(`/api/candidate/applications/${first.body.id}`)
      .set(c.headers)
      .send({ status: 'withdrawn' })
      .expect(200);
    const tooSoon = await apply(c, { jobId });
    expect(tooSoon.status).toBe(409);
    expect(tooSoon.body.error.code).toBe('APPLICATION_REAPPLY_COOLDOWN');
    await q(
      `update applications set updated_at = now() - interval '25 hours' where id = $1`,
      [first.body.id],
    );
    await apply(c, { jobId }).expect(201);
  });

  it('only "withdrawn" is a valid status change for a candidate', async () => {
    const c = await candidate();
    const app1 = await apply(c, { jobId: await job() }).expect(201);
    const res = await http(app)
      .patch(`/api/candidate/applications/${app1.body.id}`)
      .set(c.headers)
      .send({ status: 'hired' });
    expect(res.status).toBe(400);
    const { rows } = await q('select status from applications where id = $1', [
      app1.body.id,
    ]);
    expect(rows[0].status).toBe('submitted');
  });
});

describe('CVs', () => {
  it('the candidate downloads their CV as a PDF attachment', async () => {
    const c = await candidate();
    const res = await http(app)
      .get(`/api/candidate/resumes/${c.cvId}/download`)
      .set(c.headers)
      .expect(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename=".*CV\.pdf"$/,
    );
  });

  // multer reads multipart file names as latin1; the upload re-decodes them as
  // UTF-8 and keeps letters of any script ("Petrović" used to become "Petrovi__").
  it('a CV keeps the Serbian letters of its file name', async () => {
    const c = await candidate();
    const res = await http(app)
      .get(`/api/candidate/resumes/${c.cvId}/download`)
      .set(c.headers)
      .expect(200);
    expect(
      decodeURIComponent(res.headers['content-disposition'] ?? ''),
    ).toContain('Petar Petrović CV.pdf');
  });

  it('a CV attached to an application cannot be deleted', async () => {
    const c = await candidate();
    await apply(c, { jobId: await job(), resumeAssetId: c.cvId }).expect(201);
    const res = await http(app)
      .delete(`/api/candidate/resumes/${c.cvId}`)
      .set(c.headers);
    expect(res.status).toBe(409);
    const { rowCount } = await q('select 1 from resume_assets where id = $1', [
      c.cvId,
    ]);
    expect(rowCount).toBe(1);
  });

  it('an unused CV can be deleted', async () => {
    const c = await candidate();
    await http(app)
      .delete(`/api/candidate/resumes/${c.cvId}`)
      .set(c.headers)
      .expect(200);
    const list = await http(app)
      .get('/api/candidate/resumes')
      .set(c.headers)
      .expect(200);
    expect(JSON.stringify(list.body)).not.toContain(c.cvId);
  });

  it('a file that is not a PDF or Word document is refused', async () => {
    const c = await candidate({ withCv: false });
    const res = await http(app)
      .post('/api/candidate/resumes')
      .set(c.headers)
      .attach('file', Buffer.from('<script>alert(1)</script>'), {
        filename: 'cv.html',
        contentType: 'text/html',
      });
    expect(res.status).toBe(400);
  });

  it('a CV generated from a template is a PDF the candidate can download', async () => {
    const c = await candidate({ withCv: false });
    await http(app)
      .patch('/api/candidate/profile')
      .set(c.headers)
      .send({ fullName: 'Jelena Jovanović', headline: 'Knjigovođa' })
      .expect(200);
    const res = await http(app)
      .post('/api/candidate/resumes/generate')
      .set(c.headers)
      .send({ templateCode: 'klasican' });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const file = await http(app)
      .get(`/api/candidate/resumes/${res.body.id}/download`)
      .set(c.headers)
      .expect(200);
    expect(file.headers['content-type']).toContain('application/pdf');
  });

  // CV templates PR 4: the two new templates are stored like the others, and
  // the database still refuses a code no template has.
  it('the European and Practical templates generate and keep their code', async () => {
    const c = await candidate({ withCv: false });
    for (const templateCode of ['evropski', 'prakticni']) {
      const res = await http(app)
        .post('/api/candidate/resumes/generate')
        .set(c.headers)
        .send({ templateCode, locale: 'sr' });
      expect(res.status, JSON.stringify(res.body)).toBe(201);
      expect(res.body.templateCode).toBe(templateCode);
    }
    await expect(
      q(
        `UPDATE resume_assets SET template_code = 'nepostojeci'
           WHERE id = (SELECT id FROM resume_assets WHERE template_code = 'evropski' LIMIT 1)`,
      ),
    ).rejects.toThrow(/resume_assets_template_code_check/);
  });
});

describe('saved jobs and searches', () => {
  it('a candidate saves a job, sees it in the list, and unsaves it', async () => {
    const c = await candidate();
    const jobId = await job();
    await http(app)
      .post('/api/candidate/saved-jobs')
      .set(c.headers)
      .send({ jobId })
      .expect(201);
    const list = await http(app)
      .get('/api/candidate/saved-jobs')
      .set(c.headers)
      .expect(200);
    expect(JSON.stringify(list.body)).toContain(jobId);
    await http(app)
      .delete(`/api/candidate/saved-jobs/${jobId}`)
      .set(c.headers)
      .expect(200);
    const after = await http(app)
      .get('/api/candidate/saved-jobs')
      .set(c.headers)
      .expect(200);
    expect(JSON.stringify(after.body)).not.toContain(jobId);
  });

  it('saving the same job twice keeps one bookmark', async () => {
    const c = await candidate();
    const jobId = await job();
    await http(app)
      .post('/api/candidate/saved-jobs')
      .set(c.headers)
      .send({ jobId })
      .expect(201);
    const again = await http(app)
      .post('/api/candidate/saved-jobs')
      .set(c.headers)
      .send({ jobId });
    expect(again.status).toBeLessThan(500);
    const { rows } = await q(
      'select count(*)::int as n from saved_jobs where job_id = $1',
      [jobId],
    );
    expect(rows[0].n).toBe(1);
  });

  it('a saved search stores its filters', async () => {
    const c = await candidate();
    await http(app)
      .post('/api/candidate/saved-searches')
      .set(c.headers)
      .send({ query: { q: 'vozač', city: 'beograd' } })
      .expect(201);
    const { rows } = await q(
      'select query_json from saved_job_searches s join candidates c on c.id = s.candidate_id where c.user_id = $1',
      [c.id],
    );
    expect(rows[0].query_json).toEqual({ q: 'vozač', city: 'beograd' });
  });

  it('a saved search with too many filters is refused', async () => {
    const c = await candidate();
    const query = Object.fromEntries(
      Array.from({ length: 49 }, (_, i) => [`k${i}`, 'v']),
    );
    const res = await http(app)
      .post('/api/candidate/saved-searches')
      .set(c.headers)
      .send({ query });
    expect(res.status).toBe(400);
  });
});

describe('profile', () => {
  it('a candidate edits their profile and reads it back', async () => {
    const c = await candidate();
    await http(app)
      .patch('/api/candidate/profile')
      .set(c.headers)
      .send({
        fullName: 'Marko Marković',
        phone: '+381 60 123 4567',
        headline: 'Vozač C kategorije',
      })
      .expect(200);
    const me = await http(app)
      .get('/api/candidate/me')
      .set(c.headers)
      .expect(200);
    expect(JSON.stringify(me.body)).toContain('Vozač C kategorije');
    expect(me.body.user.emailVerified).toBe(true);
  });

  it('a headline over 80 characters is refused', async () => {
    const c = await candidate();
    const res = await http(app)
      .patch('/api/candidate/profile')
      .set(c.headers)
      .send({ headline: 'x'.repeat(81) });
    expect(res.status).toBe(400);
  });
});
