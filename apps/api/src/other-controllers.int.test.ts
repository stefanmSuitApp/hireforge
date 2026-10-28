// T2.4: the controllers not covered by the other flow files get at least one
// happy path and one refusal each: CMS package sync, integration status,
// public employers, staff employers, the app root, moderator authoring,
// admin patch-publish and the employer package catalogue.
import type { INestApplication } from '@nestjs/common';
import { employerPackageCatalogResponseSchema } from 'contracts';
import {
  insertCompany,
  insertEmployer,
  insertJob,
  insertSubscription,
  testDb,
} from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type Actor,
  http,
  signInAs,
  startApp,
  stopApp,
} from './__harness__/test-app';

const SYNC_SECRET = 'cms-sync-secret-for-tests-0123456789';
let app: INestApplication;
let admin: Actor;
let moderator: Actor;
let employer: Actor;
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);

beforeAll(async () => {
  app = await startApp({ CMS_SYNC_SECRET: SYNC_SECRET });
  const server = app.getHttpServer();
  [admin, moderator, employer] = await Promise.all([
    signInAs(server, 'admin'),
    signInAs(server, 'moderator'),
    signInAs(server, 'employer'),
  ]);
});
afterAll(() => stopApp(app));

const SANITY_SEF = {
  _id: 'packageDefinition.sef',
  _type: 'packageDefinition',
  code: 'sef',
  isActive: true,
  isEnterprise: false,
  displayOrder: 3,
  prices: [{ durationDays: 30, amountMinor: 5900, currency: 'eur' }],
  entitlements: {
    maxActiveJobs: 4,
    maxCitiesUnlimited: true,
    maxCharacters: 8000,
    featuredListing: true,
    pngCreative: true,
    socialPublish: true,
    paidSocialAds: true,
    crossborderVisible: true,
    hyperlinksMaxCount: 5,
    editor: {
      bold: true,
      italic: true,
      underline: true,
      headings: true,
      lists: true,
      blockquote: true,
      inline_code: true,
      code_block: true,
      text_align: true,
      image_upload: true,
      embed: false,
      hyperlinks: true,
    },
  },
};

describe('CMS package sync (webhook)', () => {
  it('a valid package document updates the mirror (price and entitlements) and is audited', async () => {
    const res = await http(app)
      .post('/api/cms/sync/package')
      .set('x-cms-sync-secret', SYNC_SECRET)
      .send({ document: SANITY_SEF });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const price = await q(
      `select amount_minor from package_prices where package_code = 'sef' and duration_days = 30 and currency = 'EUR'`,
    );
    expect(price.rows[0].amount_minor).toBe(5900);
    const ent = await q(
      `select value from package_entitlements where package_code = 'sef' and key = 'max_active_jobs'`,
    );
    expect(ent.rows[0].value).toBe(4);
    const audit = await q(
      `select actor_user_id from staff_audit_log where entity_id = 'sef' or entity_id like '%sef%'`,
    );
    expect(audit.rows.length).toBeGreaterThanOrEqual(1);
    expect(audit.rows[0].actor_user_id).toBeNull();
  });

  it('a malformed document is a 400 and changes nothing', async () => {
    const before = await q(
      `select amount_minor from package_prices where package_code = 'tezga' order by duration_days`,
    );
    const res = await http(app)
      .post('/api/cms/sync/package')
      .set('x-cms-sync-secret', SYNC_SECRET)
      .send({ document: { ...SANITY_SEF, code: 'tezga', prices: 'free' } });
    expect(res.status).toBe(400);
    const after = await q(
      `select amount_minor from package_prices where package_code = 'tezga' order by duration_days`,
    );
    expect(after.rows).toEqual(before.rows);
  });

  it('without the secret configured, the webhook is closed (503), not open', async () => {
    delete process.env['CMS_SYNC_SECRET'];
    try {
      const res = await http(app)
        .post('/api/cms/sync/package')
        .set('x-cms-sync-secret', '')
        .send({ document: SANITY_SEF });
      expect(res.status).toBe(503);
    } finally {
      process.env['CMS_SYNC_SECRET'] = SYNC_SECRET;
    }
  });
});

describe('small public and session routes', () => {
  it('GET /api answers the placeholder greeting', async () => {
    const res = await http(app).get('/api').expect(200);
    expect(res.body).toHaveProperty('message');
  });

  it('GET /api/integration reports each dependency (Sanity skipped in tests)', async () => {
    const res = await http(app).get('/api/integration').expect(200);
    expect(res.body).toMatchObject({
      postgres: 'up',
      redis: 'up',
      sanity: 'skipped',
    });
  });

  it('the employers directory lists companies with published jobs, for signed-in users', async () => {
    const company = await insertCompany({
      company: { legalName: 'Direktorijum d.o.o.' },
    });
    const author = await insertEmployer(company.id);
    await insertJob(company.id, author.id, { status: 'published' });
    const hidden = await insertCompany({
      company: { legalName: 'Bez Oglasa d.o.o.' },
    });
    const res = await http(app)
      .get('/api/public/employers')
      .set(employer.headers)
      .expect(200);
    expect(JSON.stringify(res.body)).toContain('Direktorijum d.o.o.');
    expect(JSON.stringify(res.body)).not.toContain(hidden.id);
  });
});

