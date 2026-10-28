import { Redis } from 'ioredis';
import { describe, expect, inject, it } from 'vitest';
import { COMPANY_A, COMPANY_B } from './index';
import {
  insertCompany,
  insertEmployer,
  insertJob,
  insertSubscription,
  testDb,
} from './db';
import { testRedisDb, testRedisUrl } from './redis';

describe('integration harness', () => {
  it('gives this file its own copy of the migrated, seeded template', async () => {
    const { pool, name } = testDb();
    expect(name).toMatch(/^t_\d+_[0-9a-f]{8}$/);
    const migrations = await pool.query(
      'select count(*)::int as n from drizzle.__drizzle_migrations',
    );
    expect(migrations.rows[0].n).toBeGreaterThanOrEqual(30);
    const reference = await pool.query(`
      select (select count(*) from packages)::int as packages,
             (select count(*) from districts)::int as districts,
             (select count(*) from cities)::int as cities,
             (select count(*) from users)::int as users`);
    expect(reference.rows[0]).toMatchObject({ packages: 4, users: 0 });
    expect(reference.rows[0].districts).toBeGreaterThan(20);
    expect(reference.rows[0].cities).toBeGreaterThan(100);
  });

  it('points the app env at this file database and Redis DB', () => {
    expect(process.env['DATABASE_URL']).toBe(testDb().url);
    expect(process.env['REDIS_URL']).toBe(testRedisUrl());
    expect(process.env['RESEND_API_KEY']).toBeUndefined();
    const { postgres } = inject('integration');
    expect(postgres.host).toBe('127.0.0.1');
  });

  it('empties this worker Redis database before the file', async () => {
    const redis = new Redis(testRedisUrl());
    try {
      const info = await redis.client('INFO');
      expect(String(info)).toContain(`db=${testRedisDb()}`);
      expect(await redis.dbsize()).toBe(0);
    } finally {
      await redis.quit();
    }
  });

  it('seeds the look-alike companies with an employer, a subscription and a published job', async () => {
    const a = await insertCompany({ company: COMPANY_A });
    const b = await insertCompany({ company: COMPANY_B });
    expect([a.id, b.id]).toEqual([COMPANY_A.id, COMPANY_B.id]);
    const employer = await insertEmployer(a.id);
    const sub = await insertSubscription(a.id);
    const job = await insertJob(a.id, employer.id, {
      status: 'published',
      subscriptionId: sub.id,
    });
    const { rows } = await testDb().pool.query(
      `select j.status, j.expires_at > now() as live, s.status as sub,
              s.entitlements_json_snapshot->>'max_active_jobs' as max_jobs
         from jobs j join subscriptions s on s.id = j.subscription_id where j.id = $1`,
      [job.id],
    );
    expect(rows[0]).toEqual({
      status: 'published',
      live: true,
      sub: 'active',
      max_jobs: '3',
    });
  });
});
