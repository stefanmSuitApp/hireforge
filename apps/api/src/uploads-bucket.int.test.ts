// Uploaded files in the bucket: with S3_UPLOADS_BUCKET set, a CV is stored
// under the environment's prefix (production/ and staging/ share one bucket),
// downloads from there, and is removed with it; nothing touches the disk.
import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import {
  CreateBucketCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import type { INestApplication } from '@nestjs/common';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import { insertCandidate } from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { http, signIn, startApp, stopApp } from './__harness__/test-app';

// An S3 API on a random port; pinned by digest like the other test images.
const S3_IMAGE =
  'adobe/s3mock@sha256:ab01a6946750f451ca215a47e91030695b260e4003b8a5a6201d25029b8fca92';
const BUCKET = 'hireforge-uploads';
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);

let app: INestApplication;
let container: StartedTestContainer;
let s3: S3Client;

const keys = async (prefix: string) =>
  (
    (
      await s3.send(
        new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }),
      )
    ).Contents ?? []
  ).map((o) => o.Key as string);

const localFiles = (dir: string): string[] => {
  try {
    return readdirSync(dir, { recursive: true, withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name);
  } catch {
    return [];
  }
};

beforeAll(async () => {
  container = await new GenericContainer(S3_IMAGE)
    .withExposedPorts(9090)
    .start();
  const endpoint = `http://127.0.0.1:${container.getMappedPort(9090)}`;
  Object.assign(process.env, {
    S3_UPLOADS_BUCKET: BUCKET,
    S3_UPLOADS_PREFIX: 'staging/',
    S3_ENDPOINT: endpoint,
    S3_REGION: 'us-east-1',
    S3_FORCE_PATH_STYLE: 'true',
    AWS_ACCESS_KEY_ID: 'test',
    AWS_SECRET_ACCESS_KEY: 'test',
  });
  s3 = new S3Client({
    region: 'us-east-1',
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });
  await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  app = await startApp();
}, 120_000);
afterAll(async () => {
  await stopApp(app);
  await container?.stop();
});

describe('CVs in the uploads bucket', () => {
  it('upload, download and delete go to the bucket under the prefix', async () => {
    const user = await insertCandidate();
    const session = await signIn(app.getHttpServer(), user);

    const up = await http(app)
      .post('/api/candidate/resumes')
      .set(session.headers)
      .attach('file', PDF, {
        filename: 'CV.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const stored = await keys('staging/cv/');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatch(
      /^staging\/cv\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.pdf$/,
    );
    // The disk folder stays empty: the bucket is the only copy.
    expect(localFiles(process.env['CANDIDATE_UPLOAD_DIR'] as string)).toEqual(
      [],
    );

    const down = await http(app)
      .get(`/api/candidate/resumes/${up.body.id}/download`)
      .set(session.headers)
      .buffer(true)
      .parse((res, cb) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(Buffer.compare(down.body as Buffer, PDF)).toBe(0);

    await http(app)
      .delete(`/api/candidate/resumes/${up.body.id}`)
      .set(session.headers)
      .expect(200);
    expect(await keys('staging/cv/')).toEqual([]);
  });

  it('a CV whose object is gone is a clean 404, not a crash', async () => {
    const user = await insertCandidate();
    const session = await signIn(app.getHttpServer(), user);
    const up = await http(app)
      .post('/api/candidate/resumes')
      .set(session.headers)
      .attach('file', PDF, {
        filename: 'CV.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    for (const key of await keys('staging/cv/')) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    }
    const res = await http(app)
      .get(`/api/candidate/resumes/${up.body.id}/download`)
      .set(session.headers);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('RESUME_NOT_FOUND');
  });
});

describe('the one-off copy of existing CVs from disk', () => {
  const script = resolve(
    __dirname,
    '../../../scripts/storage/copy-uploads-to-bucket.mjs',
  );
  const run = (dir: string, logoDir: string) =>
    promisify(execFile)(process.execPath, [script], {
      env: {
        ...process.env,
        S3_UPLOADS_PREFIX: 'copytest/',
        CANDIDATE_UPLOAD_DIR: dir,
        COMPANY_LOGO_DIR: logoDir,
      },
    });

  it('copies every file under the API keys, and skips them the second time', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'hf-copy-'));
    mkdirSync(join(dir, 'cand-1'));
    writeFileSync(join(dir, 'cand-1', 'a.pdf'), PDF);
    writeFileSync(join(dir, 'cand-1', 'b.docx'), 'docx');
    const logoDir = mkdtempSync(join(tmpdir(), 'hf-copy-logo-'));
    mkdirSync(join(logoDir, 'comp-1'));
    writeFileSync(join(logoDir, 'comp-1', 'l.webp'), 'webp');

    const first = await run(dir, logoDir);
    expect(first.stdout).toContain('copied 3, already there 0');
    expect((await keys('copytest/')).sort()).toEqual([
      'copytest/cv/cand-1/a.pdf',
      'copytest/cv/cand-1/b.docx',
      'copytest/logo/comp-1/l.webp',
    ]);

    const again = await run(dir, logoDir);
    expect(again.stdout).toContain('copied 0, already there 3');
  });
});
