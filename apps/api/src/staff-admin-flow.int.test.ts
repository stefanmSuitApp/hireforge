// T2.5 staff pipeline and admin at the API: leads, pickup, close-won /
// close-lost, reassign with history, the job composer bootstrap, users,
// taxonomy, promo codes, and an audit row for each staff action.
import type { INestApplication } from '@nestjs/common';
import {
  adminPromoCodesListResponseSchema,
  promoCodeResponseSchema,
} from 'contracts';
import {
  insertCandidate,
  insertCompany,
  insertEmployer,
  insertJob,
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

let app: INestApplication;
let moderator: Actor;
let otherModerator: Actor;
let admin: Actor;
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);
const company = async (id: string) =>
  (
    await q(
      'select sales_status, assigned_moderator_id, closed_won_at, closed_lost_at, legal_name, verified_at from companies where id = $1',
      [id],
    )
  ).rows[0];
const audits = async (entityId: string) =>
  (
    await q(
      'select action, actor_user_id from staff_audit_log where entity_id = $1 order by created_at',
      [entityId],
    )
  ).rows;

beforeAll(async () => {
  app = await startApp();
  const server = app.getHttpServer();
  [moderator, otherModerator, admin] = await Promise.all([
    signInAs(server, 'moderator'),
    signInAs(server, 'moderator'),
    signInAs(server, 'admin'),
  ]);
});
afterAll(() => stopApp(app));

