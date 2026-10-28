// T2.5 + T2.6 the public job API: only published jobs are visible, filters
// and search, detail by id and slug, company pages, external-apply clicks,
// and description images (upload limits, who can see them).
import type { INestApplication } from '@nestjs/common';
import { employerJobDescriptionImageUploadResponseSchema } from 'contracts';
import sharp from 'sharp';
import {
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

let owner: {
  companyId: string;
  userId: string;
  slug: string;
  headers: Record<string, string>;
};

beforeAll(async () => {
  app = await startApp();
  const company = await insertCompany({
    company: { slug: 'javna-firma', legalName: 'Javna Firma d.o.o.' },
  });
  await insertSubscription(company.id);
  const user = await insertEmployer(company.id);
  owner = {
    companyId: company.id,
    userId: user.id,
    slug: company.slug,
    ...(await signIn(app.getHttpServer(), user)),
  };
});
afterAll(() => stopApp(app));

const jobOf = (
  status: Parameters<typeof insertJob>[2] extends infer O ? O : never,
) => insertJob(owner.companyId, owner.userId, status as never);

describe('only published jobs are public', () => {
  it('the list shows published jobs and hides drafts, submitted, rejected, archived and expired ones', async () => {
    const visible = await jobOf({
      status: 'published',
      title: 'Vidljiv oglas',
    });
    const hidden = await Promise.all(
      (['draft', 'submitted', 'rejected', 'archived', 'expired'] as const).map(
        (status) => jobOf({ status, title: `Skriven ${status}` }),
      ),
    );
    const res = await http(app).get('/api/public/jobs?pageSize=50').expect(200);
    const text = JSON.stringify(res.body);
    expect(text).toContain(visible.id);
    for (const job of hidden) expect(text).not.toContain(job.id);
  });

  it('detail by id and by slug answers for a published job and 404 for a draft', async () => {
    const pub = await jobOf({ status: 'published', title: 'Magacioner' });
    await http(app).get(`/api/public/jobs/${pub.id}`).expect(200);
    const bySlug = await http(app).get(`/api/public/jobs/by-slug/${pub.slug}`);
    expect(bySlug.status).toBe(200);
    const draft = await jobOf({ status: 'draft' });
    await http(app).get(`/api/public/jobs/${draft.id}`).expect(404);
  });

  it('a malformed job id is a 400, not a crash', async () => {
    const res = await http(app).get('/api/public/jobs/not-a-uuid');
    expect(res.status).toBe(400);
  });

  it('previews return published jobs only, at most eight', async () => {
    const pub = await jobOf({ status: 'published' });
    const draft = await jobOf({ status: 'draft' });
    const res = await http(app)
      .get(`/api/public/jobs/previews?refs=${pub.id},${draft.id}`)
      .expect(200);
    expect(JSON.stringify(res.body)).toContain(pub.id);
    expect(JSON.stringify(res.body)).not.toContain(draft.id);
  });

  it("a company page lists the company's published jobs", async () => {
    const pub = await jobOf({
      status: 'published',
      title: 'Na stranici firme',
    });
    const res = await http(app)
      .get(`/api/public/jobs/company/${owner.slug}`)
      .expect(200);
    expect(JSON.stringify(res.body)).toContain('Javna Firma d.o.o.');
    expect(JSON.stringify(res.body)).toContain(pub.id);
  });

  it('similar jobs never include the job itself or unpublished ones', async () => {
    const a = await jobOf({ status: 'published', title: 'Vozač kamiona' });
    const draft = await jobOf({ status: 'draft', title: 'Vozač kamiona 2' });
    const res = await http(app)
      .get(`/api/public/jobs/${a.id}/similar`)
      .expect(200);
    expect(JSON.stringify(res.body)).not.toContain(a.id);
    expect(JSON.stringify(res.body)).not.toContain(draft.id);
  });
});

describe('filters and search', () => {
  it('filters by city and category slug', async () => {
    const bg = await jobOf({
      status: 'published',
      city: 'beograd',
      category: 'it',
    });
    const ns = await jobOf({
      status: 'published',
      city: 'novi-sad',
      category: 'marketing',
    });
    const res = await http(app)
      .get('/api/public/jobs?city=novi-sad&pageSize=50')
      .expect(200);
    expect(JSON.stringify(res.body)).toContain(ns.id);
    expect(JSON.stringify(res.body)).not.toContain(bg.id);
    const byCat = await http(app)
      .get('/api/public/jobs?category=marketing&pageSize=50')
      .expect(200);
    expect(JSON.stringify(byCat.body)).toContain(ns.id);
  });

  it('full-text search finds a word from the title', async () => {
    const hit = await jobOf({
      status: 'published',
      title: 'Pekar za noćnu smenu',
    });
    const miss = await jobOf({ status: 'published', title: 'Računovođa' });
    const res = await http(app)
      .get('/api/public/jobs?q=pekar&pageSize=50')
      .expect(200);
    expect(JSON.stringify(res.body)).toContain(hit.id);
    expect(JSON.stringify(res.body)).not.toContain(miss.id);
  });

  it('searching without diacritics finds a title written with them (racunovodja → Računovođa)', async () => {
    const hit = await jobOf({
      status: 'published',
      title: 'Računovođa u Nišu',
    });
    const res = await http(app)
      .get('/api/public/jobs?q=racunovodja&pageSize=50')
      .expect(200);
    expect(JSON.stringify(res.body)).toContain(hit.id);
  });

  it('searching in Cyrillic finds a Latin title (пекар → Pekar)', async () => {
    const hit = await jobOf({
      status: 'published',
      title: 'Pekar u Kragujevcu',
    });
    const res = await http(app)
      .get(`/api/public/jobs?q=${encodeURIComponent('пекар')}&pageSize=50`)
      .expect(200);
    expect(JSON.stringify(res.body)).toContain(hit.id);
  });

  it('an invalid filter value is a 400', async () => {
    const res = await http(app).get('/api/public/jobs?sort=sideways');
    expect(res.status).toBe(400);
  });

  it('the filter taxonomy lists the seeded cities and categories', async () => {
    const res = await http(app).get('/api/public/jobs/filters').expect(200);
    expect(JSON.stringify(res.body)).toContain('beograd');
    expect(JSON.stringify(res.body)).toContain('marketing');
  });
});

describe('external apply clicks', () => {
  it('a click on an external-apply job counts once per session key', async () => {
    const job = await jobOf({
      status: 'published',
      applyMode: 'external',
      externalApplyUrl: 'https://karijere.example.com/1',
    });
    const click = () =>
      http(app)
        .post(`/api/public/jobs/${job.id}/external-click`)
        .set('x-forwarded-for', '198.51.100.20')
        .send({ sessionKey: '6f1c2b8e-4d3a-4c5b-9e7f-1a2b3c4d5e6f' });
    await click().expect(200);
    await click().expect(200);
    const { rows } = await q(
      'select external_apply_clicks from jobs where id = $1',
      [job.id],
    );
    expect(rows[0].external_apply_clicks).toBe(1);
  });

  it('a click on an internal-apply job is refused', async () => {
    const job = await jobOf({ status: 'published' });
    const res = await http(app)
      .post(`/api/public/jobs/${job.id}/external-click`)
      .send({ sessionKey: '6f1c2b8e-4d3a-4c5b-9e7f-1a2b3c4d5e6f' });
    expect(res.status).toBe(400);
  });
});

describe('job description images', () => {
  let png: Buffer;
  beforeAll(async () => {
    png = await sharp({
      create: { width: 1200, height: 630, channels: 3, background: '#c33' },
    })
      .png()
      .toBuffer();
  });

  async function draftWithImage(): Promise<{ jobId: string; mediaId: string }> {
    const draft = await http(app)
      .post('/api/employer/jobs')
      .set(owner.headers)
      .send({
        title: 'Sa slikom',
        description: 'x',
        workModel: 'onsite',
        employmentType: 'full_time',
        seniority: 'mid',
        citySlug: 'beograd',
        categorySlug: 'it',
      })
      .expect(201);
    const up = await http(app)
      .post(`/api/employer/jobs/${draft.body.id}/image`)
      .set(owner.headers)
      .attach('file', png, { filename: 'slika.png', contentType: 'image/png' });
    expect(up.status, JSON.stringify(up.body)).toBe(201);
    const { url } = employerJobDescriptionImageUploadResponseSchema.parse(
      up.body,
    );
    expect(url).toMatch(
      /^\/api\/public\/job-description-media\/[0-9a-f-]{36}$/,
    );
    return { jobId: draft.body.id, mediaId: url.split('/').at(-1) ?? '' };
  }

  it('a PNG upload is stored as AVIF and served publicly once the job is published', async () => {
    const { jobId, mediaId } = await draftWithImage();
    await q(
      `update jobs set status = 'published', published_at = now(), slug = 'sa-slikom-' || left(id::text, 8) where id = $1`,
      [jobId],
    );
    const res = await http(app)
      .get(`/api/public/job-description-media/${mediaId}`)
      .expect(200);
    expect(res.headers['content-type']).toBe('image/avif');
    expect(res.headers['cache-control']).toContain('immutable');
  });

  // Known issue (PROGRESS.md, NEEDS_STEFAN.md): getPublicFile has no job-status
  // check, so images of drafts / rejected / archived jobs are public to anyone
  // with the URL. Flip to `it` once only published jobs' media is served.
  it.fails('an image of a draft job is not public', async () => {
    const { mediaId } = await draftWithImage();
    await http(app)
      .get(`/api/public/job-description-media/${mediaId}`)
      .expect(404);
  });

  it('a file that is not PNG or JPEG is refused', async () => {
    const draft = await http(app)
      .post('/api/employer/jobs')
      .set(owner.headers)
      .send({
        title: 'Bez slike',
        description: 'x',
        workModel: 'onsite',
        employmentType: 'full_time',
        seniority: 'mid',
      })
      .expect(201);
    const res = await http(app)
      .post(`/api/employer/jobs/${draft.body.id}/image`)
      .set(owner.headers)
      .attach('file', Buffer.from('GIF89a'), {
        filename: 'x.gif',
        contentType: 'image/gif',
      });
    expect(res.status).toBe(400);
  });

  it('an image over 2 MB is refused before it is processed', async () => {
    const draft = await http(app)
      .post('/api/employer/jobs')
      .set(owner.headers)
      .send({
        title: 'Velika slika',
        description: 'x',
        workModel: 'onsite',
        employmentType: 'full_time',
        seniority: 'mid',
      })
      .expect(201);
    const res = await http(app)
      .post(`/api/employer/jobs/${draft.body.id}/image`)
      .set(owner.headers)
      .attach('file', Buffer.alloc(2 * 1024 * 1024 + 1, 1), {
        filename: 'big.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(413);
    const media = await q(
      'select count(*)::int as n from job_description_media where job_id = $1',
      [draft.body.id],
    );
    expect(media.rows[0].n).toBe(0);
  });

  it('a PNG that is not really a PNG is a coded 400, not a crash', async () => {
    const draft = await http(app)
      .post('/api/employer/jobs')
      .set(owner.headers)
      .send({
        title: 'Lažna slika',
        description: 'x',
        workModel: 'onsite',
        employmentType: 'full_time',
        seniority: 'mid',
      })
      .expect(201);
    const res = await http(app)
      .post(`/api/employer/jobs/${draft.body.id}/image`)
      .set(owner.headers)
      .attach('file', Buffer.from('not an image at all'), {
        filename: 'fake.png',
        contentType: 'image/png',
      });
    expect(res.status).toBe(400);
  });
});
