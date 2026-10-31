// Runs before every integration test file: its own database, an empty Redis
// database, and the env the API and worker read their connections from.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Redis } from 'ioredis';
import { afterAll, inject } from 'vitest';
import { createTestDatabase, dropTestDatabase } from '../db/test-database';
import { testRedisUrl } from '../redis';

const ctx = inject('integration');
const db = await createTestDatabase(ctx.postgres);

const redis = new Redis(testRedisUrl(), { maxRetriesPerRequest: 1 });
await redis.flushdb();
await redis.quit();

// apps/api and apps/worker read these lazily (getDb / getRedis singletons).
process.env['DATABASE_URL'] = db.url;
process.env['REDIS_URL'] = testRedisUrl();
process.env['NODE_ENV'] = 'test';
process.env['TZ'] = 'Europe/Belgrade';
// Third parties are never called for real: no key, no project, no live NBS.
for (const key of [
  'RESEND_API_KEY',
  'RESEND_API_URL',
  'SANITY_PROJECT_ID',
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
  'SANITY_API_READ_TOKEN',
  'CMS_SYNC_SECRET',
  'AUTH_DEV_HEADERS',
  'S3_BILLING_BUCKET',
  'S3_JOB_MEDIA_BUCKET',
  'S3_UPLOADS_BUCKET',
  'S3_UPLOADS_PREFIX',
  'S3_ENDPOINT',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'BILLING_EMAIL_TEST_TO',
]) {
  delete process.env[key];
}
// Uploads, PDFs and job images go to this file's own temp folder.
const files = mkdtempSync(join(tmpdir(), 'hf-int-'));
process.env['CANDIDATE_UPLOAD_DIR'] = join(files, 'cv');
process.env['BILLING_PDF_LOCAL_DIR'] = join(files, 'billing');
process.env['JOB_DESCRIPTION_MEDIA_LOCAL_DIR'] = join(files, 'job-media');
process.env['COMPANY_LOGO_DIR'] = join(files, 'logos');

afterAll(async () => {
  await dropTestDatabase(ctx.postgres);
  rmSync(files, { recursive: true, force: true });
});