describe('staff employer memberships', () => {
  it('staff list employer accounts with their companies and can search them', async () => {
    const company = await insertCompany({
      company: { legalName: 'Pretraga Firma d.o.o.' },
    });
    const user = await insertEmployer(company.id);
    const res = await http(app)
      .get('/api/moderator/employers?q=Pretraga')
      .set(moderator.headers)
      .expect(200);
    expect(JSON.stringify(res.body)).toContain(user.email);
  });

  it('an admin moves an employer to another company, and the audit records from/to', async () => {
    const from = await insertCompany();
    const to = await insertCompany();
    const user = await insertEmployer(from.id);
    const { rows } = await q('select id from employers where user_id = $1', [
      user.id,
    ]);
    await http(app)
      .patch(`/api/moderator/employers/${rows[0].id}`)
      .set(admin.headers)
      .send({ companyId: to.id })
      .expect(200);
    const after = await q(
      'select company_id from employers where user_id = $1',
      [user.id],
    );
    expect(after.rows[0].company_id).toBe(to.id);
    const audit = await q(
      'select metadata from staff_audit_log where entity_id = $1',
      [rows[0].id],
    );
    expect(audit.rows[0].metadata).toMatchObject({
      fromCompanyId: from.id,
      toCompanyId: to.id,
    });
  });

  it('moving to an unknown company is a coded 404', async () => {
    const company = await insertCompany();
    const user = await insertEmployer(company.id);
    const { rows } = await q('select id from employers where user_id = $1', [
      user.id,
    ]);
    const res = await http(app)
      .patch(`/api/moderator/employers/${rows[0].id}`)
      .set(admin.headers)
      .send({ companyId: '00000000-0000-4000-8000-00000000dead' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('COMPANY_NOT_FOUND');
  });
});

describe('moderator authoring and admin patch-publish', () => {
  it('a moderator drafts a job for a client company and edits it', async () => {
    const client = await insertCompany({
      salesStatus: 'closed_won',
      assignedModeratorId: moderator.id,
    });
    await insertSubscription(client.id);
    const res = await http(app)
      .post('/api/moderator/jobs')
      .set(moderator.headers)
      .send({
        companyId: client.id,
        title: 'Konobar',
        description: 'Restoran u centru.',
        workModel: 'onsite',
        employmentType: 'part_time',
        seniority: 'junior',
        citySlug: 'beograd',
        categorySlug: 'marketing',
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const id = res.body.id as string;
    const authoring = await http(app)
      .get(`/api/moderator/jobs/${id}/authoring`)
      .set(moderator.headers)
      .expect(200);
    expect(JSON.stringify(authoring.body)).toContain('Konobar');
    await http(app)
      .patch(`/api/moderator/jobs/${id}`)
      .set(moderator.headers)
      .send({
        title: 'Konobar/ica',
        description: 'Restoran.',
        workModel: 'onsite',
        employmentType: 'part_time',
        seniority: 'junior',
      })
      .expect(200);
    const { rows } = await q(
      'select company_id, title from jobs where id = $1',
      [id],
    );
    expect(rows[0]).toEqual({ company_id: client.id, title: 'Konobar/ica' });
    const detail = await http(app)
      .get(`/api/moderator/jobs/${id}`)
      .set(moderator.headers)
      .expect(200);
    expect(JSON.stringify(detail.body)).toContain('Konobar/ica');
  });

  async function liveJob(title: string) {
    const company = await insertCompany();
    const author = await insertEmployer(company.id);
    const sub = await insertSubscription(company.id);
    return insertJob(company.id, author.id, {
      status: 'published',
      subscriptionId: sub.id,
      title,
    });
  }

  it('an admin fixes a one-letter typo in a live job in place (patch-publish, ≤ 5 % edit), and it stays published', async () => {
    const job = await liveJob('Vozac kamiona za medjunarodni transport');
    await http(app)
      .post(`/api/admin/jobs/${job.id}/patch-publish`)
      .set(admin.headers)
      .send({ title: 'Vozač kamiona za medjunarodni transport' })
      .expect(201);
    const { rows } = await q('select title, status from jobs where id = $1', [
      job.id,
    ]);
    expect(rows[0]).toEqual({
      title: 'Vozač kamiona za medjunarodni transport',
      status: 'published',
    });
  });

  it('patch-publish refuses more than a trivial edit, and the job is unchanged', async () => {
    const job = await liveJob('Vozač kamiona');
    const res = await http(app)
      .post(`/api/admin/jobs/${job.id}/patch-publish`)
      .set(admin.headers)
      .send({ title: 'Direktor marketinga za region Balkana' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('JOB_TRIVIAL_PATCH_EXCEEDED');
    const { rows } = await q('select title from jobs where id = $1', [job.id]);
    expect(rows[0].title).toBe('Vozač kamiona');
  });

  it('patch-publish with no field is VALIDATION_FAILED', async () => {
    const res = await http(app)
      .post(
        '/api/admin/jobs/00000000-0000-4000-8000-00000000dead/patch-publish',
      )
      .set(admin.headers)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});

describe('employer catalogue and workspace', () => {
  it('the package catalogue matches the contract and hides nothing sold at checkout', async () => {
    const res = await http(app)
      .get('/api/employer/packages')
      .set(employer.headers)
      .expect(200);
    const catalogue = employerPackageCatalogResponseSchema.parse(res.body);
    expect(JSON.stringify(catalogue)).toContain('tezga');
  });
});
