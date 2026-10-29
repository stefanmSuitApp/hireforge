#!/usr/bin/env node
/**
 * Off-server copies of the Postgres dumps (Hetzner Object Storage, any S3).
 * Runs inside the api image (it has @aws-sdk/client-s3); see
 * scripts/deploy/backup-postgres.sh and scripts/deploy/restore-check.sh.
 *
 *   node scripts/db/backup-offsite.mjs upload <file.sql.gz>
 *   node scripts/db/backup-offsite.mjs latest <dir>   # download the newest dump
 *
 * Env: S3_BACKUP_BUCKET, S3_BACKUP_PREFIX (default `backups/postgres/production/`),
 * S3_ENDPOINT, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 * S3_BACKUP_KEEP_DAYS (default 30). Without S3_BACKUP_BUCKET it does nothing.
 */
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';

const env = (k) => process.env[k]?.trim() || '';
const bucket = env('S3_BACKUP_BUCKET');
const prefix = env('S3_BACKUP_PREFIX') || 'backups/postgres/production/';
const keepDays = Number(env('S3_BACKUP_KEEP_DAYS') || 30);
const [command, arg] = process.argv.slice(2);

if (!bucket) {
  console.log('[backup-offsite] S3_BACKUP_BUCKET not set; skipped');
  process.exit(0);
}
const missing = [
  'S3_ENDPOINT',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
].filter((k) => !env(k));
if (missing.length) {
  console.error(`[backup-offsite] missing ${missing.join(', ')}`);
  process.exit(1);
}

const s3 = new S3Client({
  region: env('S3_REGION') || 'eu-central-1',
  endpoint: env('S3_ENDPOINT'),
  credentials: {
    accessKeyId: env('AWS_ACCESS_KEY_ID'),
    secretAccessKey: env('AWS_SECRET_ACCESS_KEY'),
  },
  forcePathStyle: env('S3_FORCE_PATH_STYLE') === 'true',
  // Newer SDKs add CRC checksums by default, which not every S3-compatible
  // store accepts; only send them where the API requires one.
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
});

async function listDumps() {
  const out = [];
  let token;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      }),
    );
    for (const o of page.Contents ?? []) {
      if (o.Key?.endsWith('.sql.gz')) out.push(o);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return out.sort((a, b) => a.Key.localeCompare(b.Key));
}

async function upload(file) {
  const { size } = await stat(file);
  const key = `${prefix}${basename(file)}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(file),
      ContentLength: size,
      ContentType: 'application/gzip',
    }),
  );
  const head = await s3.send(
    new HeadObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (head.ContentLength !== size) {
    throw new Error(`uploaded ${head.ContentLength} bytes, expected ${size}`);
  }
  console.log(
    `[backup-offsite] uploaded s3://${bucket}/${key} (${size} bytes)`,
  );

  // Retention: keep keepDays of dumps in the bucket, never the newest one.
  const cutoff = Date.now() - keepDays * 86_400_000;
  const dumps = await listDumps();
  const old = dumps
    .slice(0, -1)
    .filter((o) => o.LastModified && o.LastModified.getTime() < cutoff);
  if (old.length) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: old.map((o) => ({ Key: o.Key })) },
      }),
    );
    console.log(
      `[backup-offsite] pruned ${old.length} dump(s) older than ${keepDays} days`,
    );
  }
  console.log(
    `[backup-offsite] ${dumps.length - old.length} dump(s) in the bucket`,
  );
}

async function latest(dir) {
  const dumps = await listDumps();
  const newest = dumps.at(-1);
  if (!newest) throw new Error(`no dumps under s3://${bucket}/${prefix}`);
  await mkdir(dir, { recursive: true });
  const target = join(dir, basename(newest.Key));
  const obj = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: newest.Key }),
  );
  await pipeline(obj.Body, createWriteStream(target));
  console.log(target);
}

try {
  if (command === 'upload' && arg) await upload(arg);
  else if (command === 'latest' && arg) await latest(arg);
  else {
    console.error('usage: backup-offsite.mjs upload <file> | latest <dir>');
    process.exitCode = 2;
  }
} catch (e) {
  console.error(
    `[backup-offsite] ${command} failed: ${e instanceof Error ? e.message : e}`,
  );
  process.exitCode = 1;
}