describe('a moderator works the sales pipeline', () => {
  it('creates a lead, which is theirs and audited', async () => {
    const res = await http(app)
      .post('/api/moderator/companies')
      .set(moderator.headers)
      .send({
        slug: 'novi-lid-doo',
        legalName: 'Novi Lid d.o.o.',
        pib: '108000001',
        mb: '22800001',
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const id = res.body.id as string;
    const row = await company(id);
    expect(row.legal_name).toBe('Novi Lid d.o.o.');
    expect((await audits(id)).map((a) => a.action).join()).toMatch(/company/);
  });

  it('a duplicate slug is refused with a coded error', async () => {
    await insertCompany({ company: { slug: 'zauzet-slug' } });
    const res = await http(app)
      .post('/api/moderator/companies')
      .set(moderator.headers)
      .send({ slug: 'zauzet-slug', legalName: 'Neko Drugi d.o.o.' });
    expect(res.status).toBe(409);
  });

  it('picks up an unassigned lead, closes it won, and can no longer edit it', async () => {
    const lead = await insertCompany();
    await http(app)
      .post(`/api/moderator/companies/${lead.id}/pickup`)
      .set(moderator.headers)
      .expect(201);
    expect(await company(lead.id)).toMatchObject({
      sales_status: 'pipeline',
      assigned_moderator_id: moderator.id,
    });
    await http(app)
      .post(`/api/moderator/companies/${lead.id}/close-won`)
      .set(moderator.headers)
      .expect(201);
    const won = await company(lead.id);
    expect(won.sales_status).toBe('closed_won');
    expect(won.closed_won_at).not.toBeNull();
    const edit = await http(app)
      .patch(`/api/moderator/companies/${lead.id}`)
      .set(moderator.headers)
      .send({ legalName: 'X' });
    expect(edit.status).toBe(403);
    expect(edit.body.error.code).toBe('STAFF_COMPANY_PATCH_FORBIDDEN');
    expect((await audits(lead.id)).length).toBeGreaterThanOrEqual(2);
  });

  it("a lead another moderator is working can't be picked up", async () => {
    const lead = await insertCompany({
      salesStatus: 'pipeline',
      assignedModeratorId: otherModerator.id,
    });
    const res = await http(app)
      .post(`/api/moderator/companies/${lead.id}/pickup`)
      .set(moderator.headers);
    expect(res.status).toBe(403);
    expect((await company(lead.id)).assigned_moderator_id).toBe(
      otherModerator.id,
    );
  });

  it('closing lost returns the company to the lead pool with a note', async () => {
    const lead = await insertCompany({
      salesStatus: 'pipeline',
      assignedModeratorId: moderator.id,
    });
    await http(app)
      .post(`/api/moderator/companies/${lead.id}/close-lost`)
      .set(moderator.headers)
      .send({ note: 'Nemaju budžet ove godine.' })
      .expect(201);
    const row = await company(lead.id);
    expect(row.sales_status).toBe('closed_lost');
    expect(row.assigned_moderator_id).toBeNull();
    // The pool is open: another moderator can pick it up again.
    await http(app)
      .post(`/api/moderator/companies/${lead.id}/pickup`)
      .set(otherModerator.headers)
      .expect(201);
  });

  it('marks a company verified through PATCH and records who did it', async () => {
    const lead = await insertCompany({
      salesStatus: 'pipeline',
      assignedModeratorId: moderator.id,
      verified: false,
    });
    await http(app)
      .patch(`/api/moderator/companies/${lead.id}`)
      .set(moderator.headers)
      .send({ verified: true })
      .expect(200);
    const { rows } = await q(
      'select verified_at, verified_by_user_id from companies where id = $1',
      [lead.id],
    );
    expect(rows[0].verified_at).not.toBeNull();
    expect(rows[0].verified_by_user_id).toBe(moderator.id);
  });

  it("'my' view lists the moderator's own companies only; 'all' is for admins", async () => {
    const mine = await insertCompany({
      salesStatus: 'pipeline',
      assignedModeratorId: moderator.id,
    });
    const theirs = await insertCompany({
      salesStatus: 'pipeline',
      assignedModeratorId: otherModerator.id,
    });
    const res = await http(app)
      .get('/api/moderator/companies?view=my')
      .set(moderator.headers)
      .expect(200);
    expect(JSON.stringify(res.body)).toContain(mine.id);
    expect(JSON.stringify(res.body)).not.toContain(theirs.id);
    const all = await http(app)
      .get('/api/moderator/companies?view=all')
      .set(moderator.headers);
    expect(all.status).toBe(403);
    const asAdmin = await http(app)
      .get('/api/moderator/companies?view=all&limit=100')
      .set(admin.headers)
      .expect(200);
    expect(JSON.stringify(asAdmin.body)).toContain(theirs.id);
  });

  it('the job composer bootstrap gives the company and its plans', async () => {
    const lead = await insertCompany({
      salesStatus: 'closed_won',
      assignedModeratorId: moderator.id,
    });
    const res = await http(app)
      .get(`/api/moderator/companies/${lead.id}/job-composer-bootstrap`)
      .set(moderator.headers)
      .expect(200);
    expect(JSON.stringify(res.body)).toContain(lead.id);
  });

  it('GET /moderator/me says who is signed in', async () => {
    const res = await http(app)
      .get('/api/moderator/me')
      .set(moderator.headers)
      .expect(200);
    expect(JSON.stringify(res.body)).toContain(moderator.id);
  });
});

describe('an admin manages the platform', () => {
  it('reassigns a closed-won company to another moderator; history and audit record it', async () => {
    const client = await insertCompany({
      salesStatus: 'closed_won',
      assignedModeratorId: moderator.id,
    });
    await http(app)
      .post(`/api/admin/companies/${client.id}/reassign`)
      .set(admin.headers)
      .send({ toUserId: otherModerator.id, reason: 'Godišnji odmor' })
      .expect(201);
    expect((await company(client.id)).assigned_moderator_id).toBe(
      otherModerator.id,
    );
    const history = await http(app)
      .get(`/api/admin/companies/${client.id}/assignment-history`)
      .set(admin.headers)
      .expect(200);
    expect(JSON.stringify(history.body)).toContain('Godišnji odmor');
    expect(JSON.stringify(history.body)).toContain(moderator.id);
  });

  it('reassigning to a non-moderator is refused', async () => {
    const client = await insertCompany({
      salesStatus: 'closed_won',
      assignedModeratorId: moderator.id,
    });
    const candidate = await insertCandidate();
    const res = await http(app)
      .post(`/api/admin/companies/${client.id}/reassign`)
      .set(admin.headers)
      .send({ toUserId: candidate.id, reason: 'greška' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect((await company(client.id)).assigned_moderator_id).toBe(moderator.id);
  });

  it('lists users by role and changes a role, with an audit row', async () => {
    const candidate = await insertCandidate();
    const list = await http(app)
      .get('/api/admin/users?role=candidate&limit=100')
      .set(admin.headers)
      .expect(200);
    expect(JSON.stringify(list.body)).toContain(candidate.email);
    await http(app)
      .patch(`/api/admin/users/${candidate.id}`)
      .set(admin.headers)
      .send({ role: 'moderator' })
      .expect(200);
    const { rows } = await q('select role from users where id = $1', [
      candidate.id,
    ]);
    expect(rows[0].role).toBe('moderator');
    expect((await audits(candidate.id)).length).toBe(1);
  });

  it('an admin cannot demote themselves', async () => {
    const res = await http(app)
      .patch(`/api/admin/users/${admin.id}`)
      .set(admin.headers)
      .send({ role: 'candidate' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    const { rows } = await q('select role from users where id = $1', [
      admin.id,
    ]);
    expect(rows[0].role).toBe('admin');
  });

  it('creates, renames and deletes a job category; a used category cannot be deleted', async () => {
    const created = await http(app)
      .post('/api/admin/job-categories')
      .set(admin.headers)
      .send({ slug: 'gradjevina', nameSr: 'Građevina', nameEn: 'Construction' })
      .expect(201);
    const id = created.body.id as string;
    await http(app)
      .patch(`/api/admin/job-categories/${id}`)
      .set(admin.headers)
      .send({ nameSr: 'Građevinarstvo' })
      .expect(200);
    const filters = await http(app).get('/api/public/jobs/filters').expect(200);
    expect(JSON.stringify(filters.body)).toContain('Građevinarstvo');
    const owner = await insertCompany();
    const author = await insertEmployer(owner.id);
    await insertJob(owner.id, author.id, { category: 'gradjevina' });
    const used = await http(app)
      .delete(`/api/admin/job-categories/${id}`)
      .set(admin.headers);
    expect(used.status).toBe(409);
    await q(`update jobs set category_id = null where category_id = $1`, [id]);
    await http(app)
      .delete(`/api/admin/job-categories/${id}`)
      .set(admin.headers)
      .expect(200);
  });

  it('a duplicate category slug is refused', async () => {
    const res = await http(app)
      .post('/api/admin/job-categories')
      .set(admin.headers)
      .send({ slug: 'it', nameSr: 'IT opet' });
    expect(res.status).toBe(409);
  });

  it('creates, lists and edits promo codes (contract), and audits them', async () => {
    const created = await http(app)
      .post('/api/admin/promo-codes')
      .set(admin.headers)
      .send({
        code: 'JESEN-2026',
        discountType: 'fixed',
        value: 1000,
        currency: 'eur',
        maxPerCompany: 1,
      })
      .expect(201);
    const promo = promoCodeResponseSchema.parse(created.body);
    expect(promo.currency).toBe('EUR');
    const list = await http(app)
      .get('/api/admin/promo-codes')
      .set(admin.headers)
      .expect(200);
    adminPromoCodesListResponseSchema.parse(list.body);
    expect(JSON.stringify(list.body)).toContain('JESEN-2026');
    await http(app)
      .patch(`/api/admin/promo-codes/${promo.id}`)
      .set(admin.headers)
      .send({ value: 1500 })
      .expect(200);
    const { rows } = await q('select value from promo_codes where id = $1', [
      promo.id,
    ]);
    expect(rows[0].value).toBe(1500);
    expect((await audits(promo.id)).length).toBeGreaterThanOrEqual(2);
  });

  it('a fixed promo without a currency cannot be created', async () => {
    const res = await http(app)
      .post('/api/admin/promo-codes')
      .set(admin.headers)
      .send({ code: 'BEZ-VALUTE', discountType: 'fixed', value: 500 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('the audit log lists staff actions, newest first', async () => {
    const lead = await insertCompany();
    await http(app)
      .post(`/api/moderator/companies/${lead.id}/pickup`)
      .set(moderator.headers)
      .expect(201);
    const res = await http(app)
      .get('/api/admin/audit?limit=5')
      .set(admin.headers)
      .expect(200);
    expect(JSON.stringify(res.body)).toContain(lead.id);
  });

  it('GET /internal/admin/ping answers admins', async () => {
    const res = await http(app)
      .get('/api/internal/admin/ping')
      .set(admin.headers)
      .expect(200);
    expect(res.body).toEqual({ ok: true, scope: 'admin' });
  });
});
